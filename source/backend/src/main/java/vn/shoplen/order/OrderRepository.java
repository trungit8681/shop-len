package vn.shoplen.order;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<ShopOrder, Long> {
    Optional<ShopOrder> findByOrderCodeIgnoreCaseAndCustomerPhone(String code, String phone);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from ShopOrder o where upper(o.orderCode) = upper(:code) and o.customerPhone = :phone")
    Optional<ShopOrder> findByCodeAndPhoneForUpdate(@Param("code") String code, @Param("phone") String phone);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from ShopOrder o where o.id = :id")
    Optional<ShopOrder> findByIdForUpdate(@Param("id") Long id);
    List<ShopOrder> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<ShopOrder> findAllByOrderByCreatedAtDesc();
    List<ShopOrder> findByStatusOrderByCreatedAtDesc(String status);
}
