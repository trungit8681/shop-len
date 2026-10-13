package vn.shoplen.auth;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AppUserRepository users;
    private final StringRedisTemplate redis;
    private final PasswordResetTokenRepository resetTokens;
    private final PasswordResetService passwordResetService;
    private final PasswordEncoder encoder;
    private final javax.crypto.SecretKey signingKey;

    public AuthController(AppUserRepository users, PasswordResetTokenRepository resetTokens,
                          PasswordResetService passwordResetService,
                          StringRedisTemplate redis,
                          PasswordEncoder encoder,
                          @Value("${app.jwt.secret}") String secret) {
        this.users = users;
        this.redis = redis;
        this.resetTokens = resetTokens;
        this.passwordResetService = passwordResetService;
        this.encoder = encoder;
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    @PostMapping("/register")
    @Transactional
    public UserResponse register(@Valid @RequestBody RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã được sử dụng");
        AppUser user = users.save(new AppUser(email, email, encoder.encode(request.password()), "CUSTOMER",
                request.fullName().trim(), request.phone().trim()));
        return UserResponse.from(user);
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest request) {
        return createToken(request, null);
    }

    @PostMapping("/login/customer")
    public TokenResponse customerLogin(@Valid @RequestBody LoginRequest request) {
        return createToken(request, "CUSTOMER");
    }

    @PostMapping("/login/admin")
    public TokenResponse adminLogin(@Valid @RequestBody LoginRequest request) {
        return createToken(request, "ADMIN");
    }

    private TokenResponse createToken(LoginRequest request, String requiredRole) {
        AppUser user = users.findByUsernameIgnoreCaseOrEmailIgnoreCase(request.username().trim(), request.username().trim())
                .filter(AppUser::isEnabled)
                .filter(candidate -> requiredRole == null || requiredRole.equals(candidate.getRole()))
                .filter(candidate -> encoder.matches(request.password(), candidate.getPasswordHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Thông tin đăng nhập không đúng hoặc tài khoản không có quyền truy cập khu vực này."));
        Instant expiresAt = Instant.now().plus(Duration.ofHours(2));
        String token = Jwts.builder().subject(user.getUsername()).claim("role", user.getRole())
                .claim("ver", user.getTokenVersion()).id(java.util.UUID.randomUUID().toString())
                .issuedAt(java.util.Date.from(Instant.now())).expiration(java.util.Date.from(expiresAt))
                .signWith(signingKey).compact();
        return new TokenResponse(token, expiresAt.toString(), UserResponse.from(user));
    }

    @PostMapping("/logout")
    public MessageResponse logout(@org.springframework.web.bind.annotation.RequestHeader("Authorization") String header) {
        try {
            String compact = header.startsWith("Bearer ") ? header.substring(7) : "";
            var claims = Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(compact).getPayload();
            Instant expiresAt = claims.getExpiration().toInstant();
            Duration remaining = Duration.between(Instant.now(), expiresAt);
            if (remaining.isNegative() || remaining.isZero() || claims.getId() == null) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không hợp lệ");
            }
            redis.opsForValue().set("jwt:revoked:" + claims.getId(), "1", remaining);
            return new MessageResponse("Đã đăng xuất.");
        } catch (io.jsonwebtoken.JwtException | IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không hợp lệ");
        }
    }

    @PostMapping("/forgot-password")
    @Transactional
    public MessageResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        users.findByEmailIgnoreCase(request.email().trim()).ifPresent(passwordResetService::sendResetEmail);
        return new MessageResponse("Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi trong ít phút.");
    }

    @PostMapping("/reset-password")
    @Transactional
    public MessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        var record = resetTokens.findByTokenHash(PasswordResetService.sha256(request.token()))
                .filter(token -> token.isUsable(Instant.now()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Liên kết không hợp lệ hoặc đã hết hạn"));
        AppUser user = users.findById(record.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Liên kết không hợp lệ"));
        user.changePassword(encoder.encode(request.password()));
        record.markUsed(Instant.now());
        return new MessageResponse("Mật khẩu đã được thay đổi. Hãy đăng nhập lại.");
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}
    public record RegisterRequest(@NotBlank @Email String email, @NotBlank @Size(min = 10, max = 100) String password,
                                  @NotBlank String fullName, @NotBlank String phone) {}
    public record ForgotPasswordRequest(@NotBlank @Email String email) {}
    public record ResetPasswordRequest(@NotBlank String token, @NotBlank @Size(min = 10, max = 100) String password) {}
    public record TokenResponse(String accessToken, String expiresAt, UserResponse user) {}
    public record MessageResponse(String message) {}
    public record UserResponse(Long id, String username, String email, String role, String fullName, String phone) {
        static UserResponse from(AppUser user) {
            return new UserResponse(user.getId(), user.getUsername(), user.getEmail(), user.getRole(), user.getFullName(), user.getPhone());
        }
    }
}
