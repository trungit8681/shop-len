# Audit xác minh MVP local — Shop Len

**Ngày:** 2026-10-04  
**Phạm vi:** Xác minh build, test, Docker local, migration, upload ảnh và responsive viewport sau khi mở rộng MVP. Đây không phải security audit độc lập hoặc phê duyệt production.

## Kết quả xác minh

| Hạng mục | Kết quả | Bằng chứng thực thi |
|---|---|---|
| Customer/Admin build | Đạt | `npm run build` trong `source/customer` và `source/admin`; TypeScript/build Next.js thành công |
| Backend | Đạt | `mvn clean test` trong `source/backend`; 4 tests, 0 lỗi |
| Admin customer profile/password reset | Đạt | Admin build; UI xác nhận mở form và cập nhật lại cùng họ tên/số điện thoại; unit test xác nhận link dùng email khách hàng, lưu hash token, hết hạn sau 30 phút. Không gửi email reset thật trong kiểm tra giao diện. |
| Docker Compose | Đạt | `docker compose config --quiet`; services chạy, API/PostgreSQL/Redis/Mailpit healthy |
| HTTP cơ bản | Đạt | Customer `200`, Admin `200`, `/actuator/health` trả `UP` |
| Database | Đạt | Flyway lên version `6`; kiểm tra `products.size_guide` tồn tại; Hibernate validate khi API khởi động |
| Danh mục Admin/Customer | Đạt | Admin list/create/update và bật/ẩn danh mục; API smoke test xác nhận danh mục ẩn biến mất khỏi endpoint public và xuất hiện lại sau khi bật; storefront hiển thị chip lọc theo danh mục |
| Upload ảnh | Đạt | Đăng nhập Admin nhận JWT; multipart JPEG hợp lệ trả URL `/api/media/{uuid}.jpg`, GET trả 200; chữ ký ảnh giả trả 400; UUID không tồn tại trả 404; file smoke test đã được xóa chính xác khỏi volume |
| Responsive Customer checkout/account/address | Đạt trong kiểm tra giao diện | Build Next.js thành công; browser viewport 390 px và 320 px: checkout inline và popup tra cứu không tràn ngang; viewport desktop 1440 px: checkout chỉ có Tỉnh/Thành phố, Phường/Xã, địa chỉ cụ thể; account dialog rộng 760 px, profile form có 2 cột 303 px; không tràn ngang |
| Dữ liệu test local | Đã dọn | Xóa có điều kiện hai tài khoản E2E, hai sản phẩm thử, hai danh mục thử, địa chỉ, đơn liên quan và inventory movement; giữ nguyên tài khoản Admin cùng sản phẩm/danh mục ngoài phạm vi |

## Thay đổi được xác minh

- Bổ sung `size_guide` bằng migration mới V6; không thay đổi các migration cũ đã áp dụng.
- Upload ảnh Admin-only, chỉ nhận JPEG/PNG/WebP, giới hạn 5 MB, xác thực chữ ký nội dung, tên UUID, lưu trong volume riêng và trả ảnh với `nosniff`.
- Customer hiển thị hướng dẫn size và thông tin sản phẩm; Admin có upload/xem trước/gỡ ảnh và nhập hướng dẫn size.
- Admin quản lý trạng thái danh mục; Customer chỉ nhận danh mục đang bật và lọc sản phẩm bằng dropdown/chip.
- Checkout Customer chuyển khỏi popup sang form inline trong khu vực giỏ; CTA và nội dung xác nhận nêu rõ khách có thể đặt COD không cần tài khoản; tóm tắt tiền hàng/phí giao/tổng COD hiển thị trước khi gửi đơn; xác nhận sau khi tạo đơn cũng nằm inline thay vì nổi đè trang.
- Bỏ nút thêm nhanh trùng lặp trên ảnh sản phẩm để khách chọn màu/size rõ ràng tại cùng một nút “Thêm vào túi”; tăng vùng chạm mobile và giới hạn mô tả dài trong card.
- Popup tài khoản/tra cứu được giới hạn chiều cao theo viewport nhỏ, cuộn nội dung độc lập; trường nhập dùng cỡ chữ phù hợp mobile để tránh phóng to ngoài ý muốn.
- Account dialog trên desktop có chiều rộng phù hợp hơn; form hồ sơ dùng grid hai cột với label/input xếp dọc và nút cập nhật riêng một hàng, chuyển về một cột ở mobile.
- Biểu mẫu địa chỉ mới chỉ yêu cầu Tỉnh / Thành phố, Phường / Xã và địa chỉ cụ thể. Trường district cũ vẫn lưu nội bộ dưới dạng rỗng cho dữ liệu mới nhằm tương thích schema/API; địa chỉ lưu, checkout và chi tiết đơn Admin không hiển thị cấp hành chính đã bỏ.
- Admin không còn nhập slug; tự sinh slug từ tên sản phẩm khi lưu. Mã SKU 40-bit ngẫu nhiên, kèm tiền tố rút gọn tên/màu/size, tự sinh cho biến thể mới; SKU hiện hữu được giữ nguyên và chỉ đọc khi sửa để bảo toàn tham chiếu tồn kho/đơn hàng.
- Giỏ Customer được reconcile với toàn bộ catalog public đang active; sản phẩm ẩn hoặc biến thể đã xóa bị loại khỏi localStorage/cart count/subtotal/checkout. Catalog được làm mới khi trang nhận focus, khi tab hiển thị lại và mỗi 30 giây; Local cart được nạp an toàn trước khi ghi persist để không bị ghi đè rỗng lúc khởi tạo. Browser test với catalog mock đã xác nhận cart từ 1 món về 0, localStorage thành `[]`, checkout biến mất và sản phẩm bị ẩn bị gỡ khỏi danh sách.
- Admin có thể cập nhật họ tên/số điện thoại khách hàng và gửi link reset mật khẩu qua email. Luồng reset dùng service dùng chung với “Quên mật khẩu”, link một lần có hạn 30 phút; Admin không thiết lập hay xem mật khẩu.
- README, roadmap và audit này mô tả phạm vi hiện tại cùng các giới hạn còn lại.

## Bằng chứng nghiệp vụ có sẵn

Các smoke test E2E từng chạy riêng trong phiên build đã xác minh đăng ký/đăng nhập, password reset qua Mailpit, invalidation phiên cũ, catalog, COD, giữ/hoàn tồn, tra cứu/hủy đơn, và chuyển trạng thái giao hàng có carrier/tracking. Các lượt đó là kiểm tra thủ công, không phải automated regression suite được lưu trong source.

## Giới hạn và việc cần làm trước production/AWS

- Chưa có AWS staging/production; chưa có SMTP production, S3/CDN, TLS/domain, backup/restore hoặc monitoring.
- Volume ảnh local chỉ phù hợp Compose dev; cần object storage trước khi scale nhiều instance.
- Cần tự động hóa integration/E2E/browser và kiểm thử concurrency, tải, accessibility; unit tests hiện mới có 3 trường hợp.
- Cần security review chuyên sâu, rate limiting/chống abuse, quy trình secrets, retention dữ liệu cá nhân và chốt chính sách nghiệp vụ còn mở.
- Kiểm tra viewport xác nhận không tràn ngang ở trang mở đầu; không thay thế kiểm thử thao tác toàn bộ các luồng trên nhiều thiết bị/trình duyệt.
- Checkout UI được kiểm tra ở viewport 320 px và 390 px, nhưng không gửi POST tạo đơn trong lần audit này để tránh tạo dữ liệu đơn test; cần automated E2E trước khi dùng production.

Không dùng kết quả này để kết luận ứng dụng đã sẵn sàng nhận đơn/dữ liệu thật.
