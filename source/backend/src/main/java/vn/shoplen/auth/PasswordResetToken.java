package vn.shoplen.auth;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long userId;
    private String tokenHash;
    private Instant expiresAt;
    private Instant usedAt;
    private Instant createdAt = Instant.now();

    protected PasswordResetToken() {}
    public PasswordResetToken(Long userId, String tokenHash, Instant expiresAt) {
        this.userId = userId;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
    }
    public boolean isUsable(Instant now) { return usedAt == null && expiresAt.isAfter(now); }
    public void markUsed(Instant now) { usedAt = now; }
    public Long getUserId() { return userId; }
    public String getTokenHash() { return tokenHash; }
}
