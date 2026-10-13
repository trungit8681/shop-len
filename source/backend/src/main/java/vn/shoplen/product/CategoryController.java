package vn.shoplen.product;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/api")
public class CategoryController {
    private final CategoryRepository categories;
    public CategoryController(CategoryRepository categories) { this.categories = categories; }
    @GetMapping("/categories")
    public List<Category> publicCategories() { return categories.findByActiveTrueOrderByDisplayOrderAscNameAsc(); }
    @GetMapping("/admin/categories")
    public List<Category> adminCategories() { return categories.findAll(); }
    @PostMapping("/admin/categories")
    @CacheEvict(value = "products", allEntries = true)
    public Category create(@Valid @RequestBody CategoryRequest request) {
        if (categories.existsByNameIgnoreCase(request.name().trim()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Danh mục đã tồn tại");
        return categories.save(new Category(request.name(), request.description(), request.displayOrder()));
    }
    @PutMapping("/admin/categories/{id}")
    @CacheEvict(value = "products", allEntries = true)
    public Category update(@PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        Category category = categories.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (categories.findAll().stream().anyMatch(existing -> !existing.getId().equals(id)
                && existing.getName().equalsIgnoreCase(request.name().trim()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Danh mục đã tồn tại");
        }
        category.update(request.name(), request.description(), request.active(), request.displayOrder());
        return categories.save(category);
    }
    public record CategoryRequest(@NotBlank String name, String description, boolean active, int displayOrder) {}
}
