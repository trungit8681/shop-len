# Kế hoạch triển khai Shop Len

**Cơ sở:** `document/bussiness.md`  
**Trạng thái hiện tại:** MVP local đã được triển khai với Next.js Admin/Customer, Spring Boot API, PostgreSQL, Redis, Mailpit và Docker Compose. Các chức năng và giới hạn được phân biệt rõ trong mục 8 và audit build mới nhất; chưa triển khai AWS hoặc nghiệm thu production.

## 1. Mục tiêu và nguyên tắc

Xây dựng MVP bán quần áo len ưu tiên thiết bị di động, có quản trị sản phẩm/kho/đơn hàng và đặt hàng COD. Bám sát các Use Case, BR-01–BR-16 và tiêu chí nghiệm thu trong tài liệu nghiệp vụ. Thanh toán trực tuyến, tích hợp hãng vận chuyển, khuyến mãi nâng cao, đánh giá/đổi trả, loyalty, Shopee và thông báo tự động là các giai đoạn sau, không mặc định thuộc MVP.

Kiến trúc đích: Next.js cho website khách hàng và giao diện quản trị; Spring Boot REST API với JWT và phân quyền; PostgreSQL làm cơ sở dữ liệu chính; Redis cho cache/tác vụ phù hợp. Phát triển và kiểm thử cục bộ trước bằng Docker Compose. Chỉ triển khai AWS sau khi MVP chạy ổn định và có quyết định vận hành, bảo mật, chi phí và lưu trữ dữ liệu được duyệt.

## 2. Quyết định và giả định nghiệp vụ

Các quy tắc dưới đây đang được dùng làm mặc định trong MVP theo trao đổi và phạm vi hiện có; cần chủ sản phẩm xác nhận/chỉnh trước production. Các câu hỏi còn mở từ `bussiness.md` vẫn cần được quyết định:

- Quên mật khẩu gửi email link một lần, hết hạn sau 30 phút; local dùng Mailpit.
- Đơn COD giữ tồn ngay trong transaction lúc checkout; hoàn tồn khi hủy hợp lệ.
- Khách vãng lai tra cứu/hủy bằng mã đơn và số điện thoại; cần xác nhận chính sách hủy theo trạng thái.
- Phí giao hàng cấu hình bằng biến môi trường; hiện chưa có vùng phục vụ hay tích hợp hãng vận chuyển.
- Giá sản phẩm hiện đặt ở sản phẩm; SKU/biến thể biểu diễn màu, size và tồn kho.
- Phạm vi báo cáo doanh thu (ví dụ: xử lý đơn hủy/hoàn), múi giờ và khoảng thời gian.
- Vai trò nhân viên trong MVP; dữ liệu cá nhân cần thu thập, thời hạn lưu và quyền truy cập.
- Mục tiêu tải, khả năng sẵn sàng, ngân sách AWS, khu vực triển khai, tên miền và người chịu trách nhiệm vận hành.

Không triển khai thanh toán hay giao vận trực tuyến trong MVP nếu chưa có quy trình, tài khoản sandbox/đối tác và tiêu chí nghiệm thu riêng.

## 3. Lộ trình và đầu ra

| Giai đoạn | Công việc chính | Đầu ra và điều kiện hoàn tất | Phụ thuộc | Ước lượng sơ bộ |
|---|---|---|---|---:|
| 0. Khởi động và xác minh | Xác nhận phạm vi, quyết định các câu hỏi nghiệp vụ; kiểm kê dữ liệu, quyền truy cập và môi trường | Backlog được ưu tiên; quyết định nghiệp vụ có người duyệt; tiêu chí nghiệm thu cụ thể | Không | 3–5 ngày làm việc |
| 1. Thiết kế sản phẩm và kỹ thuật | Luồng mua hàng/admin trên mobile; mô hình dữ liệu, API, trạng thái đơn/kho; phân quyền; threat/privacy review cơ bản | Wireframe; ERD; API contract; ma trận vai trò; kế hoạch kiểm thử và kiến trúc Docker/AWS | Giai đoạn 0 | 1–2 tuần |
| 2. Nền tảng Docker cục bộ | Tạo cấu trúc Next.js và Spring Boot; Docker Compose cho web, API, PostgreSQL và Redis; cấu hình môi trường mẫu, health check, migration và seed dữ liệu giả | Máy phát triển có thể khởi động bằng tài liệu hướng dẫn; không chứa bí mật; smoke test kết nối dịch vụ đạt | Giai đoạn 1 | 3–5 ngày |
| 3. Tài khoản và quản trị hàng hóa | Đăng ký/đăng nhập, JWT, vai trò; danh mục, sản phẩm, hình ảnh, màu/size, SKU và quản lý tồn | Admin quản lý sản phẩm/biến thể; API và giao diện được kiểm thử quyền; SKU duy nhất và không xóa cứng sản phẩm đã có đơn | Giai đoạn 2 | 1–2 tuần |
| 4. Kho và luồng mua hàng | Giỏ hàng; kiểm tra tồn lần cuối; nhập/điều chỉnh kho, lịch sử; checkout COD và lưu snapshot mặt hàng/giá | Đơn COD được tạo an toàn; tồn theo SKU, chống bán vượt tồn trong giao dịch đồng thời; có audit trail kho | Giai đoạn 3 | 1–2 tuần |
| 5. Vận hành đơn và báo cáo MVP | Tra cứu đơn, xác nhận/chuẩn bị/bàn giao, cập nhật trạng thái; hủy/hoàn kho; quản lý thông tin khách; dashboard cơ bản | Admin vận hành đơn; khách xem đơn của mình hoặc tra cứu theo quy trình đã duyệt; báo cáo đối soát được | Giai đoạn 4 | 1–2 tuần |
| 6. Tích hợp, kiểm thử và phát hành MVP | Kiểm thử chức năng, phân quyền, bảo mật cơ bản, responsive, hiệu năng luồng đặt hàng; sửa lỗi; nhập dữ liệu; hướng dẫn vận hành | Biên bản kiểm thử; tiêu chí nghiệm thu MVP đạt; kế hoạch rollback/backup; người dùng nghiệp vụ duyệt phát hành | Giai đoạn 5 | 1–2 tuần |
| 7. AWS pilot và chuyển môi trường | Dựng tài khoản/môi trường AWS riêng; chọn dịch vụ triển khai theo tải/ngân sách; cấu hình mạng, TLS, secrets, DB/Redis, lưu trữ ảnh, logs/metrics, backup; triển khai staging rồi pilot | Staging AWS hoạt động; restore/rollback được diễn tập; kiểm tra quyền, dữ liệu và chi phí; có phê duyệt trước production | Giai đoạn 6 và quyết định vận hành | 1–3 tuần, ngoài ước lượng MVP |
| 8. Mở rộng sau MVP | Từng đợt riêng cho cổng thanh toán, hãng vận chuyển, khuyến mãi, đánh giá/đổi trả, thông báo và Shopee | Đặc tả tích hợp và kiểm thử đầu-cuối cho từng đối tác; ký duyệt trước khi phát hành | MVP ổn định và phụ thuộc đối tác | Ước lượng sau khi chốt phạm vi |

Ước lượng tổng thể giai đoạn 0–6 khoảng **7–12 tuần**: tài liệu nghiệp vụ đưa ra mốc 7–10 tuần; kế hoạch chi tiết này mở rộng biên trên để tính rõ Docker-first, kiểm thử và bất định ở thiết kế/triển khai. Giả định một nhóm nhỏ làm việc liên tục, yêu cầu được duyệt sớm, không có di trú dữ liệu phức tạp và không phát sinh tích hợp bên ngoài. Đây là ước lượng lập kế hoạch, không phải cam kết; giai đoạn AWS và phần mở rộng chưa tính vào con số này. Cần cập nhật sau giai đoạn 0 khi biết nhân lực, dữ liệu và mục tiêu vận hành.

## 4. Cấu hình phát triển Docker-first

- Docker Compose cục bộ chạy các dịch vụ ứng dụng, PostgreSQL và Redis; chỉ mở các cổng cần thiết cho máy phát triển.
- Quản lý schema bằng migration có phiên bản; seed chỉ dùng dữ liệu giả, không đưa thông tin khách thật vào repository.
- Dùng `.env.example` với tên biến và giá trị minh họa không bí mật; secrets thật ở file local bị loại khỏi Git hoặc secret manager, không ghi vào log/report.
- Health checks, readiness, restart policy hợp lý, volume bền vững cho phát triển và lệnh rõ ràng để khởi tạo/reset dữ liệu giả.
- Không xem Docker Compose là cấu hình production. Tách cấu hình local, staging và AWS; không chuyển nguyên secrets hoặc volume local lên môi trường thật.
- Redis chỉ dùng cho cache, giới hạn tốc độ hoặc tác vụ khi có thiết kế phù hợp; PostgreSQL vẫn là nguồn dữ liệu nghiệp vụ chính.
- Ghi README hướng dẫn yêu cầu phiên bản công cụ, lệnh khởi động/dừng, migration, test và xử lý lỗi thường gặp.

## 5. Kiểm thử và nghiệm thu

1. **Đơn vị:** quy tắc giá/tổng tiền, trạng thái đơn, quyền truy cập, tính tồn khả dụng, hoàn kho.
2. **Tích hợp:** API–PostgreSQL, migration, JWT/role, giao dịch tạo đơn và cập nhật kho; Redis nếu chức năng phụ thuộc.
3. **Đầu-cuối:** tạo sản phẩm nhiều SKU → nhập kho → khách chọn biến thể → đặt COD → admin xử lý → tra cứu đơn/hủy theo điều kiện.
4. **Đồng thời và dữ liệu:** nhiều checkout cùng SKU không bán vượt; đơn cũ giữ snapshot tên/giá/SKU; lịch sử kho và trạng thái có người, thời điểm, lý do.
5. **Bảo mật/privacy:** API admin bị từ chối với vai trò không đủ; dữ liệu đơn chỉ người có quyền xem; kiểm tra xác thực đầu vào, CORS/cấu hình, không lộ token/PII trong log.
6. **Giao diện:** luồng mua hàng và quản trị chính trên kích thước điện thoại phổ biến, thông báo lỗi dễ hiểu và trạng thái tải/rỗng.
7. **Nghiệm thu nghiệp vụ:** dùng các tiêu chí mục 13 trong `bussiness.md`; số liệu báo cáo phải có định nghĩa được duyệt và đối chiếu được với đơn mẫu.

Mỗi đợt phát hành lưu kết quả lệnh kiểm tra, phiên bản ứng dụng/schema, danh sách lỗi còn tồn và người phê duyệt. Không đánh dấu đạt nếu chưa chạy kiểm tra hoặc thiếu dữ liệu kiểm chứng.

## 6. AWS rollout và vận hành

Thực hiện sau local MVP: tách tài khoản/môi trường; thiết kế VPC và phân vùng public/private; TLS và domain; secrets trong dịch vụ quản lý bí mật; PostgreSQL/Redis managed nếu phù hợp ngân sách; lưu ảnh ở object storage; triển khai Next.js và Spring Boot theo lựa chọn đã đánh giá; logging/metrics/alarms; backup mã hóa và kiểm tra phục hồi; IAM tối thiểu; CI/CD có staging, phê duyệt production và rollback. Chọn cụ thể dịch vụ AWS, topology và sizing sau khi chốt tải, ngân sách, RTO/RPO, yêu cầu dữ liệu và năng lực vận hành—không mặc định một cấu hình hay chi phí chưa được kiểm chứng.

Trước production cần: smoke/E2E trên staging; kiểm thử quyền và cấu hình; diễn tập backup/restore và rollback; xác nhận chi phí/budget alerts; kiểm tra domain/TLS; kế hoạch giám sát, phản ứng sự cố, hỗ trợ người dùng và quyền sở hữu vận hành.

## 7. Điều kiện bắt đầu audit mã nguồn

Đã có source nền tảng; audit phần chức năng còn lại cần:

- Mã nguồn thực tế hoặc liên kết/nhánh repository có quyền truy cập, bao gồm frontend, backend và migration.
- Docker Compose, Dockerfile, cấu hình local/staging/AWS (đã loại bỏ secrets), CI và hướng dẫn chạy.
- Bộ test và lệnh chạy; dữ liệu seed giả hoặc kịch bản tái hiện, không gửi dữ liệu khách hàng thật.
- Phiên bản đã phát hành hoặc commit/branch làm baseline, backlog/quyết định nghiệp vụ mới hơn nếu có.

Sau khi có các đầu vào này, dùng agent `.codex/agents/business-requirements-reviewer.toml` để tạo report audit có bằng chứng; không xem kế hoạch này là bằng chứng rằng chức năng đã được triển khai.

## 8. Trạng thái build hiện tại

### Đã triển khai cho MVP local

- Storefront và dashboard Admin độc lập, responsive; đăng nhập/đăng ký, hồ sơ/địa chỉ và email password recovery cho cả hai vai trò.
- Catalog, danh mục, bộ lọc, biến thể/SKU, quản trị sản phẩm, hướng dẫn chọn size, URL ảnh và upload JPEG/PNG/WebP giới hạn 5 MB.
- Giỏ hàng, COD, phí giao hàng cấu hình được, snapshot đơn và giữ tồn theo SKU trong transaction.
- Tra cứu đơn khách vãng lai, lịch sử đơn khách đã đăng nhập, quy trình Admin cập nhật trạng thái/vận chuyển, hủy/hoàn kho, lịch sử điều chỉnh tồn và báo cáo cơ bản.
- JWT role-based, logout thu hồi qua Redis, token-version khi đổi mật khẩu; PostgreSQL/Flyway, cache catalog và Mailpit local.
- Build hai frontend, Maven tests và smoke test Docker/upload được ghi trong [audit/2026-10-04-mvp-expansion.md](../audit/2026-10-04-mvp-expansion.md).

### Còn lại trước production hoặc AWS

- Chốt các chính sách còn mở (vai trò nhân viên, quy tắc hủy theo trạng thái, địa bàn/phí vận chuyển, thời hạn lưu dữ liệu, báo cáo và mục tiêu vận hành).
- Tự động hóa integration/E2E/browser và kiểm thử race condition, tải, accessibility; mở rộng unit test bao phủ auth, upload, địa chỉ, workflow và hoàn kho.
- Security review, rate limiting/chống abuse, quản lý secrets, SMTP thật, S3/object storage thay volume local, TLS/domain, backup/restore và monitoring.
- Dựng AWS staging/pilot, diễn tập restore/rollback và phê duyệt chi phí/quyền truy cập trước production.

Compose hiện chỉ là môi trường local. Không nhận dữ liệu/đơn thật trước khi hoàn tất các kiểm soát production và phê duyệt nghiệp vụ/vận hành.
