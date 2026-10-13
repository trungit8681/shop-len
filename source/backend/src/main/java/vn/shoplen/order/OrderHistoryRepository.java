package vn.shoplen.order;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface OrderHistoryRepository extends JpaRepository<OrderStatusHistory, Long> {
    List<OrderStatusHistory> findByOrderIdOrderByCreatedAtAsc(Long orderId);
}
