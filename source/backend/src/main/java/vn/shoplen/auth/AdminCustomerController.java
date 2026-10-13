package vn.shoplen.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/api/admin/customers")
public class AdminCustomerController {
    private final AppUserRepository users;
    private final PasswordResetService passwordResetService;
    private final PasswordEncoder passwordEncoder;

    public AdminCustomerController(AppUserRepository users, PasswordResetService passwordResetService,
                                   PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordResetService = passwordResetService;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public List<AuthController.UserResponse> customers() {
        return users.findAll().stream().filter(user -> "CUSTOMER".equals(user.getRole()))
                .map(AuthController.UserResponse::from).toList();
    }

    @PutMapping("/{id}")
    @Transactional
    public AuthController.UserResponse updateCustomer(@PathVariable Long id, @Valid @RequestBody CustomerProfileRequest request) {
        AppUser customer = requireCustomer(id);
        customer.updateProfile(request.fullName().trim(), request.phone().trim());
        return AuthController.UserResponse.from(customer);
    }

    @PostMapping("/{id}/password-reset")
    public AuthController.MessageResponse sendPasswordReset(@PathVariable Long id) {
        AppUser customer = requireCustomer(id);
        passwordResetService.sendResetEmail(customer);
        return new AuthController.MessageResponse("Đã gửi liên kết đặt lại mật khẩu tới " + customer.getEmail() + ".");
    }

    @PutMapping("/{id}/password")
    @Transactional
    public AuthController.MessageResponse changePassword(@PathVariable Long id,
                                                          @Valid @RequestBody CustomerPasswordRequest request) {
        AppUser customer = requireCustomer(id);
        customer.changePassword(passwordEncoder.encode(request.password()));
        passwordResetService.invalidateResetLinks(customer);
        return new AuthController.MessageResponse("Đã cập nhật mật khẩu khách hàng.");
    }

    private AppUser requireCustomer(Long id) {
        return users.findById(id)
                .filter(user -> "CUSTOMER".equals(user.getRole()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy khách hàng."));
    }

    public record CustomerProfileRequest(@NotBlank @Size(max = 120) String fullName,
                                         @NotBlank @Size(max = 40) String phone) {}
    public record CustomerPasswordRequest(@NotBlank @Size(min = 10, max = 100) String password) {}
}
