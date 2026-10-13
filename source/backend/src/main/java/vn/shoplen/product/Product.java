package vn.shoplen.product;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Entity
@Table(name = "products")
public class Product implements java.io.Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private String slug;
    private String category;
    private String material;
    @Column(columnDefinition = "text")
    private String description;
    private String imageUrl;
    @Column(name = "size_guide", columnDefinition = "text")
    private String sizeGuide;
    private boolean active = true;
    private BigDecimal price;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("id ASC")
    private List<ProductVariant> variants = new ArrayList<>();
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderColumn(name = "display_order")
    private List<ProductStyle> styles = new ArrayList<>();

    protected Product() {}

    public Product(ProductRequest request) {
        update(request);
    }

    public void update(ProductRequest request) {
        name = request.name().trim();
        slug = request.slug().trim();
        category = request.category().trim();
        material = request.material();
        description = request.description();
        imageUrl = request.imageUrl();
        sizeGuide = request.sizeGuide();
        active = request.active();
        price = request.price();
        Map<String, ProductStyle> stylesByName = new HashMap<>();
        for (var requested : request.effectiveStyles()) {
            String key = requested.name().trim().toLowerCase(Locale.ROOT);
            ProductStyle style = styles.stream()
                    .filter(existing -> existing.getName().trim().equalsIgnoreCase(requested.name().trim()))
                    .findFirst().orElseGet(() -> {
                        ProductStyle created = new ProductStyle(this, requested);
                        styles.add(created);
                        return created;
                    });
            style.update(requested);
            stylesByName.put(key, style);
        }
        Map<String, ProductVariant> variantsBySku = new HashMap<>();
        for (var requestedStyle : request.effectiveStyles()) {
            ProductStyle style = stylesByName.get(requestedStyle.name().trim().toLowerCase(Locale.ROOT));
            for (var requested : requestedStyle.variants()) {
                String sku = requested.sku().trim();
                ProductVariant variant = variants.stream()
                        .filter(existing -> existing.getSku().equalsIgnoreCase(sku))
                        .findFirst().orElseGet(() -> {
                            ProductVariant created = new ProductVariant(this, style, requested);
                            variants.add(created);
                            return created;
                        });
                variant.update(style, requested);
                variantsBySku.put(sku.toUpperCase(Locale.ROOT), variant);
            }
        }
        variants.removeIf(existing -> !variantsBySku.containsKey(existing.getSku().toUpperCase(Locale.ROOT)));
        styles.removeIf(existing -> !stylesByName.containsValue(existing));
    }

    public void changeStock(String sku, int delta) {
        ProductVariant variant = variants.stream().filter(v -> v.getSku().equalsIgnoreCase(sku))
                .findFirst().orElseThrow(() -> new IllegalArgumentException("Không tìm thấy SKU " + sku));
        if (variant.getStock() + delta < 0) throw new IllegalStateException("Tồn kho không đủ cho SKU " + sku);
        variant.changeStock(delta);
    }

    public ProductVariant requireVariant(String sku) {
        return variants.stream().filter(v -> v.getSku().equalsIgnoreCase(sku)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy SKU " + sku));
    }
    public void changeStockThreshold(String sku, int threshold) {
        requireVariant(sku).changeLowStockThreshold(threshold);
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getSlug() { return slug; }
    public String getCategory() { return category; }
    public String getMaterial() { return material; }
    public String getDescription() { return description; }
    public String getImageUrl() { return imageUrl; }
    public String getSizeGuide() { return sizeGuide; }
    public boolean isActive() { return active; }
    public BigDecimal getPrice() { return price; }
    public List<ProductVariant> getVariants() { return variants; }
    public List<ProductStyle> getStyles() { return styles; }
}
