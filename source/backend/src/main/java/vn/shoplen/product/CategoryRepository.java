package vn.shoplen.product;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByActiveTrueOrderByDisplayOrderAscNameAsc();
    boolean existsByNameIgnoreCase(String name);
}
