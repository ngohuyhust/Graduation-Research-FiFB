# Kế hoạch phát triển cuối cho FiFB

## 1. Định hướng sản phẩm

> **FiFB là nền tảng fitness mobile-first dành cho người mới, cá nhân hoá chương trình theo mục tiêu và điều kiện tập, hỗ trợ ghi workout và điều chỉnh dựa trên kết quả thực tế.**

Một Flutter codebase phục vụ hai vai trò:

- User.
- Admin.

Nền tảng triển khai:

- Android là sản phẩm chính.
- iOS có thể build từ cùng codebase.
- Flutter Web cung cấp giao diện màn hình lớn.
- Tái sử dụng NestJS, PostgreSQL và Redis hiện có; Socket.IO không phải thành phần bắt buộc khi không triển khai chat.

Người tập có thể hoàn thành 100% hành trình trên mobile. Web chỉ là một lựa chọn bổ sung, không phải điều kiện bắt buộc.

Phạm vi GR2 không triển khai vai trò huấn luyện viên, kết nối học viên, giao plan, chứng chỉ hoặc chat. Các mô-đun cũ trong repository không phải yêu cầu cần chuyển sang Flutter; việc loại khỏi kế hoạch không đồng nghĩa xóa mã nguồn hoặc dữ liệu hiện có.

## 2. Kiến trúc tổng thể

```text
Flutter Application
├── User Shell
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
        ├── Admin
        └── Notifications
                │
       ┌────────┐
       ▼        ▼
 PostgreSQL   Redis
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

### 3.4. Chất lượng dữ liệu và kiểm chứng cá nhân hoá

Cá nhân hoá là vòng lặp **onboarding → đề xuất → workout log và feedback → đề xuất điều chỉnh**. Mỗi đề xuất phải truy vết được dữ liệu và rule đã sử dụng; người dùng giữ quyền chỉnh sửa hoặc từ chối.

Đầu tư vào dữ liệu bài tập cốt lõi, template, kiểm thử nhiều hồ sơ và đánh giá mức phù hợp thay vì mở rộng nghiệp vụ nhiều vai trò.

Admin có thể:

- Quản lý tài khoản.
- Duyệt bài tập.
- Quản lý taxonomy.
- Xem audit log.
- Kiểm tra nội dung recommendation.
- Kiểm duyệt template cốt lõi và quản lý phiên bản rule cá nhân hoá; chưa cần trình chỉnh sửa rule phức tạp.

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
- Đánh giá độ khó, ghi sở thích và nhận giải thích cho đề xuất điều chỉnh.

#### Có thể bổ sung

- Huy hiệu.
- Streak.
- Nhắc lịch tập.
- Chia sẻ kết quả dưới dạng ảnh.

### 4.2. Admin

#### Bắt buộc

- Dashboard.
- User management.
- Khóa, mở khóa và vô hiệu hóa tài khoản.
- Exercise moderation.
- Audit logs.
- Quản lý taxonomy.
- Kiểm duyệt template và theo dõi phiên bản rule cá nhân hoá.

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

### 5.2. Admin

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

### 6.5. Chấm điểm và học từ phản hồi

- Ràng buộc thiết bị, bài bị loại trừ và mức khó được kiểm tra trước khi xếp hạng; điểm cao không được ghi đè ràng buộc.
- Trọng số ban đầu là tham số ở cấp tiêu chí, không phải nhập điểm thủ công cho từng bài. Giải thích giả định, phiên bản hoá và hiệu chỉnh bằng các hồ sơ thử nghiệm cùng góp ý của người có chuyên môn.
- Xếp hạng dựa trên metadata đã duyệt, độ phù hợp mục tiêu, sở thích và lịch sử cá nhân; dùng tie-break ổn định để tái hiện kết quả.
- Feedback dễ/khó và thích/không thích cập nhật hồ sơ cá nhân và gợi ý lần sau; không gọi đây là mô hình học máy nếu chỉ dùng rule.
- Nếu không đủ ứng viên hợp lệ hoặc thời lượng không khả thi, thông báo ràng buộc cần điều chỉnh; không âm thầm bỏ qua điều kiện.
- Lưu input, phiên bản rule, lý do chọn/loại và phản hồi để đánh giá chất lượng recommendation.

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
- Nhắc lịch tập và deep link vào workout hoặc màn hình moderation; là phần bổ sung theo tiến độ.

### 9.4. Upload

- Avatar.
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
| Tuần 3–4 | Flutter foundation, auth, role navigation, responsive layout | User và Admin đăng nhập được |
| Tuần 5–6 | Onboarding, profile, exercise library và detail | Hoàn thành luồng khám phá bài tập |
| Tuần 7–8 | Workout plan, Today Workout và plan editor | Tạo và chỉnh chương trình trên mobile |
| Tuần 9–10 | Live workout, timer, resume và offline draft | Hoàn thành một buổi tập thực tế |
| Tuần 11–12 | Recommendation, substitution và progression | Kế hoạch tự điều chỉnh có giải thích |
| Tuần 13 | Hiệu chỉnh scoring, feedback, kiểm thử hồ sơ và trường hợp thiếu ứng viên | Cá nhân hoá có giải thích và đo được mức phù hợp |
| Tuần 14 | Admin bài tập/taxonomy, kiểm duyệt template, users và audit tối thiểu | Bảo đảm chất lượng dữ liệu đầu vào |
| Tuần 15 | Flutter Web responsive, push và deep links | Đồng bộ đa nền tảng |
| Tuần 16 | E2E, usability test, sửa lỗi và deploy | Sẵn sàng demo và bảo vệ |

Nếu tiến độ chậm, giữ User, Recommendation và chất lượng workout; rút gọn dashboard Admin, push/deep links và AI explanation. Không bổ sung luồng nhiều vai trò trước khi các tác vụ chính ổn định.

## 12. Phân chia phạm vi

### 12.1. Graduation MVP bắt buộc

- Một Flutter app cho User và Admin.
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
- Feedback cá nhân và lý do recommendation có thể truy vết.
- Admin quản lý bài tập, taxonomy và template cốt lõi.
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
- Đánh giá mức phù hợp bằng bộ hồ sơ mẫu và phản biện của người có chuyên môn; không yêu cầu vai trò chuyên gia trong ứng dụng.
- Đo tỷ lệ người dùng chấp nhận hoặc đổi bài.

### 13.3. Kỹ thuật

- Các service quan trọng có unit test.
- Có E2E cho auth, onboarding, tạo plan, workout, feedback/progression và Admin.
- Không tạo log trùng khi đồng bộ.
- Phân quyền được kiểm tra tại backend.
- Không có lỗi build, lint hoặc test trong pipeline.

## 14. Phạm vi chốt

Tên định hướng phù hợp:

> **FiFB Mobile First Adaptive Fitness Platform for Beginner Gym Users**

Sản phẩm cuối là một ứng dụng Flutter đa nền tảng, tập trung vào hành trình tập luyện cá nhân, trong đó phần được đầu tư sâu nhất là:

1. Onboarding.
2. Tạo chương trình beginner.
3. Today Workout.
4. Live workout logger.
5. Exercise substitution.
6. Smart progression.
7. Phản hồi cá nhân và kiểm chứng mức phù hợp của đề xuất.
8. Admin moderation.

Phạm vi tận dụng các mô-đun tài khoản, bài tập, plan, session và thống kê hiện có; độ sâu của đồ án nằm ở vòng lặp cá nhân hoá có thể kiểm chứng và trải nghiệm ghi buổi tập, không ở số lượng vai trò.

## 15. Nguồn tham khảo sản phẩm

- [Nike Training Club](https://www.nike.com/help/a/ntc-info/app)
- [Strong](https://www.strong.app/)
- [Hevy](https://www.hevyapp.com/features/)
- [Fitbod](https://help.fitbod.me/hc/en-us/sections/360001078993-How-Fitbod-Works)
- [Liftosaur](https://www.liftosaur.com/)
- [wger Flutter](https://github.com/wger-project/flutter)
- [Workout.cool](https://github.com/Snouzy/workout-cool)

## 16. Giai đoạn tiếp theo: Nhật ký tập luyện và trạng thái cơ thể

### 16.1. Vị trí trong kế hoạch

Phần này được triển khai **sau khi hoàn thành và kiểm chứng phạm vi nền tảng tại các mục 1–14**, tiếp nối lộ trình 16 tuần ở mục 11. Đây là hướng mở rộng tiếp theo, không bổ sung yêu cầu bắt buộc vào Graduation MVP và không thay thế các chức năng đã chốt về Recommendation, Smart Progression hoặc Admin.

Chỉ bắt đầu khi luồng tạo plan, ghi workout, khôi phục session, lịch sử và thống kê đã hoạt động ổn định. Nếu chưa đủ thời gian trong đồ án, giữ phần này làm kế hoạch phát triển sau đồ án.

### 16.2. Định hướng sản phẩm và giá trị sử dụng

> **FiFB mở rộng thành ứng dụng ghi lại quá trình tập luyện và cảm nhận cơ thể hằng ngày, giúp người dùng biết mình đã tập gì, đang cảm thấy thế nào và quá trình tập đang thay đổi ra sao.**

Người dùng có thể tự tìm hiểu bài tập, dùng chương trình của mình hoặc nhận plan cá nhân hoá từ hệ thống. Nhật ký hoạt động với cả chương trình tự tạo và chương trình được đề xuất.

Các nhu cầu chính:

- Nhớ bài tập, mức tạ và kết quả buổi trước.
- Xem nhóm cơ nào đã được tập gần đây.
- Ghi nhận vùng cơ thể đang ê, đau hoặc khó chịu.
- Xem cảm nhận cơ thể thay đổi thế nào sau các buổi tập.
- Xem lại lịch sử riêng tư của bản thân trong cùng ứng dụng.

Trọng tâm là liên kết **workout log → nhóm cơ liên quan → check-in → timeline**, giúp người dùng theo dõi thuận tiện hơn. Chạy bộ và các hoạt động khác sẽ được bổ sung ở giai đoạn xa hơn.

### 16.3. Phân biệt dữ liệu tập và cảm nhận cơ thể

| Thông tin | Nguồn dữ liệu | Cách hiển thị |
| --- | --- | --- |
| Nhóm cơ đã được tập | Workout log và mapping cơ chính/cơ phụ của bài tập | Bài, số set, lần tập gần nhất |
| Vùng đang ê hoặc khó chịu | Người dùng tự ghi nhận trong check-in | Vị trí, mức cảm nhận, thời điểm và ghi chú |
| Vùng chưa có check-in | Thiếu dữ liệu người dùng | “Chưa ghi nhận”, không tự coi là “không đau” |
| Mức độ hồi phục | Chưa có mô hình được kiểm chứng | Không hiển thị phần trăm hồi phục hay khẳng định sẵn sàng tập |

Việc một nhóm cơ được tập không chứng minh nhóm cơ đó đang đau. Cảm nhận đau/ê cũng không tự xác định nguyên nhân hoặc chấn thương. Theo dõi cảm nhận và lịch sử tập phải được trình bày riêng, không biến thời gian từ buổi tập thành kết luận y khoa.

Không dùng hệ số tùy ý để quy đổi set cơ phụ thành mức tải sinh lý chính xác. Nếu tổng hợp số set theo cơ, phải nêu rõ đó là số set có cơ được gắn nhãn chính hoặc phụ; một set có thể liên quan nhiều nhóm cơ.

### 16.4. Chức năng cốt lõi của giai đoạn mở rộng

#### A. Nhật ký tập luyện

- Kế thừa workout logger, rest timer, kết quả buổi trước và resume session đã xây ở giai đoạn nền tảng.
- Bổ sung cảm nhận cuối buổi: nhẹ, vừa hoặc nặng; ghi chú tùy chọn.
- Khi sửa/xóa log, cập nhật lại dữ liệu nhóm cơ và thống kê liên quan.
- Không yêu cầu người dùng nhập lại thông tin bài, cơ hoặc thiết bị đã có trong workout.

#### B. Body map tương tác

- Hiển thị cơ thể mặt trước và mặt sau; hỗ trợ vùng trái/phải khi phù hợp.
- Chạm vào vùng cơ thể để xem bài đã tập, số set liên quan, lần tập gần nhất và check-in.
- Có hai chế độ riêng: **“Đã tập”** và **“Cảm nhận”**, với chú giải rõ ràng.
- Chế độ “Đã tập” thể hiện hoạt động trong khoảng ngày người dùng chọn, không gắn màu với kết luận đau hay hồi phục.
- Chế độ “Cảm nhận” chỉ thể hiện dữ liệu người dùng đã ghi; luôn hiển thị ngày check-in để tránh coi dữ liệu cũ là trạng thái hiện tại.
- Cung cấp danh sách vùng cơ thể tương đương để sử dụng thuận tiện trên màn hình nhỏ hoặc khi không thao tác được trên hình.

#### C. Check-in hằng ngày

- Mục tiêu thao tác khoảng 20–30 giây.
- Ghi mức năng lượng bằng các lựa chọn đơn giản.
- Chọn vùng đang ê/khó chịu và mức cảm nhận: không ê, nhẹ, vừa hoặc nhiều.
- Ghi chú tự do tùy chọn; không tự phân loại mọi cảm giác thành đau cơ sau tập.
- Giấc ngủ và cân nặng là trường tùy chọn, không yêu cầu nhập đủ mỗi ngày.
- Gợi ý các nhóm cơ vừa tập để giảm thao tác, đồng thời cho phép chọn vùng khác.
- Cho phép chỉnh sửa/xóa check-in và phân biệt rõ ngày chưa ghi với ngày chủ động ghi “không ê”.

#### D. Timeline và báo cáo

- Liên kết buổi tập với các check-in theo thời gian; cho phép lọc theo vùng cơ thể hoặc khoảng ngày.
- Xem một buổi tập cùng các cảm nhận sau đó, hoặc xem lịch sử riêng của một vùng.
- Kế thừa biểu đồ tiến bộ theo bài; bổ sung tổng hợp set theo nhóm cơ với cách đếm minh bạch.
- Hiển thị nhận xét mô tả từ dữ liệu, ví dụ: “Sau ba buổi tập chân gần nhất, bạn đều ghi nhận đùi ê nhiều vào ngày tiếp theo”.
- Không kết luận quan hệ nhân quả hoặc hiệu quả tăng cơ chỉ từ các quan sát này.
- Check-in và nhật ký cơ thể là dữ liệu cá nhân; không có luồng chia sẻ với người dùng khác trong giai đoạn này. Admin không mặc nhiên được đọc nội dung nhật ký cá nhân.

### 16.5. Dữ liệu và tích hợp dự kiến

Tái sử dụng `workout_sessions`, `session_exercise_logs`, taxonomy cơ và các API thống kê hiện có. Rà soát mapping cơ chính/cơ phụ trước khi dùng cho body map.

Các nhóm dữ liệu cần thiết kế thêm khi bắt đầu giai đoạn này:

| Nhóm dữ liệu | Nội dung chính |
| --- | --- |
| Body regions | Vùng hiển thị, vị trí trái/phải, mapping với taxonomy cơ |
| Daily check-ins | Người dùng, ngày địa phương, thời điểm ghi, năng lượng, giấc ngủ/cân nặng tùy chọn |
| Region observations | Check-in, vùng cơ thể, mức cảm nhận và ghi chú |
| Session feedback | Cảm nhận sau buổi, liên kết workout session |

Thời điểm lưu cần hỗ trợ múi giờ người dùng để workout và check-in xuất hiện đúng ngày. Thống kê phải cập nhật khi dữ liệu thay đổi; dữ liệu thiếu không được tự điền thành 0. Bảng và API cụ thể sẽ chốt ở bước thiết kế giai đoạn mở rộng, chưa đưa vào schema triển khai của giai đoạn nền tảng.

### 16.6. Thứ tự thực hiện và kiểm chứng

| Bước | Công việc | Điều kiện hoàn thành |
| --- | --- | --- |
| 1 | Prototype body map và check-in | Người thử hiểu khác biệt giữa “đã tập” và “cảm nhận”; ghi nhanh được trạng thái |
| 2 | Xây check-in, body map và liên kết workout | Xem được dữ liệu thật, phân biệt thiếu dữ liệu và lịch sử cũ |
| 3 | Timeline và báo cáo cá nhân | Xem lại được một vùng qua nhiều ngày; dữ liệu chỉ truy cập bởi chủ sở hữu |
| 4 | Thử nghiệm sử dụng trong hai tuần | Đánh giá mức thuận tiện và quyết định có tiếp tục mở rộng hay cần đơn giản hóa |

Các chỉ số đánh giá:

- Thời gian và số thao tác để hoàn thành check-in.
- Tỷ lệ ngày có check-in, có ghi nhận rõ ngày thiếu dữ liệu.
- Khả năng tìm lại buổi tập gần nhất liên quan một nhóm cơ.
- Mức độ hiểu đúng hai chế độ body map và các nhận xét trên timeline.
- Người dùng có thấy nhật ký hỗ trợ việc nhìn lại quá trình tập hay không.
- Kiểm tra tài khoản khác không đọc/sửa được check-in; quyền quản trị nội dung không cấp quyền xem nhật ký cá nhân.

Đây là đánh giá khả năng sử dụng và chất lượng dữ liệu, không phải thử nghiệm xác nhận hiệu quả điều trị hoặc độ chính xác chẩn đoán.

### 16.7. Chạy bộ và các phần mở rộng xa hơn

Chạy bộ **chưa nằm trong phạm vi triển khai của giai đoạn nhật ký cơ thể đầu tiên**. Sau khi nhật ký gym và check-in ổn định, bổ sung chạy/đi bộ như một loại hoạt động trong cùng lịch sử:

- Quãng đường, thời lượng, pace và sau đó là GPS route trên mobile.
- Pause/resume, quyền vị trí, theo dõi khi khóa màn hình và kiểm thử sai số GPS.
- Tái sử dụng check-in, body map và timeline; không tự suy ra vùng đang đau từ buổi chạy.
- Giữ chỉ số tiến bộ riêng theo môn; không cộng kilomet và kilogram thành một điểm sức khỏe chung.
- Thiết kế lớp hoạt động chung khi tích hợp đa môn, thay vì ép dữ liệu chạy vào bảng set/rep.

Wearable, theo dõi giấc ngủ tự động, dinh dưỡng và mô hình ước tính hồi phục là các phần phát triển sau. AI tóm tắt nhật ký chỉ là tùy chọn, phải dẫn lại workout/check-in liên quan và không chẩn đoán hoặc tự thay đổi plan.

Tham khảo giới hạn khi diễn đạt cảm nhận và hồi phục: [Cleveland Clinic — Delayed Onset Muscle Soreness](https://my.clevelandclinic.org/health/symptoms/delayed-onset-muscle-soreness).
