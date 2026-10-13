package vn.shoplen.order;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Min;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import vn.shoplen.product.Product;
import vn.shoplen.product.ProductRepository;
import java.util.List;

@RestController
@RequestMapping("/api/admin/inventory")
public class InventoryController {
    private final ProductRepository products;
    private final InventoryMovementRepository movements;
    public InventoryController(ProductRepository products, InventoryMovementRepository movements) {
        this.products = products; this.movements = movements;
    }

    @GetMapping("/movements")
    public List<InventoryMovement> movements() { return movements.findTop200ByOrderByCreatedAtDesc(); }

    @GetMapping("/low-stock")
    public List<StockAlert> lowStock() {
        return products.findAll().stream().flatMap(p -> p.getVariants().stream()
                .filter(v -> v.getStock() <= v.getLowStockThreshold())
                .map(v -> new StockAlert(p.getId(), p.getName(), v.getSku(), v.getStyleName(), v.getColor(),
                        v.getSize(), v.getStock(), v.getLowStockThreshold())))
                .toList();
    }

    @PostMapping("/adjust")
    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public InventoryMovement adjust(@Valid @RequestBody AdjustmentRequest request, Authentication authentication) {
        ProductSkuMapping mapping = products.findProductIdsBySkus(List.of(request.sku().trim().toUpperCase())).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy SKU"));
        Product product = products.findByIdForUpdate(mapping.productId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        try {
            product.changeStock(request.sku(), request.delta());
            product.changeStockThreshold(request.sku(), request.lowStockThreshold());
        } catch (IllegalArgumentException | IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }
        return movements.save(new InventoryMovement(product.getId(), request.sku(), request.delta(),
                request.reason(), null, authentication.getName(), request.note()));
    }

    public record AdjustmentRequest(@NotBlank String sku, @NotNull @Min(-10000) Integer delta,
                                    @NotBlank String reason, @NotBlank String note,
                                    @PositiveOrZero int lowStockThreshold) {}
    public record StockAlert(Long productId, String productName, String sku, String styleName, String color, String size,
                             int stock, int lowStockThreshold) {}
}
