# Kế hoạch phát triển cuối cho FiFB

## 1. Định hướng sản phẩm

> **FiFB là nền tảng fitness mobile-first dành cho người mới, hỗ trợ xây dựng chương trình tập, thực hiện workout, theo dõi tiến bộ và kết nối Trainer.**

Một Flutter codebase phục vụ cả ba vai trò:

- User.
- Trainer.
- Admin.

Nền tảng triển khai:

- Android là sản phẩm chính.
- iOS có thể build từ cùng codebase.
- Flutter Web cung cấp giao diện màn hình lớn.
- NestJS, PostgreSQL, Redis và Socket.IO hiện tại tiếp tục được sử dụng.

Người tập có thể hoàn thành 100% hành trình trên mobile. Web chỉ là một lựa chọn bổ sung, không phải điều kiện bắt buộc.

## 2. Kiến trúc tổng thể

```text
Flutter Application
├── User Shell
├── Trainer Shell
└── Admin Shell
        │
        ├── Android
        ├── iOS
        └── Flutter Web
                │
                ▼
        NestJS REST API
        ├── Authentication
        ├── Exercises
        ├── Workout Plans
        ├── Workout Sessions
        ├── Recommendation
        ├── Trainer
        ├── Admin
        ├── Chat
        └── Notifications
                │
       ┌────────┼─────────┐
       ▼        ▼         ▼
 PostgreSQL   Redis    Socket.IO
```

React web hiện tại được giữ trong giai đoạn chuyển đổi để kiểm tra API. Khi Flutter Web đạt đủ chức năng thì có thể ngừng sử dụng React.

## 3. Các trụ cột sản phẩm

### 3.1. Guided Beginner Experience

Người mới không phải tự tìm hàng trăm bài tập và tự xây kế hoạch.

Onboarding thu thập:

- Mục tiêu.
- Trình độ.
- Số ngày tập mỗi tuần.
- Thời lượng mỗi buổi.
- Địa điểm tập.
- Thiết bị có sẵn.
- Nhóm cơ ưu tiên.
- Bài tập không thích.
- Hạn chế cần lưu ý.

Sau onboarding, hệ thống đề xuất một chương trình bốn tuần và giải thích cấu trúc chương trình.

### 3.2. Live Workout chất lượng cao

Màn hình tập luyện phải là phần hoàn thiện nhất:

- Hiển thị workout hôm nay.
- GIF và hướng dẫn bài tập.
- Kết quả buổi trước.
- Ghi set, rep và mức tạ nhanh.
- Sao chép set trước bằng một chạm.
- Rest timer tự động.
- Đổi bài tương đương.
- Sửa hoặc xóa set.
- Tạm dừng và tiếp tục buổi tập.
- Khôi phục sau khi app bị đóng.
- Lưu draft khi mất mạng.

### 3.3. Adaptive Recommendation

Hệ thống điều chỉnh kế hoạch dựa trên:

- Mục tiêu.
- Trình độ.
- Thiết bị.
- Thời lượng.
- Bài từng hoàn thành.
- Mức độ dễ hoặc khó.
- Bài người dùng thích hoặc không thích.
- Các nhóm cơ vừa được tập.

Phiên bản đầu sử dụng:

1. Template đã kiểm duyệt.
2. Bộ lọc ràng buộc.
3. Chấm điểm bài tập.
4. Smart progression.
5. Giải thích kết quả.

Không để LLM tự tạo workout không kiểm soát.

### 3.4. Trainer và Content Governance

Trainer có thể:

- Quản lý hồ sơ.
- Nộp chứng chỉ.
- Nhận yêu cầu kết nối.
- Xem danh sách học viên.
- Giao workout plan.
- Theo dõi buổi tập.
- Để lại nhận xét.
- Chat.
- Đề xuất bài tập mới.

Admin có thể:

- Quản lý tài khoản.
- Duyệt bài tập.
- Duyệt chứng chỉ.
- Quản lý taxonomy.
- Xem audit log.
- Theo dõi notification và email.
- Kiểm tra nội dung recommendation.

## 4. Chức năng theo vai trò

### 4.1. User

#### Bắt buộc

- Đăng ký, xác minh email và đăng nhập.
- Onboarding.
- Hồ sơ tập luyện.
- Exercise library.
- Tìm kiếm và lọc bài.
- Exercise detail.
- Favorite.
- Nhận chương trình đề xuất.
- Chỉnh sửa workout plan.
- Today Workout.
- Live workout logger.
- Rest timer.
- Exercise substitution.
- Workout history.
- Progress analytics.
- Smart progression.
- Kết nối Trainer.
- Chat và notification.

#### Có thể bổ sung

- Huy hiệu.
- Streak.
- Nhắc lịch tập.
- Chia sẻ kết quả dưới dạng ảnh.

### 4.2. Trainer

#### Bắt buộc

- Toàn bộ chức năng User.
- Trainer profile.
- Gửi chứng chỉ.
- Xử lý yêu cầu kết nối.
- Danh sách học viên.
- Xem lịch sử workout của học viên được kết nối.
- Tạo hoặc chỉnh plan cho học viên.
- Nhận xét một buổi tập.
- Chat.
- Đề xuất bài tập.

#### Có thể bổ sung

- Dashboard thống kê học viên.
- Template workout riêng của Trainer.
- Gửi thông báo hàng loạt cho học viên.

### 4.3. Admin

#### Bắt buộc

- Dashboard.
- User management.
- Khóa, mở khóa và vô hiệu hóa tài khoản.
- Exercise moderation.
- Certificate moderation.
- Audit logs.
- Quản lý taxonomy.

#### Có thể bổ sung

- Email delivery logs.
- Import exercise.
- Bulk edit.
- Recommendation monitoring.

## 5. Điều hướng Flutter

### 5.1. User

```text
Home | Explore | Workout | Progress | Profile
```

### 5.2. Trainer

```text
Home | Clients | Workout | Chat | Profile
```

Trainer vẫn truy cập Exercise Library và chức năng tập luyện cá nhân từ `Workout` hoặc `Profile`.

### 5.3. Admin

```text
Dashboard | Review | Users | Audit | Profile
```

Trên mobile dùng card và bottom sheet. Trên tablet hoặc web dùng navigation rail, sidebar và data table.

## 6. Recommendation Engine

### 6.1. Dữ liệu bài tập

Không dùng toàn bộ kho ExerciseDB để tạo plan ngay. Chọn khoảng 60–100 bài cốt lõi và bổ sung:

```text
movement_pattern
difficulty
exercise_type
beginner_friendly
estimated_duration
replacement_group
classification_confidence
review_status
```

Các movement pattern chính:

- Squat.
- Hip hinge.
- Horizontal push.
- Vertical push.
- Horizontal pull.
- Vertical pull.
- Single-leg.
- Core.

### 6.2. Template chương trình

Phiên bản đầu chỉ cần:

- Full Body 2 ngày.
- Full Body 3 ngày.
- Upper/Lower 4 ngày.

Template lưu vị trí, không lưu cứng một bài:

```text
Full Body A
- 1 squat
- 1 horizontal push
- 1 vertical pull
- 1 hip hinge
- 1 horizontal pull
- 1 core
```

### 6.3. Chọn bài

```text
Ứng viên
→ lọc thiết bị
→ lọc độ khó
→ lọc bài bị loại trừ
→ chấm điểm mục tiêu
→ chấm điểm sở thích
→ kiểm tra cân bằng
→ kiểm tra thời lượng
→ tạo workout
```

### 6.4. Thay đổi nhanh

Người dùng có thể chọn:

- Hôm nay chỉ có 30 phút.
- Hôm nay tập tại nhà.
- Thiết bị này đang bận.
- Tôi không thích bài này.
- Bài này quá khó.

Hệ thống tạo lại phần bị ảnh hưởng, không xóa toàn bộ kế hoạch.

## 7. Smart Progression

Áp dụng double progression:

```text
Khoảng mục tiêu: 8–12 rep

Đạt toàn bộ 12 rep trong hai buổi
→ tăng mức tạ

Đạt 8–11 rep
→ giữ mức tạ và tăng dần rep

Không đạt 8 rep
→ giữ hoặc giảm nhẹ

Đánh giá quá dễ
→ tăng nhanh hơn

Đánh giá quá khó
→ giữ hoặc giảm

Không thích
→ đổi sang bài cùng replacement group
```

Mọi đề xuất đều phải có lý do và nút từ chối.

## 8. AI trong phạm vi đồ án

### 8.1. Phần chính

Phần recommendation chính là:

> **Knowledge-based và content-based recommendation system.**

Đây là phần có thể kiểm thử, giải thích và đánh giá được.

### 8.2. AI bổ sung

Nếu còn thời gian, thêm LLM cho:

- Viết giải thích recommendation.
- Tóm tắt tiến bộ hàng tuần.
- Phân loại feedback tự do.
- Hỏi đáp dựa trên exercise library đã duyệt.

LLM không được:

- Tự tạo exercise ID.
- Chẩn đoán chấn thương.
- Bỏ qua rule.
- Thay đổi plan mà không xác nhận.

## 9. Backend cần nâng cấp

### 9.1. Mobile authentication

- Device session.
- Access token ngắn hạn.
- Refresh token rotation.
- Secure token storage.
- Revoke từng thiết bị.
- Biometric hoặc PIN cho thao tác Admin nhạy cảm.

### 9.2. API

- Thêm `/api/v1`.
- OpenAPI hoặc Swagger.
- Chuẩn hóa response.
- Chuẩn hóa camelCase hoặc snake_case.
- Idempotency key cho offline sync.
- Pagination và filter thống nhất.

### 9.3. Notification

- Lưu device token.
- Push notification.
- Deep link vào chat, request hoặc màn hình moderation.

### 9.4. Upload

- Avatar.
- Chứng chỉ.
- Exercise media.
- Giới hạn loại và dung lượng file.

### 9.5. Reliability

- Test không phụ thuộc Redis của máy developer.
- Cập nhật dependency có cảnh báo bảo mật.
- Chuẩn hóa formatting.
- Bổ sung Flutter tests.
- Integration test PostgreSQL và Redis.

## 10. Cơ sở dữ liệu cần bổ sung

```text
user_training_profiles
user_available_equipments
user_exercise_preferences

exercise_metadata
exercise_replacement_groups

program_templates
program_template_days
program_template_slots

recommendation_runs
recommendation_items
recommendation_feedback

trainer_plan_assignments
trainer_workout_comments

user_devices
sync_operations
```

Workout log bổ sung:

```text
difficulty_feedback
rpe
client_operation_id
synced_at
```

Các giá trị chiều cao, cân nặng và giới tính không nên tự tạo mặc định nếu người dùng chưa cung cấp.

## 11. Lộ trình 16 tuần

| Thời gian | Công việc | Kết quả |
| --- | --- | --- |
| Tuần 1–2 | Ổn định backend, test, API versioning, OpenAPI, migration | Backend sẵn sàng cho Flutter |
| Tuần 3–4 | Flutter foundation, auth, role navigation, responsive layout | User, Trainer và Admin đăng nhập được |
| Tuần 5–6 | Onboarding, profile, exercise library và detail | Hoàn thành luồng khám phá bài tập |
| Tuần 7–8 | Workout plan, Today Workout và plan editor | Tạo và chỉnh chương trình trên mobile |
| Tuần 9–10 | Live workout, timer, resume và offline draft | Hoàn thành một buổi tập thực tế |
| Tuần 11–12 | Recommendation, substitution và progression | Kế hoạch tự điều chỉnh có giải thích |
| Tuần 13 | Trainer clients, assign plan, comment và chat | Hoàn thành luồng Trainer |
| Tuần 14 | Admin moderation, users, certificates và audit | Hoàn thành luồng Admin |
| Tuần 15 | Flutter Web responsive, push và deep links | Đồng bộ đa nền tảng |
| Tuần 16 | E2E, usability test, sửa lỗi và deploy | Sẵn sàng demo và bảo vệ |

Nếu tiến độ chậm, ưu tiên User và Recommendation; rút gọn Trainer analytics, Admin email logs và AI explanation.

## 12. Phân chia phạm vi

### 12.1. Graduation MVP bắt buộc

- Một Flutter app đa role.
- Android và Flutter Web.
- Onboarding.
- Exercise library.
- Ba program template.
- Today Workout.
- Live workout logger.
- Resume session.
- Smart progression.
- Exercise substitution.
- Progress analytics.
- Trainer giao plan và nhận xét.
- Admin duyệt bài và chứng chỉ.
- Unit, widget và E2E tests.

### 12.2. Stretch goals

- iOS.
- Push notification.
- Offline sync hoàn chỉnh.
- LLM explanation.
- Weekly AI summary.
- Biometric Admin.
- Chia sẻ thành tích.

### 12.3. Sau đồ án

- Social feed.
- Nutrition.
- Wearable.
- Camera posture.
- Payment.
- Marketplace.
- Collaborative filtering.
- Deep-learning recommendation.

## 13. Tiêu chí đánh giá

### 13.1. UX

- Onboarding dưới 2 phút.
- Bắt đầu workout trong tối đa 2 thao tác.
- Ghi set trong 1–2 thao tác.
- Khôi phục được session sau khi app bị đóng.
- Responsive tốt trên mobile, tablet và web.
- Thử nghiệm với 10–15 người dùng beginner.
- Thu thập SUS và phỏng vấn ngắn.

### 13.2. Recommendation

- Không đề xuất thiết bị người dùng không có.
- Không đề xuất bài bị loại trừ.
- Không vượt thời lượng quá mức cho phép.
- 100% recommendation có lý do.
- So sánh với baseline chọn bài theo nhóm cơ.
- Đánh giá mức phù hợp bởi Trainer.
- Đo tỷ lệ người dùng chấp nhận hoặc đổi bài.

### 13.3. Kỹ thuật

- Các service quan trọng có unit test.
- Có E2E cho auth, tạo plan, workout, Trainer và Admin.
- Không tạo log trùng khi đồng bộ.
- Phân quyền được kiểm tra tại backend.
- Không có lỗi build, lint hoặc test trong pipeline.

## 14. Phạm vi chốt

Tên định hướng phù hợp:

> **FiFB Mobile First Adaptive Fitness Platform for Beginner Gym Users**

Sản phẩm cuối là một ứng dụng Flutter đa nền tảng, đa vai trò, trong đó phần được đầu tư sâu nhất là:

1. Onboarding.
2. Tạo chương trình beginner.
3. Today Workout.
4. Live workout logger.
5. Exercise substitution.
6. Smart progression.
7. Trainer feedback.
8. Admin moderation.

Đây là phạm vi đủ phức tạp cho đồ án, tận dụng gần như toàn bộ backend hiện có, nhưng không chứa các chức năng không phục vụ trực tiếp trải nghiệm tập luyện.

## 15. Nguồn tham khảo sản phẩm

- [Nike Training Club](https://www.nike.com/help/a/ntc-info/app)
- [Strong](https://www.strong.app/)
- [Hevy](https://www.hevyapp.com/features/)
- [Fitbod](https://help.fitbod.me/hc/en-us/sections/360001078993-How-Fitbod-Works)
- [Liftosaur](https://www.liftosaur.com/)
- [wger Flutter](https://github.com/wger-project/flutter)
- [Workout.cool](https://github.com/Snouzy/workout-cool)
