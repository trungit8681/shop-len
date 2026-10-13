# Shop Len — MVP local

Ứng dụng bán hàng len gồm storefront cho khách, dashboard vận hành, REST API và PostgreSQL. Docker Compose là môi trường phát triển local; AWS chưa được cấu hình.

## Thành phần

- Customer và Admin: Next.js.
- API: Spring Boot 3 / Java 21, JWT và phân quyền Admin/Customer.
- Dữ liệu: PostgreSQL 16, quản lý schema bằng Flyway; Redis cho cache catalog và thu hồi JWT.
- Email thử nghiệm: Mailpit (không gửi email ra ngoài).
- Ảnh sản phẩm: lưu trong Docker volume `product_uploads`.

## Chạy local

Cần Docker Desktop và Docker Compose v2.

```powershell
Copy-Item .env.example .env
docker compose up --build
```

| Dịch vụ | URL |
|---|---|
| Cửa hàng | http://localhost:3000 |
| Quản trị | http://localhost:3001 |
| API health | http://localhost:8080/actuator/health |
| Hộp thư thử nghiệm | http://localhost:8025 |

Tài khoản Admin demo: `admin` / `ChangeMe123!`. Chỉ dùng local; thay mật khẩu và JWT secret trước khi chia sẻ môi trường. SMTP Mailpit nhận thư reset password trên UI cổng 8025. Các cổng được bind vào loopback.

`docker compose down` dừng dịch vụ và giữ dữ liệu. `docker compose down -v` xóa dữ liệu PostgreSQL và ảnh tải lên trong volume — chỉ dùng khi chủ động muốn reset hoàn toàn.

## Phạm vi MVP

- Tài khoản khách: đăng ký/đăng nhập, hồ sơ, địa chỉ giao hàng, lịch sử đơn.
- Quên mật khẩu cho Admin và Customer bằng email link dùng một lần, hết hạn; Mailpit thay SMTP thật khi chạy local.
- Admin tra cứu, sửa thông tin khách, đặt mật khẩu mới trực tiếp hoặc gửi email link đặt lại mật khẩu.
- Catalog: mỗi sản phẩm có nhiều kiểu với nhiều ảnh, giá bán và chất liệu riêng; mỗi kiểu có các lựa chọn màu/kích cỡ, SKU và tồn kho riêng. Admin có thể thêm ảnh bằng URL hoặc upload nhiều ảnh JPEG/PNG/WebP (tối đa 5 MB mỗi ảnh); cửa hàng hiển thị gallery ảnh theo kiểu đang chọn.
- Admin tạo danh mục, gán danh mục cho sản phẩm và bật/ẩn danh mục; Customer thấy danh mục đang bật dưới dạng bộ lọc trực quan và có thể chọn để lọc catalog.
- Giỏ hàng và checkout COD ngay dưới giỏ (không bắt buộc tài khoản), hiển thị tóm tắt phí/tổng tiền; đồng bộ giỏ với catalog đang bán và tự loại sản phẩm đã ẩn khi tải lại, quay lại tab hoặc làm mới catalog định kỳ; snapshot giá/mặt hàng, phí giao hàng cấu hình được và giữ tồn theo SKU trong transaction.
- Tra cứu đơn khách vãng lai theo mã đơn/số điện thoại; khách đã đăng nhập xem đơn, yêu cầu hủy theo trạng thái cho phép.
- Admin xử lý vòng đời đơn, thông tin vận chuyển, điều chỉnh kho và xem lịch sử/ cảnh báo tồn thấp/báo cáo cơ bản.
- JWT có role, logout thu hồi token qua Redis; đổi mật khẩu vô hiệu phiên cũ.
- Giao diện co giãn cho desktop/mobile.

## Kiểm tra

```powershell
Set-Location source\customer
npm run build

Set-Location ..\admin
npm run build

Set-Location ..\backend
mvn clean test
```

Các lệnh frontend/backend cũng có thể chạy trực tiếp trên máy đã cài đúng Node/Java/Maven. Smoke test Docker và trạng thái từng hạng mục được lưu trong `audit/`.

## API chính

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| POST | `/api/auth/register`, `/login/customer`, `/login/admin`, `/forgot-password`, `/reset-password`, `/logout` | Public/JWT | Tài khoản và phiên; login theo khu vực sẽ kiểm tra role ở backend |
| GET | `/api/products`, `/api/categories` | Public | Catalog |
| POST | `/api/admin/products`, PUT/DELETE `/api/admin/products/{id}` | Admin JWT | Catalog |
| POST | `/api/admin/media` | Admin JWT | Upload ảnh |
| GET | `/api/media/{filename}` | Public | Ảnh sản phẩm đã tải lên |
| POST | `/api/orders` | Public/Customer JWT | Đặt COD |
| GET/PUT | `/api/admin/orders/**` | Admin JWT | Xử lý đơn |
| GET/POST | `/api/customer/**`, `/api/admin/inventory/**` | JWT | Hồ sơ, địa chỉ và kho |

## Giới hạn trước khi production/AWS

Đây là MVP local, không phải xác nhận sẵn sàng production. Chưa triển khai AWS, SMTP production, S3/CDN, rate limiting/chống abuse toàn diện, quy trình backup/restore và monitoring vận hành. Thư mục upload local phù hợp cho Docker dev; cần chuyển sang object storage trước khi chạy nhiều instance. Cần security review, kiểm thử tích hợp/concurrency/browser trên CI, chốt chính sách dữ liệu và thay toàn bộ secrets/mật khẩu demo trước khi tiếp nhận dữ liệu thật.

Đặc tả nghiệp vụ: `document/bussiness.md`. Roadmap và tình trạng: `document/implementation-plan.md`, `audit/`.
