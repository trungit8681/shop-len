package vn.shoplen.auth;

import org.junit.jupiter.api.Test;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.Instant;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PasswordResetServiceTest {
    @Test
    void sendsSingleUseCustomerResetLinkToCustomerEmail() {
        PasswordResetTokenRepository tokens = mock(PasswordResetTokenRepository.class);
        JavaMailSender mailSender = mock(JavaMailSender.class);
        AppUser customer = mock(AppUser.class);
        when(customer.getId()).thenReturn(42L);
        when(customer.getEmail()).thenReturn("customer@example.com");
        when(customer.getRole()).thenReturn("CUSTOMER");

        PasswordResetService service = new PasswordResetService(tokens, mailSender, "hello@shoplen.local",
                "http://localhost:3000", "http://localhost:3001");
        service.sendResetEmail(customer);

        verify(tokens).deleteByUserIdAndUsedAtIsNull(42L);
        var tokenCaptor = org.mockito.ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(tokens).save(tokenCaptor.capture());
        PasswordResetToken savedToken = tokenCaptor.getValue();
        assertTrue(savedToken.isUsable(Instant.now().plusSeconds(29 * 60)));
        assertFalse(savedToken.isUsable(Instant.now().plusSeconds(31 * 60)));

        var messageCaptor = org.mockito.ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        SimpleMailMessage message = messageCaptor.getValue();
        assertArrayEquals(new String[]{"customer@example.com"}, message.getTo());
        assertTrue(message.getText().contains("http://localhost:3000/reset-password?token="));
        Matcher tokenMatcher = Pattern.compile("token=([A-Za-z0-9_-]+)").matcher(message.getText());
        assertTrue(tokenMatcher.find());
        assertEquals(PasswordResetService.sha256(tokenMatcher.group(1)), savedToken.getTokenHash());
    }
}
