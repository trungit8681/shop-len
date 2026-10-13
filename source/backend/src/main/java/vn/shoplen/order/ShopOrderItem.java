package vn.shoplen.order;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
public class ShopOrderItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private ShopOrder order;
    private Long productId;
    private String sku;
    private String productName;
    private String styleName;
    private String color;
    private String size;
    private BigDecimal unitPrice;
    private int quantity;
    private BigDecimal lineTotal;
    protected ShopOrderItem() {}
    public ShopOrderItem(Long productId, String sku, String productName, String styleName, String color, String size, BigDecimal unitPrice, int quantity) {
        this.productId = productId; this.sku = sku; this.productName = productName; this.styleName = styleName; this.color = color;
        this.size = size; this.unitPrice = unitPrice; this.quantity = quantity;
        lineTotal = unitPrice.multiply(BigDecimal.valueOf(quantity));
    }
    void setOrder(ShopOrder order) { this.order = order; }
    public Long getId() { return id; }
    public Long getProductId() { return productId; }
    public String getSku() { return sku; }
    public String getProductName() { return productName; }
    public String getStyleName() { return styleName; }
    public String getColor() { return color; }
    public String getSize() { return size; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public int getQuantity() { return quantity; }
    public BigDecimal getLineTotal() { return lineTotal; }
}
