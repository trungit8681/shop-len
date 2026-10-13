package vn.shoplen.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface AddressRepository extends JpaRepository<CustomerAddress, Long> {
    List<CustomerAddress> findByUserIdOrderByIsDefaultDescIdDesc(Long userId);
    @Modifying @Query("update CustomerAddress a set a.isDefault = false where a.userId = :userId")
    void clearDefault(Long userId);
    void deleteByIdAndUserId(Long id, Long userId);
}
