package vn.shoplen.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

@Service
public class PasswordResetService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final PasswordResetTokenRepository resetTokens;
    private final JavaMailSender mailSender;
    private final String mailFrom;
    private final String customerUrl;
    private final String adminUrl;

    public PasswordResetService(PasswordResetTokenRepository resetTokens, JavaMailSender mailSender,
                                @Value("${app.mail.from}") String mailFrom,
                                @Value("${app.frontend.customer-url}") String customerUrl,
                                @Value("${app.frontend.admin-url}") String adminUrl) {
        this.resetTokens = resetTokens;
        this.mailSender = mailSender;
        this.mailFrom = mailFrom;
        this.customerUrl = customerUrl;
        this.adminUrl = adminUrl;
    }

    @Transactional
    public void sendResetEmail(AppUser user) {
        invalidateResetLinks(user);
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        resetTokens.save(new PasswordResetToken(user.getId(), sha256(token), Instant.now().plus(Duration.ofMinutes(30))));

        String baseUrl = "ADMIN".equals(user.getRole()) ? adminUrl : customerUrl;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(user.getEmail());
        message.setSubject("Đặt lại mật khẩu Shop Len");
        message.setText("Để đặt lại mật khẩu, mở liên kết sau trong 30 phút:\n\n"
                + baseUrl + "/reset-password?token=" + token + "\n\n"
                + "Nếu bạn không yêu cầu, hãy bỏ qua email này.");
        mailSender.send(message);
    }

    @Transactional
    public void invalidateResetLinks(AppUser user) {
        resetTokens.deleteByUserIdAndUsedAtIsNull(user.getId());
    }

    static String sha256(String value) {
        try {
            return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }
}
