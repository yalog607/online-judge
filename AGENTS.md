# Hướng dẫn dành cho AI

## Mục tiêu dự án

ITOJ là hệ thống chấm bài lập trình trực tuyến. Ứng dụng gồm:

- Web full-stack viết bằng Next.js App Router và TypeScript.
- SQL Server lưu dữ liệu nghiệp vụ và hàng đợi chấm bài.
- Redis (BullMQ) là hàng đợi giao việc từ web xuống Judge Worker; SQL Server vẫn là nguồn sự thật. Judge Worker nhận job, chạy mã nguồn trong Docker và ghi kết quả về SQL Server.

Đọc `README.md` trước khi thay đổi source code.

## Kiến trúc bắt buộc tuân theo

Luồng web chuẩn:

```text
Page/Component -> Server Action hoặc API Route -> Service -> Repository
-> src/db/exec.ts -> Stored Procedure -> SQL Server
```

- `app/`: route, layout, React Server Component, Client Component và API Route.
- `src/components/`: component giao diện dùng chung.
- `src/modules/<domain>/`: schema, action, service và repository theo từng nghiệp vụ.
- `src/db/exec.ts`: điểm gọi stored procedure dùng chung.
- `db/`: migration, stored procedure, function, view, trigger và kiểm thử DB.
- `worker/`: tiến trình chấm bài và Docker sandbox.
- `scripts/`: migration, seed và kiểm thử cơ sở dữ liệu.

Đây là modular monolith có Judge Worker chạy riêng. Không chuyển sang kiến trúc khác nếu nhiệm vụ không yêu cầu rõ ràng.

## Quy tắc dữ liệu

- Mã ứng dụng chỉ truy cập SQL Server qua stored procedure/function trong schema `app`.
- Không thêm câu lệnh CRUD trực tiếp lên bảng `dbo` trong TypeScript.
- Dữ liệu đầu vào phải được xác thực bằng Zod trước khi đi vào tầng nghiệp vụ.
- Kiểm tra session và role bằng các hàm trong `src/lib/dal.ts`.
- Chuyển lỗi nghiệp vụ từ SQL Server thành `DomainError`; không để lộ lỗi DB hoặc thông tin bí mật cho người dùng.
- Nếu cần đổi schema, tạo migration đánh số mới. Không sửa migration đã được áp dụng khi chưa có yêu cầu cụ thể.
- Không ghi mật khẩu, token, khóa Cloudinary hoặc secret vào source code, log hay tài liệu.

## Quy tắc testcase ZIP

- File ZIP chỉ là dữ liệu nhập tạm thời; không lưu ZIP gốc.
- Đọc ZIP bằng `src/modules/problem/testcase-zip.ts`.
- Ghép file có cùng tên cơ sở: `1.in` với `1.out`, hoặc `1.txt` với `1.ans`.
- Nội dung được chuyển thành `{ input, expectedOutput, isHidden }` rồi lưu vào bảng `dbo.Testcases` qua `app.usp_Testcase_ReplaceAll`.
- Testcase nạp từ ZIP mặc định là testcase ẩn.
- Khi thay đổi parser phải kiểm tra file rỗng, cặp file thiếu, tên trùng, giới hạn dung lượng và thứ tự testcase.
- Không hiển thị nội dung testcase ẩn cho học viên.

## Quy tắc Judge Worker

- Web đẩy job `{ submissionId }` vào queue `judge` (BullMQ/Redis); worker nhận job và claim theo id qua `app.usp_Judge_Claim`; không tự truy vấn bảng hàng đợi.
- Job lỗi hạ tầng phải được trả về queue (`usp_Judge_Release`) để retry; hết lượt retry thì lưu `IE`.
- Mã nguồn phải chạy trong Docker sandbox, tắt network và có giới hạn CPU, RAM, thời gian, PID và kích thước output.
- Chỉ chấm theo hàm: học viên viết hàm theo chữ ký (`FunctionSpec`) của bài; worker sinh driver quanh code đó, đưa testcase vào `stdin` của driver, đọc kết quả sau `@@ITOJ_RESULT@@` và so sánh với `ExpectedOutput` (JSON). Không còn chế độ chấm stdin/stdout.
- Bài không có `FunctionSpec` hợp lệ không chấm được: lưu `IE`, không chạy code.
- Phân biệt lỗi hạ tầng với verdict của bài làm. Không biến lỗi thiếu Docker/image/mount thành `RE` của người dùng.
- Thư mục chấm là thư mục tạm và phải được dọn sau khi hoàn tất.

## Lưu trữ

- SQL Server: dữ liệu nghiệp vụ, session, source code, testcase và kết quả chấm.
- Cloudinary: tệp media như ảnh đại diện; SQL Server chỉ giữ URL.
- Docker volume `db-data`: dữ liệu vật lý của SQL Server.
- Filesystem tạm: source code và file trung gian khi chấm; không dùng làm lưu trữ lâu dài.

## Quy tắc giao diện

- Nguồn thiết kế duy nhất cho giao diện là artifact ITOJ: https://claude.ai/artifact/YXSCQak2cxUESw416gBd1Y
- Mọi màn hình, component, bố cục, màu sắc, khoảng cách và nội dung mới hoặc được sửa phải lấy từ artifact này. Không tự sáng tác kiểu dáng khác.
- Trước khi làm giao diện, đọc artifact (công cụ `Artifact` với `action: "read"`), tìm màn hình/thành phần tương ứng trong mã nguồn của nó rồi bám sát. Màn hình chưa có trong artifact thì dùng đúng các token, kiểu nút, card, bảng, badge và bố cục của artifact, và nói rõ trong phần bàn giao.
- Dùng các token màu và component hiện có trong `app/globals.css`, `src/components/` (tương ứng `--bg`, `--card`, `--line`, `--pri`...). Không đưa thêm thư viện UI hoặc bảng màu khác.
- Hỗ trợ cả giao diện sáng/tối và màn hình hẹp (≤ 820px) như artifact.
- Khi làm xong, kiểm tra giao diện thực tế trên trình duyệt và so với artifact/ảnh tham chiếu; không báo hoàn thành chỉ dựa vào typecheck.

## Quy trình khi sửa code

1. Đọc route/component và toàn bộ luồng action/service/repository/procedure liên quan.
2. Giữ thay đổi đúng phạm vi, không refactor phần không liên quan.
3. Không xóa volume, restore database, seed lại hoặc chạy lệnh phá hủy nếu chưa được người dùng xác nhận rõ.
4. Sau khi sửa, chạy các kiểm tra phù hợp:

```powershell
npm run lint
npm run typecheck
npm test
```

Nếu thay đổi database, chạy thêm `npm run db:test` trên môi trường DB thử nghiệm. Nếu thay đổi worker, kiểm tra ít nhất các verdict AC, WA, TLE, CE và RE.

## Tiêu chí hoàn thành

- Source tuân theo kiến trúc hiện có.
- Không làm lộ secret hoặc testcase ẩn.
- Lỗi được xử lý ở đúng tầng và có thông báo phù hợp.
- Giao diện khớp artifact thiết kế (xem "Quy tắc giao diện").
- Có bằng chứng kiểm tra cho phần đã thay đổi.
- Nêu rõ phần nào chưa thể kiểm tra; không tuyên bố đã sửa xong nếu chưa xác minh.
