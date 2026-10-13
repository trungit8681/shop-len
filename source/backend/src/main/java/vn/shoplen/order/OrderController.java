package vn.shoplen.order;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import vn.shoplen.auth.AppUser;
import vn.shoplen.auth.AppUserRepository;
import vn.shoplen.auth.CustomerAddress;
import vn.shoplen.auth.AddressRepository;
import vn.shoplen.product.Product;
import vn.shoplen.product.ProductRepository;
import vn.shoplen.product.ProductVariant;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@RestController
public class OrderController {
    private final OrderService service;
    private final OrderRepository orders;
    private final OrderHistoryRepository histories;
    private final AppUserRepository users;
    private final ProductRepository products;

    public OrderController(OrderService service, OrderRepository orders, OrderHistoryRepository histories,
                           AppUserRepository users, ProductRepository products) {
        this.service = service; this.orders = orders; this.histories = histories; this.users = users;
        this.products = products;
    }

    @PostMapping("/api/orders")
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse checkout(@Valid @RequestBody CheckoutRequest request, Authentication authentication) {
        ShopOrder order = service.checkout(request, authentication);
        return response(order);
    }

    @GetMapping("/api/orders/shipping-fee")
    public BigDecimal shippingFee() { return service.getShippingFee(); }

    @GetMapping("/api/orders/lookup")
    public OrderResponse lookup(@RequestParam String code, @RequestParam String phone) {
        return response(service.lookup(code, phone));
    }

    @PostMapping("/api/orders/cancel")
    public OrderResponse cancel(@Valid @RequestBody GuestCancelRequest request) {
        return response(service.cancelByCustomer(request.orderCode(), request.phone(), request.note()));
    }

    @GetMapping("/api/customer/orders")
    public List<OrderResponse> myOrders(Authentication authentication) {
        AppUser user = currentUser(authentication);
        return orders.findByUserIdOrderByCreatedAtDesc(user.getId()).stream().map(this::response).toList();
    }

    @PostMapping("/api/customer/orders/{id}/cancel")
    public OrderResponse cancelOwn(@PathVariable Long id, @RequestBody CancelRequest request, Authentication authentication) {
        AppUser user = currentUser(authentication);
        ShopOrder order = orders.findById(id).filter(candidate -> user.getId().equals(candidate.getUserId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return response(service.cancelByCustomer(order.getOrderCode(), order.getCustomerPhone(), request.note()));
    }

    @GetMapping("/api/admin/orders")
    public List<OrderResponse> adminOrders(@RequestParam(required = false) String status) {
        List<ShopOrder> found = status == null || status.isBlank()
                ? orders.findAllByOrderByCreatedAtDesc() : orders.findByStatusOrderByCreatedAtDesc(status);
        return found.stream().map(this::response).toList();
    }

    @PutMapping("/api/admin/orders/{id}/status")
    public OrderResponse changeStatus(@PathVariable Long id, @Valid @RequestBody StatusRequest request, Authentication authentication) {
        return response(service.changeStatus(id, request.status(), request.note(), authentication.getName(), request.carrier(), request.trackingCode()));
    }

    @GetMapping("/api/admin/reports/summary")
    public ReportSummary reportSummary() {
        List<ShopOrder> all = orders.findAll();
        BigDecimal revenue = all.stream().filter(o -> List.of(ShopOrder.DELIVERED, ShopOrder.COMPLETED).contains(o.getStatus()))
                .map(ShopOrder::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        long lowStock = products.findAll().stream().flatMap(p -> p.getVariants().stream())
                .filter(v -> v.getStock() <= v.getLowStockThreshold()).count();
        return new ReportSummary(all.size(), all.stream().filter(o -> !ShopOrder.CANCELLED.equals(o.getStatus())).count(),
                all.stream().filter(o -> ShopOrder.PENDING.equals(o.getStatus())).count(), revenue, lowStock);
    }

    private OrderResponse response(ShopOrder order) {
        List<OrderStatusHistory> history = histories.findByOrderIdOrderByCreatedAtAsc(order.getId());
        return OrderResponse.from(order, history);
    }

    private AppUser currentUser(Authentication authentication) {
        return users.findByUsernameIgnoreCaseOrEmailIgnoreCase(authentication.getName(), authentication.getName())
                .orElseThrow(() -> new IllegalStateException("Authenticated user no longer exists"));
    }

    public record GuestCancelRequest(@NotBlank String orderCode, @NotBlank String phone, String note) {}
    public record CancelRequest(String note) {}
    public record StatusRequest(@NotBlank String status, String note, String carrier, String trackingCode) {}
    public record ReportSummary(long totalOrders, long activeOrders, long pendingOrders, BigDecimal revenue, long lowStockVariants) {}
    public record ItemResponse(Long id, String sku, String productName, String styleName, String color, String size,
                               BigDecimal unitPrice, int quantity, BigDecimal lineTotal) {}
    public record HistoryResponse(String fromStatus, String toStatus, String actor, String note, Instant createdAt) {}
    public record OrderResponse(Long id, String orderCode, Long userId, String customerName, String customerEmail,
                                String customerPhone, String province, String district, String ward, String addressLine,
                                String note, String status, String paymentMethod, String carrier, String trackingCode, BigDecimal subtotal, BigDecimal shippingFee,
                                BigDecimal total, Instant createdAt, List<ItemResponse> items, List<HistoryResponse> history) {
        static OrderResponse from(ShopOrder order, List<OrderStatusHistory> history) {
            return new OrderResponse(order.getId(), order.getOrderCode(), order.getUserId(), order.getCustomerName(),
                    order.getCustomerEmail(), order.getCustomerPhone(), order.getProvince(), order.getDistrict(),
                    order.getWard(),                     order.getAddressLine(), order.getNote(), order.getStatus(), order.getPaymentMethod(), order.getCarrier(), order.getTrackingCode(),
                    order.getSubtotal(), order.getShippingFee(), order.getTotal(), order.getCreatedAt(),
                    order.getItems().stream().map(i -> new ItemResponse(i.getId(), i.getSku(), i.getProductName(),
                            i.getStyleName(), i.getColor(), i.getSize(), i.getUnitPrice(), i.getQuantity(), i.getLineTotal())).toList(),
                    history.stream().map(h -> new HistoryResponse(h.getFromStatus(), h.getToStatus(), h.getActor(),
                            h.getNote(), h.getCreatedAt())).toList());
        }
    }
}
