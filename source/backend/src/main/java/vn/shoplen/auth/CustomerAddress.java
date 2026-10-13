package vn.shoplen.auth;

import jakarta.persistence.*;

@Entity
@Table(name = "customer_addresses")
public class CustomerAddress {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "user_id", nullable = false)
    private Long userId;
    private String recipientName;
    private String phone;
    private String province;
    private String district;
    private String ward;
    @Column(name = "address_line")
    private String addressLine;
    @Column(name = "is_default")
    private boolean isDefault;
    protected CustomerAddress() {}
    public CustomerAddress(Long userId, CustomerController.AddressRequest request) {
        this.userId = userId; recipientName = request.recipientName(); phone = request.phone();
        province = request.province(); district = request.district() == null ? "" : request.district(); ward = request.ward();
        addressLine = request.addressLine(); isDefault = request.isDefault();
    }
    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getRecipientName() { return recipientName; }
    public String getPhone() { return phone; }
    public String getProvince() { return province; }
    public String getDistrict() { return district; }
    public String getWard() { return ward; }
    public String getAddressLine() { return addressLine; }
    public boolean isDefault() { return isDefault; }
    public void clearDefault() { isDefault = false; }
    public void update(CustomerController.AddressRequest request) {
        recipientName = request.recipientName(); phone = request.phone(); province = request.province();
        district = request.district() == null ? "" : request.district(); ward = request.ward(); addressLine = request.addressLine();
        isDefault = request.isDefault();
    }
}
