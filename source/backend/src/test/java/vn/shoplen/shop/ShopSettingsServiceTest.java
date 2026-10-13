package vn.shoplen.shop;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShopSettingsServiceTest {
    @Mock ShopSettingsRepository repository;

    @Test
    void storesAWholeVndShippingFeeAndTrimsTheShopName() {
        when(repository.findById(ShopSettings.SINGLETON_ID))
                .thenReturn(Optional.of(new ShopSettings("Cũ", BigDecimal.ZERO)));
        when(repository.save(any(ShopSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ShopSettings saved = new ShopSettingsService(repository).update("  Cuti Mango  ", new BigDecimal("35000.00"));

        assertEquals("Cuti Mango", saved.getShopName());
        assertEquals(new BigDecimal("35000"), saved.getShippingFee());
    }

    @Test
    void rejectsAFractionalShippingFee() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> new ShopSettingsService(repository).update("Cuti Mango", new BigDecimal("1.5")));

        assertEquals(400, error.getStatusCode().value());
    }
}
