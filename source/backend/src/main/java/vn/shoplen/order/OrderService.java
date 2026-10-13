package vn.shoplen.order;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.shoplen.auth.AppUser;
import vn.shoplen.auth.AppUserRepository;
import vn.shoplen.product.Product;
import vn.shoplen.product.ProductRepository;
import vn.shoplen.product.ProductVariant;
import vn.shoplen.shop.ShopSettingsService;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class OrderService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final OrderRepository orders;
    private final ProductRepository products;
    private final OrderHistoryRepository histories;
    private final InventoryMovementRepository movements;
    private final AppUserRepository users;
    private final ShopSettingsService shopSettings;

    public OrderService(OrderRepository orders, ProductRepository products, OrderHistoryRepository histories,
                        InventoryMovementRepository movements, AppUserRepository users, ShopSettingsService shopSettings) {
        this.orders = orders; this.products = products; this.histories = histories;
        this.movements = movements; this.users = users; this.shopSettings = shopSettings;
    }

    @Transactional
    public ShopOrder checkout(CheckoutRequest request, Authentication authentication) {
        Map<String, Integer> quantities = request.items().stream().collect(Collectors.toMap(
                item -> item.sku().trim().toUpperCase(Locale.ROOT), CheckoutRequest.ItemRequest::quantity, Integer::sum));
        Map<String, Long> productIds = products.findProductIdsBySkus(quantities.keySet()).stream()
                .collect(Collectors.toMap(item -> item.sku().toUpperCase(Locale.ROOT), ProductSkuMapping::productId));
        if (productIds.size() != quantities.size()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Một số SKU không còn được bán");

        List<Long> ids = productIds.values().stream().distinct().sorted().toList();
        Map<Long, Product> locked = new LinkedHashMap<>();
        for (Long id : ids) locked.put(id, products.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Sản phẩm vừa thay đổi")));

        BigDecimal subtotal = BigDecimal.ZERO;
        List<ShopOrderItem> orderItems = new ArrayList<>();
        for (var entry : quantities.entrySet()) {
            Product product = locked.get(productIds.get(entry.getKey()));
            if (!product.isActive()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Sản phẩm không còn kinh doanh");
            ProductVariant variant = product.requireVariant(entry.getKey());
            if (variant.getStock() < entry.getValue()) throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "SKU " + variant.getSku() + " không đủ tồn kho; hiện còn " + variant.getStock());
            BigDecimal unitPrice = variant.getStylePrice();
            subtotal = subtotal.add(unitPrice.multiply(BigDecimal.valueOf(entry.getValue())));
            orderItems.add(new ShopOrderItem(product.getId(), variant.getSku(), product.getName(),
                    variant.getStyleName(), variant.getColor(), variant.getSize(), unitPrice, entry.getValue()));
        }

        Long userId = customerUserId(authentication);
        String code = "SL" + Long.toString(System.currentTimeMillis(), 36).toUpperCase(Locale.ROOT)
                + String.format("%08X", RANDOM.nextInt());
        BigDecimal shippingFee = shopSettings.current().getShippingFee();
        ShopOrder order = new ShopOrder(code, userId, request, subtotal, shippingFee);
        orderItems.forEach(order::addItem);
        orders.save(order);
        histories.save(new OrderStatusHistory(order.getId(), null, ShopOrder.PENDING, "SYSTEM", "Khách đặt hàng COD"));

        for (var entry : quantities.entrySet()) {
            Product product = locked.get(productIds.get(entry.getKey()));
            product.changeStock(entry.getKey(), -entry.getValue());
            movements.save(new InventoryMovement(product.getId(), entry.getKey(), -entry.getValue(),
                    "ORDER_RESERVED", code, userId == null ? "GUEST" : authentication.getName(), "Giữ tồn khi tạo đơn COD"));
        }
        return order;
    }

    public ShopOrder lookup(String code, String phone) {
        return orders.findByOrderCodeIgnoreCaseAndCustomerPhone(code.trim(), normalizePhone(phone))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng"));
    }

    @Transactional
    public ShopOrder cancelByCustomer(String code, String phone, String note) {
        ShopOrder order = orders.findByCodeAndPhoneForUpdate(code.trim(), normalizePhone(phone))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng"));
        if (ShopOrder.PENDING.equals(order.getStatus()) || ShopOrder.CONFIRMED.equals(order.getStatus())) {
            transition(order, ShopOrder.CANCELLED, "CUSTOMER", note, true);
        } else if (ShopOrder.PREPARING.equals(order.getStatus())) {
            transition(order, ShopOrder.CANCEL_REQUESTED, "CUSTOMER", note, false);
        } else {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Đơn đã bàn giao vận chuyển hoặc đã kết thúc nên không thể yêu cầu hủy");
        }
        return order;
    }

    @Transactional
    public ShopOrder changeStatus(Long id, String next, String note, String actor, String carrier, String trackingCode) {
        ShopOrder order = orders.findByIdForUpdate(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        boolean valid = switch (order.getStatus()) {
            case ShopOrder.PENDING -> List.of(ShopOrder.CONFIRMED, ShopOrder.CANCELLED).contains(next);
            case ShopOrder.CONFIRMED -> List.of(ShopOrder.PREPARING, ShopOrder.CANCELLED).contains(next);
            case ShopOrder.PREPARING -> List.of(ShopOrder.SHIPPED, ShopOrder.CANCELLED).contains(next);
            case ShopOrder.CANCEL_REQUESTED -> List.of(ShopOrder.PREPARING, ShopOrder.CANCELLED).contains(next);
            case ShopOrder.SHIPPED -> ShopOrder.DELIVERED.equals(next);
            case ShopOrder.DELIVERED -> ShopOrder.COMPLETED.equals(next);
            default -> false;
        };
        if (!valid) throw new ResponseStatusException(HttpStatus.CONFLICT, "Không thể chuyển trạng thái từ " + order.getStatus() + " sang " + next);
        if (ShopOrder.SHIPPED.equals(next)) {
            if (carrier == null || carrier.isBlank() || trackingCode == null || trackingCode.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cần nhập đơn vị vận chuyển và mã vận đơn trước khi bàn giao");
            }
            order.setShippingTracking(carrier.trim(), trackingCode.trim());
        }
        boolean restoreStock = ShopOrder.CANCELLED.equals(next);
        transition(order, next, actor, note, restoreStock);
        return order;
    }

    private void transition(ShopOrder order, String next, String actor, String note, boolean restoreStock) {
        String previous = order.getStatus();
        if (restoreStock) restoreInventory(order, actor);
        order.changeStatus(next);
        histories.save(new OrderStatusHistory(order.getId(), previous, next, actor, note));
    }

    private void restoreInventory(ShopOrder order, String actor) {
        for (ShopOrderItem item : order.getItems().stream().sorted(Comparator.comparing(ShopOrderItem::getProductId)).toList()) {
            Product product = products.findByIdForUpdate(item.getProductId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Không thể hoàn kho do sản phẩm không tồn tại"));
            product.changeStock(item.getSku(), item.getQuantity());
            movements.save(new InventoryMovement(product.getId(), item.getSku(), item.getQuantity(),
                    "ORDER_CANCELLED", order.getOrderCode(), actor, "Hoàn tồn khi hủy đơn"));
        }
    }

    private Long customerUserId(Authentication authentication) {
        if (authentication == null) return null;
        return users.findByUsernameIgnoreCaseOrEmailIgnoreCase(authentication.getName(), authentication.getName())
                .filter(user -> "CUSTOMER".equals(user.getRole())).map(AppUser::getId).orElse(null);
    }

    private static String normalizePhone(String phone) { return phone.replaceAll("[^0-9+]", ""); }

    public BigDecimal getShippingFee() { return shopSettings.current().getShippingFee(); }
}
