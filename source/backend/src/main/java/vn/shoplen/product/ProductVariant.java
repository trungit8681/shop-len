package vn.shoplen.product;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "product_variants")
public class ProductVariant implements java.io.Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "style_id", nullable = false)
    private ProductStyle style;
    @Column(nullable = false, unique = true)
    private String sku;
    private String color;
    private String size;
    private int stock;
    private int lowStockThreshold = 5;

    protected ProductVariant() {}

    ProductVariant(Product product, ProductStyle style, ProductRequest.VariantRequest request) {
        this.product = product;
        update(style, request);
    }

    void update(ProductStyle style, ProductRequest.VariantRequest request) {
        this.style = style;
        sku = request.sku().trim().toUpperCase(java.util.Locale.ROOT);
        color = request.color() == null ? "" : request.color().trim();
        size = request.size().trim();
        stock = request.stock();
        lowStockThreshold = request.lowStockThreshold();
    }

    void changeStock(int delta) { stock += delta; }
    void changeLowStockThreshold(int threshold) { lowStockThreshold = threshold; }
    public Long getId() { return id; }
    public String getSku() { return sku; }
    public String getColor() { return color; }
    public String getSize() { return size; }
    public int getStock() { return stock; }
    public int getLowStockThreshold() { return lowStockThreshold; }
    public Long getStyleId() { return style.getId(); }
    public String getStyleName() { return style.getName(); }
    public String getStyleImageUrl() { return style.getImageUrl(); }
    public java.math.BigDecimal getStylePrice() { return style.getPrice(); }
    public String getStyleMaterial() { return style.getMaterial(); }
}
