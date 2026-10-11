# Spec: Hệ thống thông báo dùng chung (ITOJ)


## 1. Bối cảnh & mục tiêu

ITOJ chưa có thông báo. Cần một hạ tầng **dùng chung toàn site**: module bất kỳ gọi một hàm `notify(...)` là người nhận
1. thấy **popup (toast) ngay lập tức** nếu đang mở web (realtime),
2. có thông báo **lưu bền** trong SQL Server và xem được ở **trang Thông báo** (kèm chuông + số chưa đọc).

Tiêu chí thành công: 2 session (người gửi sự kiện / người nhận) → người nhận thấy popup trong ~1s mà không reload, chuông tăng số, trang Thông báo có mục đó, bấm vào đi đúng `Link` và mục chuyển sang đã đọc.

Đã chốt với người dùng: sự kiện đợt đầu gồm **kết quả chấm bài, duyệt/từ chối bài tập, lớp học, bình luận & contest**; realtime theo hướng **SSE + Redis pub/sub**.

## 2. Ràng buộc kiến trúc (AGENTS.md)

- Luồng: Component/Action/API → Service → Repository → `src/db/exec.ts` → stored procedure schema `app`.
- Không CRUD trực tiếp bảng `dbo` trong TS. Zod cho input. Auth bằng `src/lib/dal.ts`. Lỗi nghiệp vụ → `DomainError`.
- Schema mới = migration đánh số mới (`0010`), không sửa migration cũ.
- SQL Server là nguồn sự thật; Redis chỉ là kênh đẩy tức thời (mất Redis thì thông báo vẫn còn trong DB).

## 3. Dữ liệu

**Migration `db/migrations/0010_notifications.sql`**

`dbo.Notifications`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| NotificationID | BIGINT IDENTITY PK | |
| UserID | INT NOT NULL FK → Users | người nhận |
| Type | VARCHAR(40) NOT NULL | `judge_result`, `problem_approved`, `problem_rejected`, `class_student_added`, `class_student_removed`, `class_document_added`, `comment_reply`, `comment_like`, `contest_joined`, `contest_started` |
| Title | NVARCHAR(200) NOT NULL | |
| Body | NVARCHAR(500) NULL | |
| Link | NVARCHAR(300) NULL | đường dẫn nội bộ (bắt đầu `/`) |
| IsRead | BIT NOT NULL DEFAULT 0 | |
| CreatedAt | DATETIME2 DEFAULT SYSUTCDATETIME() | |
| ReadAt | DATETIME2 NULL | |

Index: `(UserID, IsRead, CreatedAt DESC)`; `ON DELETE CASCADE` theo user.

**Procedure `db/procs/notification.sql`** (schema `app`)

- `usp_Notification_Create @UserIDs NVARCHAR(MAX)` (CSV id) `, @Type, @Title, @Body, @Link` → chèn hàng loạt (1 câu lệnh, không N+1), trả về các `NotificationID,UserID,CreatedAt` vừa tạo (dùng để publish).
- `usp_Notification_List @UserID, @OnlyUnread BIT, @Offset, @Limit` → trang + tổng số.
- `usp_Notification_UnreadCount @UserID`.
- `usp_Notification_MarkRead @UserID, @NotificationID` — chỉ cập nhật nếu thuộc `@UserID`, ngược lại `THROW 50xxx` (mã mới, tiếp nối dải đang dùng).
- `usp_Notification_MarkAllRead @UserID`.

Validate trong proc: Title không rỗng, Link nếu có phải bắt đầu bằng `/` và không chứa `//`/scheme (chống open redirect).

## 4. Hạ tầng dùng chung — `src/modules/notification/`

- `schema.ts`: Zod `notificationTypeSchema`, `notifyInputSchema` (`userIds: number[] 1..500`, `type`, `title ≤200`, `body ≤500?`, `link` regex `^/[^/\\]…`), `listQuerySchema`.
- `repo.ts` (`server-only`): bọc 5 proc qua `execProc`.
- `pubsub.ts`: dùng lại `createRedisConnection()` của `src/modules/judge/queue.ts`; 1 publisher dùng chung (cache trên `globalThis` như queue); kênh `notif:user:<userId>`; payload JSON `{id, type, title, body, link, createdAt}`.
- `service.ts`:
  - `notify(input)` = validate → `repo.create` → `publish` cho từng user. **Bọc try/catch + log (pino)**: lỗi notify/publish không bao giờ làm hỏng nghiệp vụ gốc.
  - `notifyUser(userId, …)` là shorthand của `notify` với 1 người.
  - Tự loại người gửi khỏi danh sách nhận ở nơi gọi cần ("không tự thông báo cho chính mình": comment reply/like).
- `actions.ts` (`"use server"`): `markReadAction`, `markAllReadAction` — `requireUser()`, `revalidatePath`.
- Dùng được từ worker (worker đã import `@/modules/judge/*`, nên không cần đường mới).

## 5. Realtime

`app/api/notifications/stream/route.ts` — `runtime = "nodejs"`, `dynamic = "force-dynamic"`:
- `verifySession()` → 401 nếu chưa đăng nhập.
- Mỗi kết nối tạo 1 subscriber Redis riêng (`duplicate`) subscribe `notif:user:<userId>`; chỉ nhận thông báo của chính user.
- Gửi `data: {...}` mỗi sự kiện, ping `: ping` mỗi 15s, dọn dẹp khi `request.signal` abort/cancel (cùng khuôn với `app/api/submissions/[id]/events/route.ts`).
- Lần kết nối đầu gửi sự kiện `ready` kèm `unreadCount` để chuông đồng bộ.

Client dự phòng: `EventSource` lỗi → polling `unreadCount` mỗi 15s (server action/`GET /api/notifications/unread`), tự thử nối lại SSE.

## 6. Giao diện (dùng chung 3 role)

- `src/components/notification-center.tsx` (client, mount 1 lần trong `AppShell`):
  - nhận SSE, giữ state `unread`, hàng đợi toast (tối đa 3 hiển thị cùng lúc), toast tự tắt ~6s, có nút đóng, bấm → `router.push(link)` + `markReadAction`;
  - chuông ở header (icon thêm vào `src/components/icon.tsx`) với badge số chưa đọc; dropdown 5 thông báo gần nhất (lấy qua API/server action khi mở), link "Xem tất cả".
- `AppShell` render `NotificationCenter` trong `<header>` (cạnh avatar). Vì cả `app/user|teacher|admin/layout.tsx` đều dùng `AppShell` nên toàn site có thông báo; tránh trùng kết nối SSE bằng việc component chỉ mount ở một chỗ.
- Trang `app/{user,teacher,admin}/notifications/page.tsx` dùng chung `src/components/notification-list.tsx` (server component): danh sách phân trang (`src/components/pager.tsx` có sẵn), lọc "Chưa đọc", nút "Đánh dấu tất cả đã đọc", mục chưa đọc nổi bật. Thêm item `Thông báo` vào `NAV` ba layout.
- Toast/chuông đạt a11y cơ bản: `role="status"`/`aria-live="polite"`, nút có `aria-label`, không chặn thao tác.
- Nội dung hiển thị là text thuần (React tự escape); không render HTML.

## 7. Gắn sự kiện (mỗi chỗ ~1 lời gọi `notify` sau khi thao tác thành công)

| Sự kiện | Điểm gọi | Người nhận | Link |
|---|---|---|---|
| Kết quả chấm | worker sau `usp_Judge_SaveResult` (`worker/processor.ts`) | chủ bài nộp | `/user/submissions/<id>`‑tương đương hiện có |
| Duyệt/từ chối bài tập | `setProblemStatus` caller trong `src/modules/problem/…` | `CreatorID` bài (kèm lý do từ chối) | trang bài/quản lý của teacher |
| Lớp học | `class/actions.ts`: thêm/xóa học viên, thêm tài liệu | học viên liên quan / cả lớp | `/user/classes/<id>` |
| Bình luận | `comment/actions.ts`: reply, like | tác giả comment gốc (≠ người thao tác) | trang bài toán |
| Contest | `contest`: tham gia → ban tổ chức; bắt đầu ngay (`startContestNowAction`) → người đã tham gia | ban tổ chức / người tham gia | `/teacher/contests/<id>`, `/user/contests/<id>` |

Thông báo chấm bài chỉ gồm verdict/điểm, **không** chứa input/expected của testcase ẩn.
Đường dẫn chính xác cho từng link được xác nhận khi viết plan (đọc route hiện có).

## 8. Xử lý lỗi & bảo mật

- Mọi proc kiểm tra quyền sở hữu; API/Action dùng `verifySession`/`requireUser`.
- Lỗi DB/Redis không lộ ra client (map sang `DomainError`/thông báo chung).
- Redis không sẵn sàng → thông báo vẫn được ghi DB; người dùng thấy ở trang Thông báo ở lần tải sau.
- Không log nội dung nhạy cảm; không đưa secret vào payload.

## 9. Kiểm thử

- `db/tests/0008_notifications.sql` (chạy qua `npm run db:test`): tạo hàng loạt, chỉ chủ sở hữu đọc/đánh dấu được, `MarkRead` của người khác bị `THROW`, đếm chưa đọc, `MarkAllRead`, validate Link.
- Vitest: `schema.test.ts` (từ chối link ngoài `/`, giới hạn độ dài/số người nhận), `service.test.ts` (publish lỗi không ném, loại trùng userIds).
- Kiểm tra tay bằng 2 trình duyệt/2 role: nộp bài → popup + chuông + trang Thông báo; mất Redis → vẫn có trong DB.
- Chạy `npm run lint`, `npm run typecheck`, `npm test`, `npm run db:test` (DB thử nghiệm). Nếu đụng worker: kiểm tra verdict AC/WA/TLE/CE/RE vẫn đúng và có thông báo.

## 10. Ngoài phạm vi (YAGNI)

Thông báo khi contest kết thúc theo thời gian (cần tác vụ định kỳ), email/push trình duyệt, tuỳ chọn bật/tắt theo loại, xóa hàng loạt, nhóm/gộp thông báo, lưu lịch sử vô hạn (dọn thông báo cũ có thể làm sau).

