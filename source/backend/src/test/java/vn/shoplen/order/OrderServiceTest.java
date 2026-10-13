package vn.shoplen.order;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;
import vn.shoplen.auth.AppUserRepository;
import vn.shoplen.product.Product;
import vn.shoplen.product.ProductRepository;
import vn.shoplen.product.ProductRequest;
import vn.shoplen.shop.ShopSettings;
import vn.shoplen.shop.ShopSettingsService;
import java.math.BigDecimal;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    @Mock OrderRepository orders;
    @Mock ProductRepository products;
    @Mock OrderHistoryRepository histories;
    @Mock InventoryMovementRepository movements;
    @Mock AppUserRepository users;
    @Mock ShopSettingsService shopSettings;

    @Test
    void rejectsCheckoutWhenSkuStockIsInsufficient() {
        Product product = product(1);
        stubProduct(product);
        OrderService service = service();

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.checkout(checkout(2), null));

        assertEquals(409, error.getStatusCode().value());
        verify(orders, never()).save(any());
    }

    @Test
    void combinesDuplicateSkuLinesAndReservesAvailableStock() {
        Product product = product(5);
        stubProduct(product);
        when(orders.save(any(ShopOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));
        OrderService service = service();

        ShopOrder order = service.checkout(new CheckoutRequest("Test", "test@example.test", "0901234567",
                "HCMC", "District 1", "Ward 1", "1 Main St", "",
                List.of(new CheckoutRequest.ItemRequest("KNIT-M", 1), new CheckoutRequest.ItemRequest("knit-m", 2))), null);

        assertEquals(new BigDecimal("300000"), order.getSubtotal());
        assertEquals(new BigDecimal("20000"), order.getShippingFee());
        assertEquals(new BigDecimal("320000"), order.getTotal());
        assertEquals(1, order.getItems().size());
        assertEquals(3, order.getItems().getFirst().getQuantity());
        assertEquals(2, product.getVariants().getFirst().getStock());
        verify(movements).save(argThat(m -> m.getQuantityDelta() == -3 && "ORDER_RESERVED".equals(m.getReason())));
        verify(histories).save(argThat(h -> ShopOrder.PENDING.equals(h.getToStatus())));
    }

    @Test
    void chargesTheSelectedStylesPriceInsteadOfTheLegacyProductPrice() {
        Product product = new Product(new ProductRequest("Knit", "knit", "Len", "Wool", "", "", "", true,
                new BigDecimal("100000"), null, List.of(new ProductRequest.StyleRequest("Cashmere", "/cashmere.jpg",
                List.of(new ProductRequest.VariantRequest("KNIT-M", "Olive", "M", 5)),
                new BigDecimal("525000"), "Cashmere"))));
        stubProduct(product);
        when(orders.save(any(ShopOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ShopOrder order = service().checkout(checkout(2), null);

        assertEquals(new BigDecimal("1050000"), order.getSubtotal());
        assertEquals(new BigDecimal("525000"), order.getItems().getFirst().getUnitPrice());
    }

    private OrderService service() {
        ShopSettings settings = mock(ShopSettings.class);
        lenient().when(settings.getShippingFee()).thenReturn(new BigDecimal("20000"));
        lenient().when(shopSettings.current()).thenReturn(settings);
        return new OrderService(orders, products, histories, movements, users, shopSettings);
    }

    private void stubProduct(Product product) {
        when(products.findProductIdsBySkus(anyCollection())).thenReturn(List.of(new ProductSkuMapping("KNIT-M", 7L)));
        when(products.findByIdForUpdate(7L)).thenReturn(java.util.Optional.of(product));
    }

    private Product product(int stock) {
        return new Product(new ProductRequest("Knit", "knit", "Len", "Wool", "", "", "", true,
                new BigDecimal("100000"), List.of(new ProductRequest.VariantRequest("KNIT-M", "Olive", "M", stock))));
    }

    private CheckoutRequest checkout(int quantity) {
        return new CheckoutRequest("Test", "", "0901234567", "HCMC", "District 1", "Ward 1", "1 Main St", "",
                List.of(new CheckoutRequest.ItemRequest("KNIT-M", quantity)));
    }
}
