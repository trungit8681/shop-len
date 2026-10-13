package vn.shoplen.product;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.List;

public record ProductRequest(
        @NotBlank String name,
        @NotBlank String slug,
        @NotBlank String category,
        String material,
        String description,
        String imageUrl,
        String sizeGuide,
        boolean active,
        @NotNull @Positive BigDecimal price,
        List<@Valid VariantRequest> variants,
        List<@Valid StyleRequest> styles) {
    public ProductRequest(String name, String slug, String category, String material, String description,
                          String imageUrl, String sizeGuide, boolean active, BigDecimal price,
                          List<VariantRequest> variants) {
        this(name, slug, category, material, description, imageUrl, sizeGuide, active, price, variants,
                List.of(new StyleRequest("Mặc định", imageUrl == null ? "" : imageUrl, variants)));
    }

    public record StyleRequest(
            @NotBlank @jakarta.validation.constraints.Size(max = 120) String name,
            @jakarta.validation.constraints.Size(max = 2048) String imageUrl,
            @NotEmpty List<@Valid VariantRequest> variants,
            BigDecimal price,
            String material,
            List<@NotBlank @jakarta.validation.constraints.Size(max = 2048) String> imageUrls) {
        public StyleRequest(String name, String imageUrl, List<VariantRequest> variants) {
            this(name, imageUrl, variants, null, null, null);
        }
        public StyleRequest(String name, String imageUrl, List<VariantRequest> variants, BigDecimal price, String material) {
            this(name, imageUrl, variants, price, material, null);
        }
        public List<String> effectiveImages() {
            if (imageUrls != null && !imageUrls.isEmpty()) {
                return imageUrls.stream().map(String::trim).filter(url -> !url.isEmpty()).distinct().toList();
            }
            return imageUrl == null || imageUrl.isBlank() ? List.of() : List.of(imageUrl.trim());
        }
    }

    public record VariantRequest(
            @NotBlank String sku,
            String color,
            @NotBlank String size,
            @PositiveOrZero int stock,
            @PositiveOrZero int lowStockThreshold) {
        public VariantRequest(String sku, String color, String size, int stock) {
            this(sku, color, size, stock, 5);
        }
    }

    public List<VariantRequest> allVariants() {
        return effectiveStyles().stream().flatMap(style -> style.variants().stream()).toList();
    }

    public List<StyleRequest> effectiveStyles() {
        if (styles != null && !styles.isEmpty()) {
            return styles.stream().map(style -> new StyleRequest(style.name(),
                    style.effectiveImages().isEmpty() ? style.imageUrl() : style.effectiveImages().getFirst(),
                    style.variants(),
                    style.price() == null ? price : style.price(),
                    style.material() == null ? material : style.material(), style.effectiveImages())).toList();
        }
        if (variants == null || variants.isEmpty()) return List.of();
        return List.of(new StyleRequest("Mặc định", imageUrl == null ? "" : imageUrl, variants, price, material));
    }

    @AssertTrue(message = "Cần có ít nhất một kiểu sản phẩm với biến thể.")
    public boolean isStyleConfigurationValid() {
        return styles != null && !styles.isEmpty() || variants != null && !variants.isEmpty();
    }
}
