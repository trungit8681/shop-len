package vn.shoplen.order;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "inventory_movements")
public class InventoryMovement {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long productId;
    private String sku;
    private int quantityDelta;
    private String reason;
    private String referenceCode;
    private String actor;
    @Column(columnDefinition = "text")
    private String note;
    private Instant createdAt = Instant.now();
    protected InventoryMovement() {}
    public InventoryMovement(Long productId, String sku, int quantityDelta, String reason, String referenceCode, String actor, String note) {
        this.productId = productId; this.sku = sku; this.quantityDelta = quantityDelta;
        this.reason = reason; this.referenceCode = referenceCode; this.actor = actor; this.note = note;
    }
    public Long getId() { return id; }
    public Long getProductId() { return productId; }
    public String getSku() { return sku; }
    public int getQuantityDelta() { return quantityDelta; }
    public String getReason() { return reason; }
    public String getReferenceCode() { return referenceCode; }
    public String getActor() { return actor; }
    public String getNote() { return note; }
    public Instant getCreatedAt() { return createdAt; }
}
