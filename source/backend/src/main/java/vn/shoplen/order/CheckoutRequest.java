package vn.shoplen.order;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record CheckoutRequest(
        @NotBlank String customerName,
        @Pattern(regexp = "^$|^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$") String customerEmail,
        @NotBlank @Pattern(regexp = "^[+0-9 ()-]{8,20}$") String customerPhone,
        @NotBlank String province,
        String district,
        @NotBlank String ward,
        @NotBlank String addressLine,
        @Size(max = 1000) String note,
        @NotEmpty List<@Valid ItemRequest> items) {
    public record ItemRequest(@NotBlank String sku, @Min(1) @Max(50) int quantity) {}
}
