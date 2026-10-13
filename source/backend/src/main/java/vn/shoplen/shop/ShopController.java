package vn.shoplen.shop;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
public class ShopController {
    private final ShopSettingsService settings;

    public ShopController(ShopSettingsService settings) { this.settings = settings; }

    @GetMapping("/api/shop")
    public ShopResponse current() { return ShopResponse.from(settings.current()); }

    @PutMapping("/api/admin/shop")
    public ShopResponse update(@RequestBody ShopUpdate request) {
        return ShopResponse.from(settings.update(request.shopName(), request.shippingFee()));
    }

    public record ShopUpdate(String shopName, BigDecimal shippingFee) {}

    public record ShopResponse(String shopName, BigDecimal shippingFee) {
        static ShopResponse from(ShopSettings row) { return new ShopResponse(row.getShopName(), row.getShippingFee()); }
    }
}
