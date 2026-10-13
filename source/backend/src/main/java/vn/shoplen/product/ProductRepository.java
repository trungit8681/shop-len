package vn.shoplen.product;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByActiveTrueOrderByIdDesc();
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select distinct p from Product p left join fetch p.variants where p.id = :id")
    java.util.Optional<Product> findByIdForUpdate(@Param("id") Long id);
    @Query("select new vn.shoplen.order.ProductSkuMapping(v.sku, p.id) from Product p join p.variants v where upper(v.sku) in :skus and p.active = true")
    List<vn.shoplen.order.ProductSkuMapping> findProductIdsBySkus(@Param("skus") java.util.Collection<String> skus);
}
