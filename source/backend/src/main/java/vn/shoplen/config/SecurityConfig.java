package vn.shoplen.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.data.redis.core.StringRedisTemplate;
import vn.shoplen.auth.AppUserRepository;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, JwtFilter jwtFilter) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers("/api/auth/**", "/api/products/**", "/api/orders/**", "/api/categories", "/actuator/health").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/shop").permitAll()
                        .requestMatchers(request -> "GET".equals(request.getMethod())
                                && request.getRequestURI().startsWith(request.getContextPath() + "/api/media/")).permitAll()
                        .requestMatchers("/api/customer/**").hasRole("CUSTOMER")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecretKey jwtSigningKey(@Value("${app.jwt.secret}") String secret) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("APP_JWT_SECRET must be at least 32 bytes");
        }
        return Keys.hmacShaKeyFor(bytes);
    }

    static class JwtFilter extends OncePerRequestFilter {
        private final SecretKey key;
    private final AppUserRepository users;
    private final StringRedisTemplate redis;

    JwtFilter(SecretKey key, AppUserRepository users, StringRedisTemplate redis) {
        this.key = key;
        this.users = users;
        this.redis = redis;
        }

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
                throws ServletException, IOException {
            String header = request.getHeader(HttpHeaders.AUTHORIZATION);
            if (header != null && header.startsWith("Bearer ")) {
                try {
                    Claims claims = Jwts.parser().verifyWith(key).build()
                            .parseSignedClaims(header.substring(7)).getPayload();
                    String username = claims.getSubject();
                    String role = claims.get("role", String.class);
                    String tokenId = claims.getId();
                    Integer version = claims.get("ver", Integer.class);
                    var user = username == null ? java.util.Optional.<vn.shoplen.auth.AppUser>empty()
                            : users.findByUsernameIgnoreCaseOrEmailIgnoreCase(username, username);
                    if (username == null || role == null || tokenId == null || version == null
                            || !List.of("ADMIN", "CUSTOMER").contains(role)
                            || redis.hasKey("jwt:revoked:" + tokenId)
                            || user.isEmpty() || !user.get().isEnabled()
                            || !role.equals(user.get().getRole()) || version != user.get().getTokenVersion()) {
                        org.springframework.security.core.context.SecurityContextHolder.clearContext();
                        chain.doFilter(request, response);
                        return;
                    }
                    var authentication = new UsernamePasswordAuthenticationToken(
                            username, null, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
                    org.springframework.security.core.context.SecurityContextHolder.getContext()
                            .setAuthentication(authentication);
                } catch (io.jsonwebtoken.JwtException | IllegalArgumentException ignored) {
                    org.springframework.security.core.context.SecurityContextHolder.clearContext();
                }
            }
            chain.doFilter(request, response);
        }
    }

    @Bean
    JwtFilter jwtFilter(SecretKey jwtSigningKey, AppUserRepository users, StringRedisTemplate redis) {
        return new JwtFilter(jwtSigningKey, users, redis);
    }
}
