package vn.shoplen.media;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

@RestController
public class MediaController {
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", ".jpg", "image/png", ".png", "image/webp", ".webp");
    private final Path uploadDirectory;

    public MediaController(@Value("${app.upload-directory:./uploads}") String uploadDirectory) {
        this.uploadDirectory = Path.of(uploadDirectory).toAbsolutePath().normalize();
    }

    @PostMapping(value = "/api/admin/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @CacheEvict(value = "products", allEntries = true)
    public UploadResponse upload(@RequestPart("file") MultipartFile file) {
        String extension = EXTENSIONS.get(file.getContentType());
        if (file.isEmpty() || file.getSize() > 5 * 1024 * 1024 || extension == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ nhận ảnh JPEG, PNG hoặc WebP tối đa 5 MB");
        }
        String filename = UUID.randomUUID() + extension;
        try {
            if (!hasMatchingSignature(file.getBytes(), file.getContentType())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Định dạng nội dung ảnh không hợp lệ");
            }
            Files.createDirectories(uploadDirectory);
            file.transferTo(uploadDirectory.resolve(filename));
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không lưu được ảnh sản phẩm", e);
        }
        return new UploadResponse("/api/media/" + filename);
    }

    @GetMapping("/api/media/{filename}")
    public ResponseEntity<Resource> get(@PathVariable String filename) {
        if (!filename.matches("[a-fA-F0-9-]{36}\\.(jpg|png|webp)")) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        Path image = uploadDirectory.resolve(filename).normalize();
        if (!image.getParent().equals(uploadDirectory) || !Files.isRegularFile(image)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        String type = filename.endsWith(".png") ? "image/png" : filename.endsWith(".webp") ? "image/webp" : "image/jpeg";
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(type))
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic())
                .body(new FileSystemResource(image));
    }

    public record UploadResponse(String url) {}

    private boolean hasMatchingSignature(byte[] bytes, String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> bytes.length >= 3 && (bytes[0] & 0xff) == 0xff
                    && (bytes[1] & 0xff) == 0xd8 && (bytes[2] & 0xff) == 0xff;
            case "image/png" -> bytes.length >= 8 && (bytes[0] & 0xff) == 0x89
                    && bytes[1] == 0x50 && bytes[2] == 0x4e && bytes[3] == 0x47
                    && bytes[4] == 0x0d && bytes[5] == 0x0a && bytes[6] == 0x1a && bytes[7] == 0x0a;
            case "image/webp" -> bytes.length >= 12 && bytes[0] == 0x52 && bytes[1] == 0x49
                    && bytes[2] == 0x46 && bytes[3] == 0x46 && bytes[8] == 0x57
                    && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50;
            default -> false;
        };
    }
}
