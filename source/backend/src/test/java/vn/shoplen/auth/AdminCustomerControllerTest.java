package vn.shoplen.auth;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class AdminCustomerControllerTest {
    @Test
    void changingCustomerPasswordEncodesPasswordAndInvalidatesResetLinks() {
        AppUserRepository users = mock(AppUserRepository.class);
        PasswordResetService passwordResetService = mock(PasswordResetService.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        AppUser customer = mock(AppUser.class);
        when(users.findById(42L)).thenReturn(Optional.of(customer));
        when(customer.getRole()).thenReturn("CUSTOMER");
        when(passwordEncoder.encode("new-password-123")).thenReturn("encoded-password");

        AdminCustomerController controller = new AdminCustomerController(users, passwordResetService, passwordEncoder);
        var response = controller.changePassword(42L,
                new AdminCustomerController.CustomerPasswordRequest("new-password-123"));

        verify(customer).changePassword("encoded-password");
        verify(passwordResetService).invalidateResetLinks(customer);
        assertEquals("Đã cập nhật mật khẩu khách hàng.", response.message());
    }
}
