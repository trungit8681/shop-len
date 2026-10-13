package vn.shoplen.auth;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "app_users")
public class AppUser {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String username;
    private String email;
    private String passwordHash;
    private String role;
    private String fullName;
    private String phone;
    private boolean enabled = true;
    private int tokenVersion;
    private Instant createdAt = Instant.now();

    protected AppUser() {}

    public AppUser(String username, String email, String passwordHash, String role, String fullName, String phone) {
        this.username = username;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.fullName = fullName;
        this.phone = phone;
    }

    public void changePassword(String passwordHash) { this.passwordHash = passwordHash; tokenVersion++; }
    public void updateProfile(String fullName, String phone) { this.fullName = fullName; this.phone = phone; }
    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getRole() { return role; }
    public String getFullName() { return fullName; }
    public String getPhone() { return phone; }
    public boolean isEnabled() { return enabled; }
    public int getTokenVersion() { return tokenVersion; }
}
