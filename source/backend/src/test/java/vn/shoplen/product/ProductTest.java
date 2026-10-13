package vn.shoplen.product;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class ProductTest {
    @Test
    void createsNormalizedVariantsAndReplacesCatalogDetails() {
        Product product = new Product(request("Merino", 8));

        assertEquals("KNIT-OLIVE-M", product.getVariants().getFirst().getSku());
        assertEquals(8, product.getVariants().getFirst().getStock());

        product.update(new ProductRequest("Merino 2", "merino-2", "Len", "Wool", "Updated",
                "", "M: 50-55kg", false, new BigDecimal("300000"), List.of(
                new ProductRequest.VariantRequest("Knit-Olive-M", "Olive", "M", 6))));

        assertEquals("Merino 2", product.getName());
        assertFalse(product.isActive());
        assertEquals(1, product.getVariants().size());
        assertEquals(6, product.getVariants().getFirst().getStock());
    }

    @Test
    void supportsMultipleImageBearingStylesWithIndependentVariantStock() {
        Product product = new Product(new ProductRequest("Bag", "bag", "Túi", "Len", "", "/bag.jpg", "", true,
                new BigDecimal("300000"), null, List.of(
                new ProductRequest.StyleRequest("Ếch", "/frog.jpg", List.of(
                        new ProductRequest.VariantRequest("BAG-FROG-S", "Xanh", "S", 4)),
                        new BigDecimal("300000"), "Len", List.of("/frog.jpg", "/frog-side.jpg")),
                new ProductRequest.StyleRequest("Bò sữa", "/cow.jpg", List.of(
                        new ProductRequest.VariantRequest("BAG-COW-M", "Trắng", "M", 2))))));

        assertEquals(2, product.getStyles().size());
        assertEquals("/frog.jpg", product.getStyles().get(0).getImageUrl());
        assertEquals(List.of("/frog.jpg", "/frog-side.jpg"), product.getStyles().get(0).getImageUrls());
        assertEquals(new BigDecimal("300000"), product.getStyles().get(0).getPrice());
        assertEquals("Len", product.getStyles().get(0).getMaterial());
        assertEquals("Bò sữa", product.requireVariant("BAG-COW-M").getStyleName());
        assertEquals("/cow.jpg", product.requireVariant("BAG-COW-M").getStyleImageUrl());
        assertEquals(2, product.requireVariant("BAG-COW-M").getStock());
        assertEquals(4, product.requireVariant("BAG-FROG-S").getStock());
    }

    @Test
    void storesDistinctPriceAndMaterialForEachStyle() {
        Product product = new Product(new ProductRequest("Bag", "bag", "Túi", "Len", "", "/bag.jpg", "", true,
                new BigDecimal("300000"), null, List.of(
                new ProductRequest.StyleRequest("Len", "/wool.jpg", List.of(
                        new ProductRequest.VariantRequest("BAG-WOOL-S", "Xanh", "S", 4)),
                        new BigDecimal("450000"), "Merino"),
                new ProductRequest.StyleRequest("Cotton", "/cotton.jpg", List.of(
                        new ProductRequest.VariantRequest("BAG-COTTON-M", "Trắng", "M", 2)),
                        new BigDecimal("275000"), "Cotton hữu cơ"))));

        assertEquals(new BigDecimal("450000"), product.requireVariant("BAG-WOOL-S").getStylePrice());
        assertEquals("Merino", product.requireVariant("BAG-WOOL-S").getStyleMaterial());
        assertEquals(new BigDecimal("275000"), product.requireVariant("BAG-COTTON-M").getStylePrice());
        assertEquals("Cotton hữu cơ", product.requireVariant("BAG-COTTON-M").getStyleMaterial());
    }

    @Test
    void allowsVariantWithoutColor() {
        Product product = new Product(new ProductRequest("Knit", "knit", "Len", "Wool", "", "/knit.jpg", "", true,
                new BigDecimal("300000"), List.of(
                new ProductRequest.VariantRequest("KNIT-M", "", "M", 3))));

        assertEquals("", product.requireVariant("KNIT-M").getColor());
        assertEquals("M", product.requireVariant("KNIT-M").getSize());
    }

    private ProductRequest request(String name, int stock) {
        return new ProductRequest(name, "merino", "Len", "Wool", "", "", "", true,
                new BigDecimal("300000"), List.of(new ProductRequest.VariantRequest(" knit-olive-m ", "Olive", "M", stock)));
    }
}
