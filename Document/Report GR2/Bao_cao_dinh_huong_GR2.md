# BÁO CÁO ĐỊNH HƯỚNG NGHIÊN CỨU TỐT NGHIỆP 2 (GR2)

## Đề tài: Phát triển ứng dụng FiFB đa nền tảng hỗ trợ cá nhân hoá chương trình, ghi nhật ký và theo dõi quá trình tập luyện

**Tên dự án:** FiFB — Fitness for Beginners  
**Sinh viên thực hiện:** Ngô Đức Huy  
**Chương trình:** Global ICT  
**Thời điểm lập báo cáo:** Tháng 10 năm 2026  
**Tính chất tài liệu:** Đề xuất bài toán, mục tiêu và phạm vi phát triển GR2; không phải báo cáo kết quả nghiệm thu.

## Tóm tắt

FiFB được xây dựng từ giai đoạn GR1 nhằm cung cấp nền tảng tra cứu thông tin bài tập và quản lý nội dung. Trên cơ sở đó, GR2 hướng đến phát triển ứng dụng Flutter tập trung vào hành trình tập luyện cá nhân: tiếp nhận nhu cầu, đề xuất chương trình, ghi nhận kết quả từng buổi và điều chỉnh dựa trên phản hồi. Android là nền tảng sử dụng chính; Flutter Web cung cấp lựa chọn truy cập trên trình duyệt từ cùng cơ sở mã nguồn. Hệ thống gồm Người dùng và Quản trị viên, trong đó vai trò quản trị giới hạn ở quản lý tài khoản và chất lượng dữ liệu đầu vào.

Đề tài tập trung giải quyết sự bất tiện khi người dùng phải tự kết nối thông tin bài tập, chương trình dự kiến và kết quả thực tế. Hệ thống đề xuất chương trình dựa trên dữ liệu bài tập đã kiểm duyệt, các ràng buộc do người dùng cung cấp và phản hồi trong quá trình sử dụng. Sau khi hoàn thành phạm vi nền tảng, FiFB dự kiến bổ sung nhật ký trạng thái cơ thể gồm check-in hằng ngày, bản đồ cơ thể và dòng thời gian liên kết cảm nhận với lịch sử tập. Chạy bộ và các môn khác được đặt ở giai đoạn phát triển xa hơn.

## 1. Bài toán

### 1.1. Bối cảnh và sự kế thừa từ GR1

Người tập có thể tiếp cận hướng dẫn động tác và chương trình tập từ nhiều nguồn trực tuyến. Tuy nhiên, khả năng tìm được thông tin không đồng nghĩa với việc có một quy trình thuận tiện để áp dụng, ghi nhận và xem lại kết quả theo thời gian. Người dùng vẫn cần chuyển một chương trình thành các buổi tập cụ thể, điều chỉnh khi thiết bị không sẵn có, nhớ kết quả buổi trước và lưu những thay đổi trong quá trình thực hiện.

Trong báo cáo GR1, FiFB tập trung vào nền tảng web, dữ liệu bài tập có cấu trúc, phân quyền và quy trình kiểm duyệt nội dung. GR2 tái sử dụng các mô-đun tài khoản, bài tập, workout plan, workout session và thống kê để phát triển giao diện mobile và mở rộng chức năng cá nhân hoá. Chỉ những mô-đun phục vụ phạm vi này cần được tích hợp vào ứng dụng mới. Sự tồn tại của mô-đun backend chưa được xem là bằng chứng rằng toàn bộ hành trình sử dụng trên Flutter đã hoàn thành.

GR2 chuyển trọng tâm sang quá trình sử dụng khi tập luyện. Thư viện bài tập vẫn là nguồn dữ liệu quan trọng, nhưng cần được kết nối với chương trình cá nhân, kết quả thực hiện và các chức năng hỗ trợ thao tác tại buổi tập.

### 1.2. Những khó khăn cần giải quyết

**Thứ nhất, thiếu sự liên kết giữa kế hoạch và kết quả thực tế.** Người dùng có thể lưu một chương trình nhưng vẫn phải tự nhớ bài đã thực hiện, số set, số lần lặp và mức tạ. Khi dữ liệu được ghi ở nhiều nơi hoặc không được ghi đều, việc đối chiếu các buổi tập trở nên bất tiện. Hệ thống cần phân biệt chỉ tiêu dự kiến trong plan với kết quả thực tế trong workout log.

**Thứ hai, thao tác ghi nhận trong lúc tập cần ngắn gọn.** Người dùng thường chỉ tương tác với điện thoại trong khoảng nghỉ giữa các set. Các biểu mẫu dài hoặc phải nhập lại thông tin đã có làm tăng công sức ghi chép. Việc ứng dụng bị đóng, mất kết nối hoặc chuyển sang nền cũng có thể làm gián đoạn buổi đang ghi. Vì vậy, xem kết quả buổi trước, sao chép dữ liệu, rest timer và khôi phục session là những yêu cầu trực tiếp của trải nghiệm sử dụng.

**Thứ ba, chương trình cần phù hợp với hoàn cảnh cá nhân.** Một chương trình chung có thể không phù hợp số ngày rảnh, thời lượng mỗi buổi, thiết bị hoặc trình độ người dùng. Khi một bài quá khó, không được ưa thích hoặc thiết bị đang bận, người dùng cần phương án thay thế có thể giải thích được. Đề tài cần một cơ chế đề xuất có ràng buộc và có quyền xác nhận của người dùng.

**Thứ tư, kết quả tập cần được trình bày thành thông tin dễ xem lại.** Danh sách log riêng lẻ chưa đủ thuận tiện để theo dõi thay đổi qua nhiều buổi. Người dùng cần xem lịch sử theo bài, mức tạ và số rep đã thực hiện, số buổi hoàn thành và phân bố hoạt động theo thời gian. Các chỉ số phải có định nghĩa rõ ràng để tránh diễn giải mức tạ lớn hơn hoặc volume cao hơn thành kết luận tổng quát về sức khỏe.

**Thứ năm, định hướng dài hạn cần kết nối nhật ký tập với cảm nhận cơ thể.** Người dùng có thể muốn nhớ vùng đang ê hoặc khó chịu và xem cảm nhận thay đổi sau các buổi tập. Dữ liệu bài tập chỉ cho biết các nhóm cơ được gắn nhãn liên quan; cảm nhận thực tế cần người dùng tự ghi nhận. Đây là bài toán mở rộng tiếp theo, được triển khai sau phạm vi nền tảng và chưa trở thành yêu cầu bắt buộc của giai đoạn đầu GR2.

Các khó khăn trên được sử dụng làm giả thuyết thiết kế sản phẩm. Báo cáo không xem chúng là kết quả khảo sát người dùng đã được xác nhận. Quá trình phát triển cần có thử nghiệm tác vụ và thu thập phản hồi để kiểm chứng mức độ phù hợp.

### 1.3. Phát biểu bài toán

Đề tài đặt ra bài toán xây dựng một ứng dụng đa nền tảng cho phép người dùng hoàn thành hành trình từ xác định nhu cầu tập, lựa chọn chương trình, thực hiện buổi tập đến ghi nhận và theo dõi kết quả trong cùng hệ thống. Trọng tâm là vòng lặp cá nhân hoá từ onboarding đến đề xuất, kết quả workout và phản hồi, sau đó đưa ra điều chỉnh có lý do. Nền tảng ưu tiên thao tác trên thiết bị di động, tái sử dụng backend hiện có và tách quyền quản trị nội dung khỏi quyền truy cập dữ liệu cá nhân.

Đầu vào chính bao gồm dữ liệu bài tập đã được chuẩn hóa, thông tin onboarding, chương trình tự tạo hoặc được hệ thống đề xuất, kết quả từng set và phản hồi người dùng. Hệ thống xử lý các ràng buộc, đề xuất bài phù hợp cho từng vị trí trong chương trình, lưu lịch sử thực hiện và tổng hợp kết quả. Đầu ra gồm chương trình có thể chỉnh sửa, màn hình workout, lịch sử, thống kê và đề xuất điều chỉnh có lý do.

Đối với giai đoạn tiếp theo, đầu vào được bổ sung check-in trạng thái cơ thể do người dùng ghi. Hệ thống liên kết check-in với lịch sử theo thời gian để hỗ trợ xem lại, không suy diễn thành chẩn đoán hoặc kết luận nguyên nhân đau.

### 1.4. Đối tượng và tình huống sử dụng

Đối tượng chính là người mới hoặc người đang hình thành thói quen tập sức mạnh, có nhu cầu lập kế hoạch và ghi kết quả bằng điện thoại. Người đã có chương trình riêng vẫn có thể sử dụng chức năng nhật ký. Quản trị viên quản lý tài khoản, dữ liệu bài tập, taxonomy và template đã kiểm duyệt; đây là vai trò hỗ trợ chất lượng nội dung, không phải đối tượng trọng tâm của trải nghiệm sản phẩm.

Một tình huống sử dụng điển hình là người dùng khai báo lịch tập và thiết bị, nhận hoặc tạo chương trình, mở workout của ngày hiện tại, xem kết quả buổi trước, ghi các set và đổi bài khi cần. Sau buổi tập, người dùng xem kết quả tổng hợp và lựa chọn có chấp nhận đề xuất điều chỉnh cho lần tiếp theo hay không. Trong giai đoạn mở rộng, người dùng có thể ghi thêm cảm nhận cơ thể và xem chúng trên dòng thời gian cùng các buổi tập.

### 1.5. Ý nghĩa và đóng góp dự kiến

Đóng góp chính của đề tài là xây dựng và đánh giá một hành trình sử dụng thống nhất giữa lập kế hoạch cá nhân, ghi workout, theo dõi tiến bộ và điều chỉnh chương trình dựa trên phản hồi. Đóng góp kỹ thuật gồm chuyển giao diện sang Flutter, tái sử dụng dịch vụ backend, bổ sung hệ thống đề xuất có thể giải thích và bảo đảm tính nhất quán của nhật ký khi khôi phục hoặc đồng bộ dữ liệu.

Đề tài không khẳng định các chức năng riêng lẻ là mới trên thị trường hoặc một thuật toán đề xuất mới đã được chứng minh. Giá trị được đánh giá qua chất lượng tích hợp, độ thuận tiện khi sử dụng, mức phù hợp của chương trình và khả năng kiểm chứng kết quả. Định hướng nhật ký cơ thể tạo thêm góc phát triển sản phẩm bằng cách liên kết cảm nhận cá nhân với dữ liệu buổi tập, nhưng cần thử nghiệm riêng trước khi mở rộng.

## 2. Mục tiêu

### 2.1. Mục tiêu tổng quát

Phát triển FiFB từ nền tảng web hiện có thành ứng dụng Flutter đa nền tảng, ưu tiên Android, hỗ trợ người dùng lập kế hoạch cá nhân, thực hiện, ghi nhận và theo dõi quá trình tập luyện. Hệ thống phải cung cấp trải nghiệm thao tác thuận tiện và đề xuất chương trình dựa trên mục tiêu, trình độ, lịch, thiết bị và phản hồi. Quản trị nội dung được giữ ở mức cần thiết để bảo đảm chất lượng bài tập và template.

Sau khi phạm vi trên đạt yêu cầu, nghiên cứu phát triển nhật ký trạng thái cơ thể hằng ngày để người dùng xem lại mối liên hệ theo thời gian giữa hoạt động đã ghi và cảm nhận cá nhân.

### 2.2. Mục tiêu cụ thể

1. **Hoàn thiện trải nghiệm đa nền tảng:** xây dựng một ứng dụng Flutter phục vụ Người dùng và Quản trị viên; người tập hoàn thành hành trình chính trên Android, đồng thời truy cập được các chức năng phù hợp trên Flutter Web.
2. **Hỗ trợ xây dựng chương trình cá nhân:** thu thập thông tin onboarding và sử dụng template đã kiểm duyệt để đề xuất chương trình phù hợp trình độ, thiết bị, lịch và thời lượng. Người dùng được xem lý do, chỉnh sửa và từ chối đề xuất.
3. **Hoàn thiện nhật ký buổi tập:** ghi kết quả set, rep và mức tạ; xem dữ liệu buổi trước; sử dụng rest timer; đổi bài; tạm dừng, tiếp tục và khôi phục session. Lưu draft khi mất kết nối để hạn chế mất dữ liệu.
4. **Theo dõi tiến bộ và hỗ trợ điều chỉnh:** cung cấp lịch sử, biểu đồ và thống kê có định nghĩa rõ ràng; bổ sung Smart Progression dựa trên rule, kết quả thực hiện và phản hồi. Phân biệt chức năng xem lịch sử progression hiện có với chức năng đề xuất tăng tiến cần phát triển.
5. **Bảo đảm chất lượng dữ liệu cá nhân hoá:** chuẩn hoá metadata bài tập và template cốt lõi; Admin kiểm duyệt nội dung và quản lý phiên bản rule. Lưu đầu vào, lý do chọn/loại và phản hồi để truy vết đề xuất, không yêu cầu nhập trọng số riêng cho từng bài.
6. **Kiểm chứng chất lượng phần mềm và trải nghiệm:** đánh giá chức năng, phân quyền, tính nhất quán dữ liệu, khả năng khôi phục, mức phù hợp của recommendation và độ thuận tiện của các tác vụ chính.
7. **Phát triển tiếp nhật ký cơ thể khi nền tảng ổn định:** bổ sung body map, check-in và timeline cá nhân; phân biệt dữ liệu đã tập, cảm nhận tự khai báo và dữ liệu chưa được ghi nhận. Dữ liệu này không có luồng chia sẻ với tài khoản khác trong giai đoạn đầu.

Mục tiêu 1–6 thuộc giai đoạn nền tảng GR2. Mục tiêu 7 là giai đoạn tiếp nối và không phải điều kiện hoàn thành bắt buộc của phạm vi nền tảng.

### 2.3. Cách đánh giá mức đạt mục tiêu

| Nhóm mục tiêu | Tiêu chí dự kiến | Phương pháp kiểm chứng |
| --- | --- | --- |
| Trải nghiệm | Onboarding dưới 2 phút; bắt đầu workout tối đa 2 thao tác; ghi set trong 1–2 thao tác ở luồng thông thường đã có dữ liệu | Quan sát thực hiện tác vụ, ghi thời gian và số thao tác |
| Nhật ký | Khôi phục session sau khi đóng app; lưu draft; không tạo log trùng trong các kịch bản đồng bộ được hỗ trợ | Kiểm thử tình huống đóng app, mất mạng và gửi lại thao tác |
| Recommendation | Không vi phạm ràng buộc bắt buộc; mọi đề xuất có lý do; kiểm tra thời lượng dự kiến và tình huống thiếu ứng viên | Bộ hồ sơ mẫu, kiểm thử rule và phản biện của người có chuyên môn |
| Chất lượng đề xuất | So sánh với baseline chọn theo nhóm cơ, trong cùng tập ứng viên hợp lệ và điều kiện thử nghiệm | Đánh giá mức phù hợp, ghi tỷ lệ chấp nhận/đổi bài; tách tập hiệu chỉnh khỏi tập đánh giá |
| Theo dõi tiến bộ | Kết quả tổng hợp khớp log và thay đổi đúng khi dữ liệu được chỉnh sửa | Kiểm thử dữ liệu mẫu và đối chiếu công thức |
| Phân quyền | Tài khoản khác không truy cập nhật ký cá nhân; quyền quản trị nội dung không mặc nhiên cấp quyền đọc nhật ký | Kiểm thử truy cập hợp lệ và truy cập trái quyền |
| Đánh giá sử dụng | Thu thập phản hồi của khoảng 10–15 người dùng, sử dụng SUS và phỏng vấn ngắn | Thử nghiệm tác vụ trên bản triển khai; báo cáo cỡ mẫu và giới hạn |
| Nhật ký cơ thể, nếu triển khai | Check-in khoảng 20–30 giây; hiểu đúng hai chế độ body map; dữ liệu thiếu không bị coi là không đau | Prototype và thử nghiệm sử dụng trong hai tuần |

Các thời gian và số thao tác trong bảng là mục tiêu thiết kế, chưa phải số liệu đo được. Thử nghiệm quy mô nhỏ đánh giá tính khả dụng và chất lượng phần mềm, không chứng minh hiệu quả sức khỏe hoặc độ chính xác chẩn đoán.

## 3. Phạm vi

### 3.1. Nguyên tắc phân chia

Phạm vi được phân thành ba mức: nền tảng bắt buộc của GR2, giai đoạn tiếp nối về nhật ký cơ thể và định hướng tương lai. Việc phân chia nhằm bảo đảm khả năng hoàn thành một hành trình sử dụng ổn định trước khi bổ sung loại dữ liệu hoặc môn thể thao mới.

| Mức | Trọng tâm | Trạng thái cam kết |
| --- | --- | --- |
| A — Nền tảng GR2 | Flutter, onboarding, plan, workout logger, recommendation, feedback, progression và quản trị nội dung tối thiểu | Phạm vi triển khai chính |
| B — Giai đoạn tiếp nối | Nhật ký trạng thái cơ thể, body map, check-in và timeline | Thực hiện sau A; nếu không đủ thời gian, chuyển sang sau đồ án |
| C — Tương lai | Chạy bộ, đa môn, wearable và các chức năng phân tích chuyên sâu | Chưa triển khai trong phạm vi bắt buộc |

### 3.2. Phạm vi chức năng nền tảng GR2

#### 3.2.1. Chức năng Người dùng

- Đăng ký, xác minh email, đăng nhập, khôi phục mật khẩu và quản lý hồ sơ.
- Onboarding về mục tiêu, trình độ, lịch tập, thời lượng, địa điểm, thiết bị, sở thích và các hạn chế cần lưu ý.
- Tra cứu thư viện bài tập, tìm kiếm/lọc, xem hướng dẫn và hình minh họa, lưu bài yêu thích.
- Tạo/chỉnh sửa workout plan thủ công hoặc nhận chương trình đề xuất.
- Xem workout hôm nay, ghi set, rep, mức tạ và ghi chú; xem kết quả buổi trước; rest timer; đổi bài tương đương.
- Tạm dừng, tiếp tục và khôi phục session; lưu draft khi mất mạng. Đồng bộ offline hoàn chỉnh được xem là phần bổ sung, không mặc định cam kết mọi tình huống offline.
- Xem lịch sử và thống kê; nhận đề xuất Smart Progression có lý do và quyền từ chối.
- Ghi phản hồi dễ/khó, thích/không thích; chỉnh sở thích và điều kiện tập để hệ thống đề xuất điều chỉnh phần liên quan.

#### 3.2.2. Chức năng Quản trị viên

- Quản lý tài khoản và trạng thái hoạt động.
- Duyệt bài tập, quản lý taxonomy và template chương trình cốt lõi.
- Xem dashboard cơ bản và audit log cho các thao tác quan trọng.
- Thao tác qua giao diện Flutter phù hợp kích thước màn hình; ưu tiên mức đầy đủ nghiệp vụ, không đầu tư dashboard nâng cao trước luồng người tập.

#### 3.2.3. Phạm vi đề xuất chương trình

Phiên bản đầu sử dụng ba template: Full Body hai ngày, Full Body ba ngày và Upper/Lower bốn ngày. Mỗi template định nghĩa các vị trí theo movement pattern. Hệ thống lọc ứng viên bằng ràng buộc bắt buộc, xếp hạng theo mức phù hợp rồi kiểm tra cấu trúc và thời lượng dự kiến của chương trình.

Kho ứng viên recommendation ban đầu dự kiến gồm khoảng 60–100 bài cốt lõi được rà soát. Thư viện tra cứu có thể lớn hơn, nhưng dữ liệu import không tự động trở thành bài được phép đề xuất. Metadata có thể được chuẩn hóa hoặc gợi ý phân loại hàng loạt; các nhãn quan trọng của tập bài cốt lõi cần được kiểm duyệt.

Trọng số và bảng rule là tham số thiết kế ban đầu ở cấp tiêu chí, không phải điểm được nhập riêng cho từng bài. Mức phù hợp được tính từ metadata đã duyệt và hồ sơ người dùng. Các tham số cần được giải thích, phiên bản hoá và hiệu chỉnh bằng hồ sơ thử nghiệm cùng góp ý của người có chuyên môn; việc đánh giá này không yêu cầu một vai trò chuyên gia trong ứng dụng. Chúng không được trình bày như tiêu chuẩn y khoa hoặc giá trị đã học từ dữ liệu khi chưa có thực nghiệm.

Vòng lặp cá nhân hoá sử dụng feedback dễ/khó, thích/không thích và lịch sử hoàn thành để cập nhật đề xuất lần sau. Mọi thay đổi vẫn qua bộ lọc ràng buộc và xác nhận của người dùng. Nếu không đủ ứng viên hợp lệ hoặc không đáp ứng được thời lượng, hệ thống thông báo điều kiện cần điều chỉnh thay vì âm thầm vi phạm ràng buộc. Hệ thống lưu đầu vào, lý do chọn/loại và phiên bản rule để tái hiện kết quả; tách dữ liệu hiệu chỉnh khỏi dữ liệu đánh giá.

Smart Progression áp dụng nguyên tắc tăng tiến đã xác định trong kế hoạch, sử dụng kết quả rep, mức tạ và phản hồi. Đề xuất điều chỉnh không tự động thực thi khi chưa có xác nhận của người dùng. Mô hình ngôn ngữ, nếu bổ sung, chỉ hỗ trợ diễn đạt hoặc tóm tắt dữ liệu đã xác thực, không được tự tạo bài hoặc bỏ qua ràng buộc.

### 3.3. Phạm vi kỹ thuật và nền tảng

Ứng dụng sử dụng Flutter cho các giao diện Người dùng và Admin. Android là nền tảng demo chính; Flutter Web cung cấp giao diện responsive. iOS là mục tiêu bổ sung, phụ thuộc môi trường build và kiểm thử phù hợp.

Backend tiếp tục sử dụng NestJS và TypeScript, PostgreSQL cho dữ liệu bền vững và Redis cho cache/các chức năng dùng chung phù hợp. Socket.IO không phải yêu cầu bắt buộc của phạm vi mới vì không triển khai chat. Nghiệp vụ và phân quyền được xử lý ở backend để mobile và web sử dụng nhất quán. React hiện tại được giữ trong thời gian chuyển đổi để đối chiếu chức năng và kiểm tra API.

Các công việc hỗ trợ gồm chuẩn hóa API, tài liệu OpenAPI, xác thực phù hợp mobile, quản lý upload, migration dữ liệu và các kiểm thử cần thiết. Push notification, deep link nâng cao, biometric và đồng bộ offline hoàn chỉnh được xem là chức năng bổ sung theo tiến độ.

Lộ trình nền tảng dự kiến theo kế hoạch 16 tuần: ổn định backend, xây Flutter foundation, hoàn thiện onboarding/thư viện, plan, live workout, recommendation/progression, hiệu chỉnh và đánh giá cá nhân hoá, quản trị nội dung tối thiểu, responsive và kiểm thử cuối. Đây là lộ trình dự kiến, không phải tiến độ đã hoàn thành.

### 3.4. Giai đoạn tiếp nối: Nhật ký tập luyện và trạng thái cơ thể

Giai đoạn này chỉ bắt đầu sau khi phạm vi nền tảng đạt yêu cầu. Các chức năng bao gồm:

- **Body map:** sơ đồ mặt trước/mặt sau, chạm vùng để xem hoạt động gần đây và check-in; hỗ trợ trái/phải khi phù hợp và danh sách vùng tương đương.
- **Hai chế độ thông tin riêng:** “Đã tập” lấy dữ liệu từ log và mapping cơ; “Cảm nhận” lấy dữ liệu tự khai báo. Mỗi quan sát hiển thị thời điểm, không dùng dữ liệu cũ như trạng thái chắc chắn của hiện tại.
- **Check-in hằng ngày:** mức năng lượng, vùng ê/khó chịu, mức cảm nhận và ghi chú; giấc ngủ và cân nặng là thông tin tùy chọn. Người dùng có thể sửa/xóa; ngày chưa ghi khác với ngày ghi rõ không ê.
- **Timeline:** liên kết các buổi tập với check-in theo thời gian; lọc theo vùng hoặc khoảng ngày; đưa nhận xét mô tả có dữ liệu truy vết.
- **Quyền riêng tư:** nhật ký và check-in chỉ phục vụ chủ sở hữu; không có luồng chia sẻ với tài khoản khác, và quyền quản trị nội dung không mặc nhiên cho phép đọc nhật ký cá nhân.

Phạm vi này không bao gồm tự xác định nhóm cơ đang đau, tự kết luận nguyên nhân hoặc tính phần trăm hồi phục. Số set cơ chính/cơ phụ được trình bày minh bạch, không quy đổi thành một chỉ số sinh lý chưa được kiểm chứng. Việc hai sự kiện xuất hiện gần nhau trên timeline không được coi là bằng chứng nhân quả.

Quá trình kiểm chứng bắt đầu bằng prototype, sau đó xây luồng dữ liệu và thử nghiệm sử dụng trong hai tuần. Quyết định tiếp tục mở rộng dựa trên khả năng ghi nhận nhanh, hiểu đúng thông tin và mức hữu ích được người thử phản hồi.

### 3.5. Định hướng chạy bộ và đa môn trong tương lai

Chạy bộ chưa nằm trong phạm vi bắt buộc của GR2 hoặc giai đoạn đầu nhật ký cơ thể. Sau khi chức năng gym và check-in ổn định, hệ thống có thể thêm chạy/đi bộ với quãng đường, thời lượng, pace và GPS route trên mobile. Việc theo dõi vị trí khi khóa màn hình, pause/resume và sai số GPS cần thiết kế, kiểm thử riêng.

Các loại hoạt động dùng chung lịch sử và check-in, nhưng có dữ liệu chi tiết và chỉ số tiến bộ riêng. Dữ liệu chạy không bị ép vào cấu trúc set/rep, và quãng đường không được cộng với volume tạ thành một điểm sức khỏe chung. Việc mở rộng thêm môn tiếp theo cần dựa trên nhu cầu sử dụng đã kiểm chứng.

### 3.6. Ngoài phạm vi

- Chẩn đoán, điều trị, phục hồi chức năng y khoa hoặc thay thế chuyên gia sức khỏe.
- Tự đo/khẳng định cảm giác đau, mức tăng cơ hoặc mức hồi phục chỉ từ workout log.
- Tự động phát hiện tư thế và chấn thương qua camera.
- Huấn luyện deep learning hoặc collaborative filtering khi chưa có dữ liệu phù hợp.
- LLM tự tạo chương trình không qua dữ liệu/rule kiểm soát hoặc tự thay đổi plan.
- Theo dõi giấc ngủ tự động, tích hợp wearable, dinh dưỡng chi tiết và hồ sơ bệnh trong phạm vi bắt buộc.
- Marketplace, thanh toán, social feed và vận hành cộng đồng quy mô lớn.
- Thuật toán huấn luyện chuyên sâu cho mọi môn thể thao và triển khai production quy mô lớn trong cùng giai đoạn.

### 3.7. Sản phẩm bàn giao và giới hạn nghiệm thu

Sản phẩm bàn giao của phạm vi nền tảng gồm mã nguồn Flutter và backend, ứng dụng Android có thể demo, bản Flutter Web, migration/tài liệu API, bộ kiểm thử liên quan và báo cáo đánh giá. Các kịch bản chính cần thể hiện được luồng từ onboarding đến chương trình cá nhân, workout, feedback, lịch sử/progression và Admin kiểm duyệt dữ liệu đầu vào.

Nếu giai đoạn nhật ký cơ thể được thực hiện, phần bàn giao bổ sung gồm body map, check-in, timeline cá nhân, kiểm thử quyền riêng tư và kết quả thử nghiệm tương ứng. Nếu chưa thực hiện, báo cáo kết quả phải ghi rõ đây là hướng phát triển tiếp theo, không dùng mô tả kế hoạch làm bằng chứng hoàn thành.

Phạm vi nghiệm thu đánh giá sản phẩm phần mềm và mức phù hợp của chức năng với nhóm người dùng thử nghiệm. Báo cáo kết quả cần công bố điều kiện đo, cỡ mẫu, những chức năng đã hoàn thành và các giới hạn còn lại; không suy rộng sang hiệu quả sức khỏe toàn diện.

## Tài liệu cơ sở

1. [Báo cáo GR1 phiên bản 3](<../Report GR1/report_GR1_v3.docx>) — cơ sở bài toán, kiến trúc và phạm vi giai đoạn trước.
2. [Kế hoạch phát triển FiFB](../FiFB_Final_Development_Plan.md) — phạm vi nền tảng, lộ trình 16 tuần và mục 16 về nhật ký cơ thể.
3. [README của repository](../../README.md) — mô tả mô-đun và công nghệ hiện tại; không được dùng thay cho kết quả kiểm thử trong GR2.
