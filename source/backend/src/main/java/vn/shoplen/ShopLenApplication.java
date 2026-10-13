package vn.shoplen;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.shoplen.auth.AppUser;
import vn.shoplen.auth.AppUserRepository;

@SpringBootApplication
public class ShopLenApplication {
    public static void main(String[] args) {
        SpringApplication.run(ShopLenApplication.class, args);
    }

    @Bean
    CommandLineRunner seedAdmin(AppUserRepository users, PasswordEncoder encoder,
                                @Value("${app.admin.username}") String username,
                                @Value("${app.admin.email}") String email,
                                @Value("${app.admin.password}") String password) {
        return args -> {
            if (!users.existsByUsernameIgnoreCase(username) && !users.existsByEmailIgnoreCase(email)) {
                users.save(new AppUser(username, email, encoder.encode(password), "ADMIN", "Quản trị viên", ""));
            }
        };
    }
}
