## Báo cáo ngày 18/10/2026

- Xây dựng nền tảng Flutter cho Android, iOS và Web, có điều hướng User/Admin và bố cục responsive
- Thêm đăng ký, xác minh email, đăng nhập, đặt lại mật khẩu, khôi phục phiên và đăng xuất
- Bổ sung API xác thực mobile, lưu refresh token an toàn trên thiết bị và kiểm thử Flutter trong CI

## Báo cáo ngày 14/10/2026

- Tích hợp Flyway vào Docker Compose để tự động quản lý phiên bản cơ sở dữ liệu
- Chuẩn hóa toàn bộ cấu trúc hiện tại thành migration V1, làm nền tảng cho các bản V2, V3 sau này
- Kiểm tra trên schema riêng và chuyển Flyway sang quản lý schema public bằng baseline, giữ nguyên dữ liệu hiện có
- Bổ sung API /api/v1 và tài liệu Swagger/OpenAPI, điều chỉnh cookie xác thực và giới hạn đăng nhập cho API mới
- Thêm migration V2 để chiều cao, cân nặng và giới tính là thông tin tùy chọn
- Tách test khỏi dịch vụ local, bổ sung integration test PostgreSQL/Redis vào CI và cập nhật dependency
- Kiểm tra thành công 258 test, build, lint, formatting và typecheck; chưa chạy integration test local do Docker chưa bật

## Báo cáo ngày 04/10/2026

- Hoàn thành báo cáo kế hoạch cho GR2: https://docs.google.com/document/d/1Pz8wP_1k36riTPgCV02lnbfX8isFoHdqYZVj4ZWxL6Q/edit?usp=sharing
- Tìm hiểu Flutter và khả năng xây dựng ứng dụng mobile và web từ cùng một cơ sở mã nguồn
- Xác định luồng sử dụng chính: onboarding, nhận chương trình đề xuất, thực hiện buổi tập, ghi kết quả và theo dõi tiến bộ
- Phân chia phạm vi và lộ trình triển khai; ưu tiên hoàn thiện các chức năng cốt lõi
- Xác định bước tiếp theo: xây dựng nền tảng Flutter, rà soát API hiện có và chuẩn hoá dữ liệu bài tập phục vụ cá nhân hoá

## Báo cáo ngày 18/05/2026

- Triển khai frontend bằng React + Vite
- Dùng React Router để chia route theo vai trò: Public, Auth, User, Trainer, Admin
- Dùng Axios để gọi API backend và tự động gắn access token
- Dùng React Hook Form để xử lý form đăng nhập, đăng ký, profile, workout plan
- Dùng Sonner để hiển thị toast thông báo trên giao diện
- Dùng Tailwind CSS để xây dựng giao diện responsive
- Tích hợp frontend với backend qua các API client: authApi, exerciseApi, favoriteApi, trainerApi, workoutPlanApi, notificationApi, adminApi
- Chạy thử hệ thống và kiểm tra các flow chính của MVP

## Báo cáo ngày 11/05/2026

- User có thể xem/lọc bài tập, lưu favorite, tạo workout plan, tìm Trainer và gửi yêu cầu kết nối
- Trainer có thể cập nhật hồ sơ, xử lý request, gửi chứng chỉ và đề xuất bài tập
- Admin có thể quản lý user, duyệt bài tập, duyệt chứng chỉ và xem audit log
- Dùng PostgreSQL để lưu dữ liệu nghiệp vụ lâu dài
- Dùng Redis để lưu refresh/session token, OTP xác minh email, token reset password và hỗ trợ rate limit
- Dùng SendGrid/SMTP để gửi email xác minh tài khoản và reset mật khẩu
- Dùng audit log để ghi lại các thao tác quan trọng của Admin
- Dùng notification table để lưu thông báo quan trọng cho người dùng
- Viết test cho token, schema, exercises, favorites, reviews và trainer certificates

## Báo cáo ngày 04/05/2026

- Thiết kế database PostgreSQL/Supabase cho user, trainer, exercise, workout, notification, audit log
- Chuẩn hóa dữ liệu bài tập theo muscles, body_parts, equipments và các bảng mapping many-to-many
- Triển khai backend bằng Node.js + Express
- Dùng pg để kết nối backend với PostgreSQL/Supabase
- Dùng bcryptjs để hash mật khẩu trước khi lưu database
- Dùng JWT để sinh access token cho phiên đăng nhập
- Dùng opaque refresh token và lưu hash trong Redis để tăng bảo mật
- Dùng Zod để validate dữ liệu request
- Dùng Helmet để thêm security headers
- Dùng CORS để cho phép frontend gọi backend đúng origin
- Dùng express-rate-limit và rate-limit-redis để chống spam các endpoint nhạy cảm
- Dùng Morgan để log request trong quá trình phát triển
- Chuẩn hóa response, error handler và middleware authentication/authorization

## Báo cáo ngày 27/04/2026

- Tìm hiểu bài toán xây dựng nền tảng web hỗ trợ người mới tập gym
- Xác định 3 vai trò chính: User, Trainer, Admin
- Chốt phạm vi MVP: auth, thư viện bài tập, favorite, workout plan, kết nối Trainer, review, admin
- Tìm hiểu kiến trúc client-server và REST API
- Tìm hiểu Node.js, Express và cách tổ chức backend theo module
- Tìm hiểu React, Vite, React Router và Axios cho frontend
- Tìm hiểu PostgreSQL/Supabase, quan hệ one-to-many, many-to-many và soft delete
- Tìm hiểu JWT authentication, refresh token, role-based access control
- Tìm hiểu Redis dùng cho session/token, OTP và rate limiting
- Tìm hiểu SendGrid/SMTP cho email verification và password reset
- Hoàn thiện tài liệu problem statement và định hướng chức năng chính
- Link github: https://github.com/ngohuyhust/Graduation-Research-FiFB.git
