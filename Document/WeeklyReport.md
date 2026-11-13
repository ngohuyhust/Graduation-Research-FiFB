## Báo cáo ngày 13/11/2026

- Thêm hàng đợi nhiều set mới khi offline cho session đã lưu: hiển thị Pending sync, đánh số liên tiếp và sao chép set đang chờ
- Đồng bộ theo thứ tự với mã retry giữ nguyên; lưu set đã xác nhận trước khi chuyển sang set kế tiếp để phục hồi khi đồng bộ được một phần
- Thao tác bị từ chối dừng hàng đợi và hiển thị lý do; bỏ thao tác đó vẫn giữ các set phía sau; retry không xóa nhầm bản nháp mới
- Kiểm tra: 51 Flutter tests, analyze/format/build Web đạt (URL API mẫu); gồm ghi đồng thời, lỗi lưu trữ, khôi phục sau đồng bộ một phần, xử lý từ chối và luồng ghi nhiều set offline; 20 logger tests đạt sau chỉnh sửa cuối
- Không đổi backend/schema; sửa/xóa, pause/rest và hoàn thành vẫn chờ hàng đợi rỗng; chưa xử lý đồng thời nhiều tab/thiết bị và chưa xác minh storage trên thiết bị thật

## Báo cáo ngày 08/11/2026

- Bổ sung lưu bản nháp form set theo từng tài khoản, buổi tập, bài tập và set; mở lại form khôi phục reps/tạ/thời lượng/ghi chú đang nhập
- Thêm Keep draft và Discard draft; lỗi lưu trữ giữ form để thử lại, tuần tự hóa ghi dữ liệu để tránh bản cũ ghi đè bản mới
- Khi gửi set, lưu thao tác chờ xác nhận trước khi xóa draft; có thể phục hồi nếu app đóng giữa quá trình chuyển dữ liệu hoặc mất phản hồi mạng
- Kiểm tra: 47 Flutter tests đạt, analyze/format/build Web đạt (URL API mẫu); bao gồm màn hình 320px/1280px, tách draft mới/sửa và tài khoản, lỗi lưu trữ và phục hồi thao tác gửi; chạy lại 16 logger tests sau thay đổi cuối
- Chưa xác minh storage/lifecycle trên thiết bị thật; hàng đợi offline nhiều thao tác và xử lý xung đột vẫn là bước tiếp theo; không thay đổi backend/schema

## Báo cáo ngày 06/11/2026

- Tiếp tục phần khôi phục live workout: khi mở lại logger hoặc quay về app lúc rảnh, kiểm tra quyền truy cập, gửi lại thao tác chưa được xác nhận và tải kết quả mới
- Cập nhật trạng thái hoàn thành từ server khi app trở lại foreground; không tự gửi lại thao tác đã bị từ chối, giữ luồng xem và bỏ thay đổi rõ ràng
- Ẩn cả thông tin set đang chờ khi mất quyền truy cập; giữ dữ liệu phục hồi riêng theo tài khoản
- Kiểm tra: 43 Flutter tests đạt, Flutter analyze không có lỗi và build Web đạt (URL API mẫu); bổ sung test khôi phục, lifecycle, yêu cầu bị từ chối và quyền truy cập
- Docker vẫn chưa hoạt động nên chưa chạy integration PostgreSQL/Redis; chưa kiểm chứng trên thiết bị thật, chưa triển khai hàng đợi nhiều thao tác offline hoặc lưu nội dung form chưa gửi
- Bước tiếp theo: kiểm chứng migration khi có môi trường DB và tiếp tục durable drafts/offline queue với xử lý xung đột

## Báo cáo ngày 01/11/2026

- Bổ sung live workout trên Flutter: bắt đầu ngày tập từ Today Workout, ghi rep/tạ/thời lượng/ghi chú, sao chép set trước, sửa và xóa set
- Thêm rest timer, tạm dừng/tiếp tục, hoàn thành buổi tập, lịch sử và mở lại session; xem hướng dẫn bài tập và kết quả buổi hoàn thành trước
- Thêm migration V5: snapshot ngày tập, trạng thái pause/rest, mã thao tác chống tạo trùng session/set khi retry và soft delete set
- Lưu cache và một thay đổi đã gửi nhưng chưa được xác nhận theo từng tài khoản để khôi phục sau lỗi mạng hoặc đóng app; chưa hỗ trợ ghi toàn bộ buổi tập offline hay xử lý xung đột nhiều thiết bị
- Kiểm tra: 287 backend tests và 40 Flutter tests đạt; lint/typecheck/build/format backend, Flutter analyze/format và build Web đạt
- Đã bổ sung integration tests nhưng chưa chạy PostgreSQL/Redis thực tế do Docker chưa hoạt động; chưa áp dụng V4/V5 lên production và chưa kiểm chứng lưu trữ/lifecycle trên thiết bị thật
- Bước tiếp theo: kiểm chứng migration và khôi phục session trên môi trường thực, sau đó mở rộng hàng đợi offline; recommendation/substitution/progression chưa triển khai

## Báo cáo ngày 31/10/2026

- Thêm danh sách và trình chỉnh sửa workout plan trên Flutter: tạo/sửa, chọn bài, chia ngày, đặt mục tiêu, sắp xếp/xóa bài, archive/restore
- Thêm lịch tập tuần và Today Workout theo ngày địa phương của thiết bị; hỗ trợ giữ nội dung khi lưu lỗi và xác nhận khi bỏ thay đổi
- Thêm migration V4 và API lịch tập; kiểm tra quyền sở hữu, chỉ hiển thị plan active và rollback khi lịch trỏ đến ngày không có bài
- Kiểm tra: 280 backend tests và 31 Flutter tests đạt; backend checks và Flutter Web build đạt; integration tests chưa chạy do Docker không phản hồi

## Báo cáo ngày 26/10/2026

- Rà soát triển khai hiện có theo kế hoạch cuối; ghi rõ phần đã có API, phần Flutter còn thiếu và thứ tự tiếp tục
- Thêm Explore trên Flutter: tìm kiếm/lọc/phân trang bài tập, xem GIF/hướng dẫn và quản lý favorites
- Sửa lỗi phạm vi alias SQL khi lọc nhóm cơ; thêm API trạng thái favorite theo tài khoản và thứ tự phân trang ổn định
- Kiểm tra: 274 backend tests và 24 Flutter tests đạt; backend/React build và Flutter Web build đạt
- Ghi nhận tồn đọng: Docker chưa chạy, thiếu Android SDK và 56 file React cũ chưa đạt formatting; không thực hiện reformat hàng loạt

## Báo cáo ngày 23/10/2026

- Thêm API và migration lưu hồ sơ tập luyện riêng tư cho User
- Thêm onboarding Flutter và chỉnh sửa mục tiêu, lịch tập, thiết bị, cơ ưu tiên, bài không thích và hạn chế

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
