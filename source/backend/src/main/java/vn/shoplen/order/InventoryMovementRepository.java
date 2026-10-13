package vn.shoplen.order;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface InventoryMovementRepository extends JpaRepository<InventoryMovement, Long> {
    List<InventoryMovement> findTop200ByOrderByCreatedAtDesc();
    List<InventoryMovement> findTop100BySkuOrderByCreatedAtDesc(String sku);
}
