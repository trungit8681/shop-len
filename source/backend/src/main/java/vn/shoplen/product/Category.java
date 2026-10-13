package vn.shoplen.product;

import jakarta.persistence.*;

@Entity
@Table(name = "categories")
public class Category {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private String name;
    private String description;
    private boolean active = true;
    private int displayOrder;
    protected Category() {}
    public Category(String name, String description, int displayOrder) {
        this.name = name.trim(); this.description = description; this.displayOrder = displayOrder;
    }
    public void update(String name, String description, boolean active, int displayOrder) {
        this.name = name.trim(); this.description = description; this.active = active; this.displayOrder = displayOrder;
    }
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public boolean isActive() { return active; }
    public int getDisplayOrder() { return displayOrder; }
}
