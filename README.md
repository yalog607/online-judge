# ITOJ - Online Judge

ITOJ là hệ thống quản lý lớp học và chấm bài lập trình trực tuyến. Giáo viên tạo bài tập, nhập testcase; học viên nộp source code; Judge Worker biên dịch, chạy từng testcase trong Docker và trả về kết quả như `AC`, `WA`, `TLE`, `MLE`, `RE` hoặc `CE`.

## Công nghệ chính

- Next.js 16, React 19 và TypeScript.
- SQL Server 2022.
- Stored procedure cho toàn bộ truy cập dữ liệu từ ứng dụng.
- Zod để xác thực dữ liệu đầu vào.
- Docker để chạy SQL Server và cách ly mã nguồn khi chấm.
- Cloudinary để lưu media, hiện được dùng cho ảnh đại diện.
- Vitest, ESLint và TypeScript để kiểm tra source code.

## Kiến trúc tổng quan

```text
Trình duyệt
   |
   v
Next.js Page / Form / API Route
   |
   v
Server Action -> Service -> Repository
   |
   v
Stored Procedure -> SQL Server
                         |
                         | Submission Pending
                         v
                    Judge Worker
                         |
                         v
                   Docker Sandbox
                         |
                         v
               Kết quả trở lại SQL Server
```

Dự án là **modular monolith**: giao diện và backend nằm trong một ứng dụng Next.js, còn Judge Worker là tiến trình nền chạy riêng.

## Cấu trúc thư mục

```text
app/                    Trang, layout, form và API Route của Next.js
src/components/         Component giao diện dùng chung
src/modules/            Nghiệp vụ auth, class, problem, submission, judge
src/db/exec.ts          Kết nối DB và gọi stored procedure
src/lib/                Session, môi trường, email, lưu trữ media
db/migrations/          Khởi tạo và nâng cấp schema
db/procs/               Stored procedure nghiệp vụ
db/functions/           SQL function
db/views/               SQL view
db/triggers/            SQL trigger
db/tests/               Kiểm thử cấu trúc DB
worker/                 Judge Worker và Docker sandbox
worker/images/          Image chạy C++, Java, Python và C#
scripts/                Script migrate, seed và test DB
deploy/                 Cấu hình triển khai và Caddy
```

## Luồng xử lý dữ liệu

### Yêu cầu web

1. Người dùng nhập dữ liệu từ form hoặc gửi JSON tới API.
2. Zod kiểm tra kiểu dữ liệu và các điều kiện đầu vào.
3. Server Action hoặc API Route kiểm tra session và role.
4. Service xử lý nghiệp vụ; repository gọi stored procedure qua `src/db/exec.ts`.
5. SQL Server trả recordset; Next.js render giao diện hoặc trả JSON.

Ứng dụng không thực hiện CRUD trực tiếp lên bảng `dbo`. Tài khoản kỹ thuật chỉ được cấp quyền thực thi các stored procedure thuộc schema `app`.

### Chấm bài

1. Source code được lưu vào bảng `Submissions` với trạng thái `Pending`.
2. Worker lấy một submission bằng `app.usp_Judge_ClaimNext` và chuyển sang `Judging`.
3. Source code được ghi vào thư mục tạm.
4. Worker biên dịch/chạy source trong Docker sandbox, không có network và bị giới hạn tài nguyên.
5. `InputData` của từng testcase được truyền vào `stdin`.
6. `stdout` được so sánh với `ExpectedOutput` để xác định verdict.
7. Kết quả tổng và kết quả từng testcase được lưu lại trong SQL Server.
8. Thư mục tạm được xóa sau khi chấm.

## Testcase và file ZIP

Giáo viên có thể nhập testcase thủ công hoặc tải lên một file `.zip`. ZIP cần chứa các cặp file có cùng tên cơ sở:

```text
testcases.zip
├── 01.in
├── 01.out
├── 02.in
└── 02.out
```

Các đuôi file được hỗ trợ:

- Input: `.in` hoặc `.txt`.
- Output: `.out` hoặc `.ans`.

`src/modules/problem/testcase-zip.ts` dùng JSZip đọc file trực tiếp từ bộ nhớ, ghép input/output theo tên và tạo danh sách testcase. ZIP gốc không được lưu. Nội dung testcase được chuyển thành JSON và gửi tới `app.usp_Testcase_ReplaceAll`, sau đó lưu trong bảng `dbo.Testcases`:

- `InputData`: dữ liệu đưa vào chương trình.
- `ExpectedOutput`: kết quả đúng.
- `IsHidden`: testcase có được hiển thị cho học viên hay không.
- `OrderIndex`: thứ tự chạy.

Testcase từ ZIP mặc định là testcase ẩn. Khi cập nhật, procedure thay thế toàn bộ testcase hiện có của bài trong một transaction.

## Cơ chế lưu trữ

| Dữ liệu | Nơi lưu |
| --- | --- |
| Người dùng, lớp, bài tập, testcase, bài nộp, kết quả | SQL Server |
| Source code đã nộp | Cột `Submissions.SourceCode` trong SQL Server |
| Phiên đăng nhập | Cookie HTTP-only chứa JWT và bảng `Sessions` |
| Ảnh đại diện | Cloudinary; SQL Server giữ URL |
| Dữ liệu SQL Server khi chạy Docker | Docker volume `db-data` |
| Source và file biên dịch khi chấm | Thư mục tạm, xóa sau mỗi lượt chấm |
| Bản sao lưu production | Thư mục `backups/` được mount vào container DB |

## Chạy dự án trên máy mới

Yêu cầu:

- Node.js tương thích với Next.js 16.
- Docker Desktop đang chạy.
- PowerShell hoặc terminal tương đương.

Các bước cơ bản:

```powershell
npm install
Copy-Item .env.example .env
docker compose up -d db mailpit
npm run db:migrate
npm run db:seed
npm run dev
```

Mở ứng dụng tại `http://localhost:3000`. Mailpit dùng để xem email OTP cục bộ tại `http://localhost:8125`.

Lưu ý:

- Ứng dụng chạy trực tiếp trên máy kết nối DB qua `localhost:14330`.
- Các service chạy cùng Docker network kết nối DB qua `db:1433`.
- Kiểm tra và thay các giá trị mẫu trong `.env`; không commit `.env` hoặc secret thật.
- `db:seed` chỉ dùng cho dữ liệu phát triển/thử nghiệm.

## Các lệnh thường dùng

```powershell
npm run dev          # Chạy web ở chế độ phát triển
npm run build        # Build production
npm run lint         # Kiểm tra ESLint
npm run typecheck    # Kiểm tra TypeScript
npm test             # Chạy Vitest
npm run db:migrate   # Tạo/cập nhật database và stored procedure
npm run db:seed      # Tạo dữ liệu mẫu
npm run db:test      # Kiểm thử database
npm run worker:start # Chạy Judge Worker trực tiếp
```

Judge Worker cần Docker CLI, các judge image tương ứng và quyền sử dụng Docker daemon. Không xem lỗi thiếu Docker/image/mount là lỗi `RE` của bài làm.

## Quy tắc khi đóng góp

- Đọc `AGENTS.md` trước khi sửa code bằng AI.
- Giữ đúng ranh giới `action/service/repository/stored procedure`.
- Không truy vấn trực tiếp bảng SQL từ TypeScript.
- Không để lộ testcase ẩn, mật khẩu hoặc secret.
- Không xóa Docker volume, restore DB hoặc seed lại môi trường dùng chung khi chưa được xác nhận.
- Chạy lint, typecheck và test phù hợp trước khi bàn giao thay đổi.
