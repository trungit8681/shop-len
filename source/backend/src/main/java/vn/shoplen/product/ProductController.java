package vn.shoplen.product;

import jakarta.validation.Valid;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.Authentication;
import vn.shoplen.order.InventoryMovement;
import vn.shoplen.order.InventoryMovementRepository;

import java.math.BigDecimal;
import java.util.List;

@RestController
@EnableCaching
@RequestMapping("/api")
public class ProductController {
    private final ProductRepository repository;
    private final InventoryMovementRepository movements;
    public ProductController(ProductRepository repository, InventoryMovementRepository movements) {
        this.repository = repository; this.movements = movements;
    }

    @GetMapping("/products")
    @Cacheable("products")
    public List<Product> publicProducts(@RequestParam(required = false) String q,
                                        @RequestParam(required = false) String category,
                                        @RequestParam(required = false) String color,
                                        @RequestParam(required = false) String size,
                                        @RequestParam(required = false) BigDecimal minPrice,
                                        @RequestParam(required = false) BigDecimal maxPrice,
                                        @RequestParam(defaultValue = "false") boolean inStock,
                                        @RequestParam(defaultValue = "newest") String sort) {
        var stream = repository.findByActiveTrueOrderByIdDesc().stream();
        if (q != null && !q.isBlank()) {
            String query = q.trim().toLowerCase(java.util.Locale.ROOT);
            stream = stream.filter(p -> p.getName().toLowerCase(java.util.Locale.ROOT).contains(query)
                    || p.getDescription() != null && p.getDescription().toLowerCase(java.util.Locale.ROOT).contains(query)
                    || p.getVariants().stream().anyMatch(v -> v.getSku().toLowerCase(java.util.Locale.ROOT).contains(query)));
        }
        if (category != null && !category.isBlank()) stream = stream.filter(p -> p.getCategory().equalsIgnoreCase(category.trim()));
        if (minPrice != null || maxPrice != null) stream = stream.filter(p -> p.getStyles().stream().anyMatch(style ->
                (minPrice == null || style.getPrice().compareTo(minPrice) >= 0)
                        && (maxPrice == null || style.getPrice().compareTo(maxPrice) <= 0)));
        if (color != null && !color.isBlank()) stream = stream.filter(p -> p.getVariants().stream().anyMatch(v -> v.getColor().equalsIgnoreCase(color.trim())));
        if (size != null && !size.isBlank()) stream = stream.filter(p -> p.getVariants().stream().anyMatch(v -> v.getSize().equalsIgnoreCase(size.trim())));
        if (inStock) stream = stream.filter(p -> p.getVariants().stream().anyMatch(v -> v.getStock() > 0));
        if ("price-asc".equals(sort)) stream = stream.sorted(java.util.Comparator.comparing(p ->
                p.getStyles().stream().map(ProductStyle::getPrice).min(BigDecimal::compareTo).orElse(p.getPrice())));
        else if ("price-desc".equals(sort)) stream = stream.sorted(java.util.Comparator.comparing((Product p) ->
                p.getStyles().stream().map(ProductStyle::getPrice).min(BigDecimal::compareTo).orElse(p.getPrice())).reversed());
        return stream.toList();
    }

    @GetMapping("/products/{id}")
    public Product publicProduct(@PathVariable Long id) {
        return repository.findById(id).filter(Product::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @GetMapping("/admin/products")
    public List<Product> adminProducts() { return repository.findAll(); }

    @PostMapping("/admin/products")
    @CacheEvict(value = "products", allEntries = true)
    @Transactional
    public Product create(@Valid @RequestBody ProductRequest request) {
        validateUniqueSkus(request);
        Product product = repository.save(new Product(request));
        request.allVariants().forEach(v -> {
            if (v.stock() > 0) movements.save(new InventoryMovement(product.getId(), v.sku(), v.stock(),
                    "INITIAL_STOCK", null, "ADMIN", "Tồn đầu kỳ khi tạo sản phẩm"));
        });
        return product;
    }

    @PutMapping("/admin/products/{id}")
    @CacheEvict(value = "products", allEntries = true)
    @Transactional
    public Product update(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        validateUniqueSkus(request);
        Product product = repository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        java.util.Map<String, Integer> previous = product.getVariants().stream()
                .collect(java.util.stream.Collectors.toMap(v -> v.getSku().toUpperCase(java.util.Locale.ROOT), ProductVariant::getStock));
        product.update(request);
        Product saved = repository.save(product);
        request.allVariants().forEach(v -> {
            int delta = v.stock() - previous.getOrDefault(v.sku().trim().toUpperCase(java.util.Locale.ROOT), 0);
            if (delta != 0) movements.save(new InventoryMovement(saved.getId(), v.sku(), delta,
                    "ADMIN_EDIT", null, "ADMIN", "Điều chỉnh tồn khi cập nhật sản phẩm"));
        });
        return saved;
    }

    @DeleteMapping("/admin/products/{id}")
    @CacheEvict(value = "products", allEntries = true)
    @Transactional
    public void hide(@PathVariable Long id) {
        Product product = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        product.update(new ProductRequest(product.getName(), product.getSlug(), product.getCategory(),
                product.getMaterial(), product.getDescription(), product.getImageUrl(), product.getSizeGuide(), false,
                product.getPrice(), null, product.getStyles().stream()
                .map(style -> new ProductRequest.StyleRequest(style.getName(), style.getImageUrl(), product.getVariants().stream()
                        .filter(variant -> variant.getStyleId().equals(style.getId()))
                        .map(variant -> new ProductRequest.VariantRequest(variant.getSku(), variant.getColor(),
                                variant.getSize(), variant.getStock(), variant.getLowStockThreshold()))
                        .toList(), style.getPrice(), style.getMaterial(), style.getImageUrls()))
                .toList()));
        repository.save(product);
    }

    private void validateUniqueSkus(ProductRequest request) {
        var variants = request.allVariants();
        long count = variants.stream().map(v -> v.sku().trim().toUpperCase(java.util.Locale.ROOT)).distinct().count();
        if (count != variants.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã SKU phải khác nhau cho từng biến thể.");
        }
        long styleCount = request.effectiveStyles().stream()
                .map(style -> style.name().trim().toLowerCase(java.util.Locale.ROOT))
                .distinct().count();
        if (styleCount != request.effectiveStyles().size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên kiểu sản phẩm không được trùng nhau.");
        }
        if (request.effectiveStyles().stream().anyMatch(style -> style.price() == null
                || style.price().signum() <= 0 || style.material() == null || style.material().isBlank()
                || style.effectiveImages().isEmpty())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mỗi kiểu cần có ảnh, giá bán và chất liệu.");
        }
    }
}
