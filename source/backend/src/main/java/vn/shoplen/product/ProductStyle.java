package vn.shoplen.product;

import jakarta.persistence.Column;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "product_styles")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ProductStyle implements java.io.Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;
    @Column(nullable = false)
    private String name;
    @Column(name = "image_url", nullable = false, length = 2048)
    private String imageUrl;
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "product_style_images", joinColumns = @JoinColumn(name = "style_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "image_url", nullable = false, length = 2048)
    private List<String> imageUrls = new ArrayList<>();
    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal price;
    @Column(nullable = false)
    private String material;
    protected ProductStyle() {}

    ProductStyle(Product product, ProductRequest.StyleRequest request) {
        this.product = product;
        update(request);
    }

    void update(ProductRequest.StyleRequest request) {
        name = request.name().trim();
        imageUrls.clear();
        imageUrls.addAll(request.effectiveImages());
        imageUrl = imageUrls.isEmpty() ? request.imageUrl() == null ? "" : request.imageUrl().trim() : imageUrls.getFirst();
        price = request.price();
        material = request.material().trim();
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getImageUrl() { return imageUrl; }
    public List<String> getImageUrls() { return imageUrls; }
    public BigDecimal getPrice() { return price; }
    public String getMaterial() { return material; }
}
