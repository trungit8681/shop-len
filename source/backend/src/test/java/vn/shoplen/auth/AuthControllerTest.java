package vn.shoplen.auth;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class AuthControllerTest {
    @Test
    void adminLoginRejectsCustomerAccountsWithClearUnauthorizedResponse() {
        AppUserRepository users = mock(AppUserRepository.class);
        PasswordResetTokenRepository tokens = mock(PasswordResetTokenRepository.class);
        PasswordResetService resets = mock(PasswordResetService.class);
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        AppUser customer = mock(AppUser.class);
        when(users.findByUsernameIgnoreCaseOrEmailIgnoreCase("person@example.com", "person@example.com"))
                .thenReturn(Optional.of(customer));
        when(customer.isEnabled()).thenReturn(true);
        when(customer.getRole()).thenReturn("CUSTOMER");
        when(customer.getPasswordHash()).thenReturn("hash");
        when(encoder.matches("valid-password", "hash")).thenReturn(true);

        AuthController controller = new AuthController(users, tokens, resets, redis, encoder,
                "a-secret-key-that-is-at-least-32-bytes-long");
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> controller.adminLogin(new AuthController.LoginRequest("person@example.com", "valid-password")));

        assertEquals(401, error.getStatusCode().value());
        assertEquals("Thông tin đăng nhập không đúng hoặc tài khoản không có quyền truy cập khu vực này.",
                error.getReason());
        verify(encoder, never()).matches(anyString(), anyString());
    }
}
