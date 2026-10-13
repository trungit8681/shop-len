package vn.shoplen.order;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
public class ShopOrder {
    public static final String PENDING = "PENDING_CONFIRMATION";
    public static final String CONFIRMED = "CONFIRMED";
    public static final String PREPARING = "PREPARING";
    public static final String SHIPPED = "SHIPPED";
    public static final String DELIVERED = "DELIVERED";
    public static final String COMPLETED = "COMPLETED";
    public static final String CANCEL_REQUESTED = "CANCEL_REQUESTED";
    public static final String CANCELLED = "CANCELLED";

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String orderCode;
    private Long userId;
    private String customerName;
    private String customerEmail;
    private String customerPhone;
    private String province;
    private String district;
    private String ward;
    private String addressLine;
    @Column(columnDefinition = "text")
    private String note;
    private String status;
    private String paymentMethod = "COD";
    private String carrier;
    private String trackingCode;
    private BigDecimal subtotal;
    private BigDecimal shippingFee;
    private BigDecimal total;
    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();
    @Version
    private long version;
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("id ASC")
    private List<ShopOrderItem> items = new ArrayList<>();

    protected ShopOrder() {}
    public ShopOrder(String orderCode, Long userId, CheckoutRequest request, BigDecimal subtotal, BigDecimal shippingFee) {
        this.orderCode = orderCode; this.userId = userId;
        customerName = request.customerName().trim(); customerEmail = request.customerEmail();
        customerPhone = request.customerPhone().replaceAll("[^0-9+]", ""); province = request.province().trim();
        district = request.district() == null ? "" : request.district().trim(); ward = request.ward().trim();
        addressLine = request.addressLine().trim(); note = request.note();
        status = PENDING; this.subtotal = subtotal; this.shippingFee = shippingFee;
        total = subtotal.add(shippingFee);
    }
    public void addItem(ShopOrderItem item) { items.add(item); item.setOrder(this); }
    public void changeStatus(String next) { status = next; updatedAt = Instant.now(); }
    public void setShippingTracking(String carrier, String trackingCode) {
        this.carrier = carrier;
        this.trackingCode = trackingCode;
    }
    public Long getId() { return id; }
    public String getOrderCode() { return orderCode; }
    public Long getUserId() { return userId; }
    public String getCustomerName() { return customerName; }
    public String getCustomerEmail() { return customerEmail; }
    public String getCustomerPhone() { return customerPhone; }
    public String getProvince() { return province; }
    public String getDistrict() { return district; }
    public String getWard() { return ward; }
    public String getAddressLine() { return addressLine; }
    public String getNote() { return note; }
    public String getStatus() { return status; }
    public String getPaymentMethod() { return paymentMethod; }
    public String getCarrier() { return carrier; }
    public String getTrackingCode() { return trackingCode; }
    public BigDecimal getSubtotal() { return subtotal; }
    public BigDecimal getShippingFee() { return shippingFee; }
    public BigDecimal getTotal() { return total; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public List<ShopOrderItem> getItems() { return items; }
}
