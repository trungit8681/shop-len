package vn.shoplen.order;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "order_status_history")
public class OrderStatusHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long orderId;
    private String fromStatus;
    private String toStatus;
    private String actor;
    @Column(columnDefinition = "text")
    private String note;
    private Instant createdAt = Instant.now();
    protected OrderStatusHistory() {}
    public OrderStatusHistory(Long orderId, String fromStatus, String toStatus, String actor, String note) {
        this.orderId = orderId; this.fromStatus = fromStatus; this.toStatus = toStatus; this.actor = actor; this.note = note;
    }
    public Long getId() { return id; }
    public String getFromStatus() { return fromStatus; }
    public String getToStatus() { return toStatus; }
    public String getActor() { return actor; }
    public String getNote() { return note; }
    public Instant getCreatedAt() { return createdAt; }
}
