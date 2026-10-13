package vn.shoplen.shop;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class ShopSettingsService {
    private static final BigDecimal MAX_FEE = new BigDecimal("10000000");
    private final ShopSettingsRepository settings;

    public ShopSettingsService(ShopSettingsRepository settings) { this.settings = settings; }

    @Transactional(readOnly = true)
    public ShopSettings current() {
        return settings.findById(ShopSettings.SINGLETON_ID)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Chưa có cấu hình cửa hàng."));
    }

    @Transactional
    public ShopSettings update(String shopName, BigDecimal shippingFee) {
        String name = shopName == null ? "" : shopName.trim();
        if (name.isEmpty() || name.length() > 80) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên cửa hàng từ 1 đến 80 ký tự.");
        }
        BigDecimal fee = wholeVnd(shippingFee);
        if (fee.signum() < 0 || fee.compareTo(MAX_FEE) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phí giao hàng là số tiền VND từ 0 đến 10.000.000.");
        }
        ShopSettings row = current();
        row.update(name, fee);
        return settings.save(row);
    }

    private static BigDecimal wholeVnd(BigDecimal shippingFee) {
        if (shippingFee == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phí giao hàng là số tiền VND từ 0 đến 10.000.000.");
        }
        try {
            return shippingFee.setScale(0, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phí giao hàng là số tiền VND từ 0 đến 10.000.000.");
        }
    }
}
