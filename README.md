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
              Redis (BullMQ queue "judge")
                         |
                         v
                    Judge Worker
                         |
                         v
                   Docker Sandbox
                         |
                         v
        Kết quả trở lại SQL Server, queue events -> SSE -> trình duyệt
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
db/tests/               Kiểm thử cấu trúc DB và hàng đợi chấm bài
worker/                 Judge Worker và Docker sandbox
worker/images/          Image chạy C, C++, Java, Python, JavaScript, Go và C#
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

1. Source code được lưu vào bảng `Submissions` với trạng thái `Pending`, sau đó web đẩy job `{ submissionId }` vào hàng đợi BullMQ `judge` trên Redis.
2. Worker nhận job từ queue, claim submission theo id bằng `app.usp_Judge_Claim` và chuyển sang `Judging`. Job lỗi hạ tầng được retry; submission kẹt hoặc job bị mất được sweeper của worker đưa lại vào queue.
3. Hệ thống chỉ chấm theo hàm: source của học viên (chỉ gồm hàm theo chữ ký `FunctionSpec` của bài) được ghép với driver do hệ thống sinh theo ngôn ngữ, rồi ghi vào thư mục tạm.
4. Worker biên dịch/chạy source trong Docker sandbox, không có network và bị giới hạn tài nguyên.
5. `InputData` của từng testcase (mỗi dòng là một tham số dạng JSON) được truyền vào `stdin` của driver.
6. Driver gọi hàm và in kết quả JSON sau dấu `@@ITOJ_RESULT@@`; worker so sánh với `ExpectedOutput` để xác định verdict. Bài chưa có chữ ký hàm hợp lệ không chấm được (`IE`).
7. Kết quả tổng và kết quả từng testcase được lưu lại trong SQL Server qua `app.usp_Judge_SaveResult` (chỉ worker đang giữ claim mới ghi được).
8. Thư mục tạm được xóa sau khi chấm.
9. Kết quả job trả về qua queue events; trang bài nộp nhận qua SSE (`/api/submissions/[id]/events`) nên cập nhật ngay, và tự chuyển sang polling nếu SSE lỗi.

### Thông báo

Các loại thông báo in-app: `judge_result`, `problem_approved`, `problem_rejected`, `class_student_added`, `class_student_removed`, `class_document_added`, `comment_reply`, `comment_like`, `contest_joined`, `contest_started`, `ta_request_submitted` (admin nhận khi giáo viên đề xuất trợ giảng), `ta_request_approved` (giáo viên và trợ giảng nhận khi admin duyệt), `class_created` (admin nhận khi giáo viên tạo lớp chờ duyệt). Email chỉ dùng cho OTP, không dùng cho thông báo.

1. Mã nghiệp vụ gọi `notify(...)` (hoặc một helper trong `src/modules/notification/events.ts`); thông báo được lưu vào `dbo.Notifications` qua `app.usp_Notification_Create`. SQL Server là nguồn sự thật.
2. Sau khi lưu, thông báo được publish lên Redis kênh `notif:user:<userId>`; lỗi Redis không làm hỏng thao tác gốc.
3. Trình duyệt giữ một kết nối SSE `/api/notifications/stream` (component `NotificationCenter`) để hiện popup và cập nhật chuông ngay; nếu SSE lỗi sẽ tự nối lại và đồng bộ số chưa đọc qua `/api/notifications/unread`.
4. Danh sách đầy đủ ở `/user/notifications`, `/teacher/notifications`, `/admin/notifications`.
5. Thêm sự kiện mới: thêm loại vào `NOTIFICATION_TYPES` (`schema.ts`), viết helper trong `events.ts` và gọi nó sau thao tác thành công.

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
| Bản sao lưu production | Thư mục `backups/` được mount vào container DB (xem mục Sao lưu và khôi phục) |

## Sao lưu và khôi phục (production)

Chạy trên VPS, trong thư mục `~/online-judge`:

```bash
bash deploy/backup.sh                       # tạo backups/<DB>_<UTC>.bak, verify, giữ 14 bản mới (KEEP=n để đổi)
bash deploy/restore.sh                      # liệt kê các bản backup
bash deploy/restore.sh itoj_X.bak           # restore vào DB tạm itoj_restore_test để kiểm tra
bash deploy/restore.sh itoj_X.bak --target itoj   # GHI ĐÈ DB thật (hỏi xác nhận, tự backup trước, dừng/bật lại web+worker)
```

`deploy/deploy.sh` tự chạy `backup.sh` trước bước migrate; backup lỗi thì deploy dừng. Lần đầu cần tạo thư mục: `mkdir -p backups && sudo chown 10001:0 backups` (SQL Server chạy bằng uid 10001). Bản backup nằm cùng VPS nên nên sao chép định kỳ sang nơi khác.

## Chạy dự án trên máy mới

Yêu cầu:

- Node.js tương thích với Next.js 16.
- Docker Desktop đang chạy.
- PowerShell hoặc terminal tương đương.

Các bước cơ bản:

```powershell
npm install
Copy-Item .env.example .env
docker compose up -d db redis mailpit
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
npm run db:clean:sample # Xóa dữ liệu mẫu (dry-run; thêm -- --yes để xóa thật)
SEED_PASSWORD=... npm run db:seed:sample # 7 tài khoản (admin, teacher, assist, user, teacher2, assist2, user2), ~27 bài, 10 lớp, 8 kỳ thi, bài nộp/bình luận mẫu (idempotent; chạy bằng sa vào DB trong .env)
SEED_PASSWORD=... npm run db:seed:bulk # Dry run: in kế hoạch nạp 100 người dùng, 1000 bài tập, 1500 bài nộp cùng lớp, kỳ thi (tài khoản sample_*); thêm -- --yes để ghi thật
npm run db:test      # Kiểm thử database
npm run worker:start # Chạy Judge Worker trực tiếp
```

Nạp dữ liệu số lượng lớn trên VPS (script nằm trong image worker, nên phải commit, push và deploy lại trước):

```bash
bash deploy/backup.sh   # bắt buộc sao lưu trước khi nạp
docker compose -f docker-compose.prod.yml run --rm -e SEED_PASSWORD='...' worker npx tsx scripts/db-seed-bulk.ts          # xem kế hoạch
docker compose -f docker-compose.prod.yml run --rm -e SEED_PASSWORD='...' worker npx tsx scripts/db-seed-bulk.ts --yes    # ghi thật
```

Tuỳ chọn: `--users=100 --problems=1000 --contests=25 --submissions=1500`. Chạy lại không nhân đôi dữ liệu; xoá bằng `npm run db:clean:sample -- --yes`.

Judge Worker và web cùng cần Redis (`REDIS_URL`, `JUDGE_CONCURRENCY` trong `.env`). Judge Worker cần Docker CLI, các judge image tương ứng và quyền sử dụng Docker daemon. Không xem lỗi thiếu Docker/image/mount là lỗi `RE` của bài làm.

`JUDGE_EARLY_STOP` (mặc định `off`): `priority` chỉ dừng khi gặp TLE (verdict cuối không đổi so với chấm đủ), `first-failure` dừng ở testcase lỗi đầu tiên. Các testcase bị bỏ qua không được lưu nhưng vẫn tính vào mẫu số của `PassedCases` (ví dụ `2/10`).

## Thiết kế giao diện

Giao diện của ITOJ lấy từ artifact thiết kế: https://claude.ai/artifact/YXSCQak2cxUESw416gBd1Y

- Khi thêm hoặc sửa màn hình, bám theo bố cục, màu sắc (token `--bg`, `--card`, `--line`, `--pri`...), nút, card, bảng và badge của artifact.
- Dùng lại token trong `app/globals.css` và component trong `src/components/`; không đưa thêm thư viện UI hoặc bảng màu khác.
- Hỗ trợ giao diện sáng/tối và màn hình hẹp (≤ 820px).

## Quy tắc khi đóng góp

- Đọc `AGENTS.md` trước khi sửa code bằng AI.
- Giữ đúng ranh giới `action/service/repository/stored procedure`.
- Không truy vấn trực tiếp bảng SQL từ TypeScript.
- Không để lộ testcase ẩn, mật khẩu hoặc secret.
- Giao diện phải lấy từ artifact thiết kế (xem mục "Thiết kế giao diện").
- Không xóa Docker volume, restore DB hoặc seed lại môi trường dùng chung khi chưa được xác nhận.
- Chạy lint, typecheck và test phù hợp trước khi bàn giao thay đổi.
