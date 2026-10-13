package vn.shoplen.shop;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "shop_settings")
public class ShopSettings {
    public static final short SINGLETON_ID = 1;
    @Id
    private Short id;
    @Column(nullable = false, length = 80)
    private String shopName;
    @Column(nullable = false, precision = 14, scale = 0)
    private BigDecimal shippingFee;

    protected ShopSettings() {}

    public ShopSettings(String shopName, BigDecimal shippingFee) {
        this.id = SINGLETON_ID;
        this.shopName = shopName;
        this.shippingFee = shippingFee;
    }

    public void update(String shopName, BigDecimal shippingFee) {
        this.shopName = shopName;
        this.shippingFee = shippingFee;
    }

    public String getShopName() { return shopName; }
    public BigDecimal getShippingFee() { return shippingFee; }
}
