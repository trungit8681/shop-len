package vn.shoplen.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/customer")
public class CustomerController {
    private final AppUserRepository users;
    private final AddressRepository addresses;
    public CustomerController(AppUserRepository users, AddressRepository addresses) {
        this.users = users;
        this.addresses = addresses;
    }

    @GetMapping("/me")
    public AuthController.UserResponse me(Authentication auth) {
        return AuthController.UserResponse.from(requireUser(auth));
    }

    @PutMapping("/me")
    @Transactional
    public AuthController.UserResponse updateProfile(Authentication auth, @Valid @RequestBody ProfileRequest request) {
        AppUser user = requireUser(auth);
        user.updateProfile(request.fullName().trim(), request.phone().trim());
        return AuthController.UserResponse.from(user);
    }

    @GetMapping("/addresses")
    public List<CustomerAddress> listAddresses(Authentication auth) {
        return addresses.findByUserIdOrderByIsDefaultDescIdDesc(requireUser(auth).getId());
    }

    @PostMapping("/addresses")
    @Transactional
    public CustomerAddress addAddress(Authentication auth, @Valid @RequestBody AddressRequest request) {
        Long userId = requireUser(auth).getId();
        if (request.isDefault()) addresses.clearDefault(userId);
        return addresses.save(new CustomerAddress(userId, request));
    }

    @PutMapping("/addresses/{id}")
    @Transactional
    public CustomerAddress updateAddress(Authentication auth, @PathVariable Long id, @Valid @RequestBody AddressRequest request) {
        Long userId = requireUser(auth).getId();
        CustomerAddress address = addresses.findById(id).filter(item -> item.getUserId().equals(userId))
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND));
        if (request.isDefault()) addresses.clearDefault(userId);
        address.update(request);
        return addresses.save(address);
    }

    @DeleteMapping("/addresses/{id}")
    @Transactional
    public void deleteAddress(Authentication auth, @PathVariable Long id) {
        addresses.deleteByIdAndUserId(id, requireUser(auth).getId());
    }

    private AppUser requireUser(Authentication auth) {
        return users.findByUsernameIgnoreCaseOrEmailIgnoreCase(auth.getName(), auth.getName())
                .orElseThrow(() -> new IllegalStateException("Authenticated customer no longer exists"));
    }

    public record ProfileRequest(@NotBlank String fullName, @NotBlank String phone) {}
    public record AddressRequest(@NotBlank String recipientName, @NotBlank String phone,
                                 @NotBlank String province, String district, @NotBlank String ward,
                                 @NotBlank String addressLine, boolean isDefault) {}
}
