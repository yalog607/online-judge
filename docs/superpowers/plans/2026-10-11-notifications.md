# Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hạ tầng thông báo dùng chung toàn site: gọi `notify(...)` là người nhận thấy popup realtime, có chuông + số chưa đọc, và có trong trang Thông báo.

**Architecture:** SQL Server là nguồn sự thật (`dbo.Notifications` + procs `app.usp_Notification_*`). `notify()` ghi DB rồi `PUBLISH` lên Redis kênh `notif:user:<id>`; route SSE `/api/notifications/stream` đẩy tới trình duyệt; client component `NotificationCenter` hiện toast + chuông. Các sự kiện (chấm bài, duyệt bài, lớp, bình luận, contest) gọi helper trong `events.ts`.

**Tech Stack:** Next.js App Router (16), TypeScript, mssql, ioredis, Zod 4, Vitest, Tailwind.

**Spec:** `docs/superpowers/specs/2026-10-11-notifications-design.md`

## Global Constraints

- Luồng: Component/Action/API → Service → Repository → `src/db/exec.ts` (`execProc`) → proc schema `app`. Không CRUD trực tiếp `dbo` trong TS.
- Đầu vào xác thực bằng Zod; session/role bằng `src/lib/dal.ts` (`verifySession`, `requireUser`, `requireRole`).
- Lỗi nghiệp vụ SQL dùng `THROW 50xxx` → `DomainError`; không lộ lỗi DB cho người dùng.
- Schema mới = migration đánh số mới `0010_notifications.sql`; **không** sửa migration cũ.
- `src/modules/notification/{schema,repo,pubsub,service,events}.ts` **không** được `import "server-only"` vì worker (tsx, ngoài Next) import chúng. Chỉ `actions.ts` là `"use server"`.
- Lỗi notify/publish **không bao giờ** làm hỏng nghiệp vụ gốc (nuốt + `console.error`, giống `worker/`).
- Không đưa secret, input/expected của testcase ẩn vào thông báo. Thông báo chấm bài chỉ có verdict + `passed/total`.
- Test DB (`db/tests/*.sql`): harness `scripts/db-test.ts` chỉ đọc **recordset đầu tiên** của script → mọi `EXEC` trả rowset phải `INSERT @t EXEC ...`; kết thúc bằng `SELECT Assertion, Passed FROM @Results;`.
- Commit: **một dòng**, không `Co-Authored-By` (memory "Commit style"); hook husky chạy lint/typecheck, `scripts/check-commit-msg.mjs` kiểm tra định dạng `type(scope): msg`.
- Nội dung tiếng Việt cho người dùng, mã/identifier tiếng Anh.

## Review Focus

- Redis chết/treo: `notify` phải trả về nhanh (timeout 1.5s) và nghiệp vụ gốc (nộp bài, thêm học viên…) vẫn thành công — test ở Task 2.
- `link` độc hại (`https://evil.com`, `//evil.com`, `javascript:…`, `\evil`): bị từ chối ở cả Zod lẫn proc — test Task 1 & 2.
- Người dùng A đọc/đánh dấu thông báo của B: proc `THROW`, API stream chỉ trả của chính mình — test Task 1.
- Spam like/unlike cùng một comment: không tạo thông báo trùng khi cái cũ chưa đọc (dedupe trong `usp_Notification_Create`) — test Task 1.
- `userIds` rỗng/trùng/không tồn tại: không lỗi, không tạo hàng thừa — test Task 1 & 2.
- Tự thao tác trên nội dung của chính mình (tự reply, tự like, tự duyệt bài của mình): không thông báo — test Task 5.
- Bài nộp chấm lại (rejudge) cùng verdict khi thông báo cũ chưa đọc: không popup lặp (dedupe) — test Task 1.

## File Structure

| File | Trách nhiệm |
|---|---|
| `db/migrations/0010_notifications.sql` | bảng `dbo.Notifications` + index |
| `db/procs/notification.sql` | 5 proc thao tác + 6 proc tra cứu người nhận (`usp_Notification_*Info/Students/Participants`) |
| `db/tests/0008_notifications.sql` | kiểm thử proc |
| `src/modules/notification/types.ts` | kiểu client-safe (`NotificationItem`, `StreamMessage`) |
| `src/modules/notification/schema.ts` | Zod: type, `notifyInputSchema`, link |
| `src/modules/notification/repo.ts` | bọc proc qua `execProc` |
| `src/modules/notification/pubsub.ts` | publisher/subscriber Redis |
| `src/modules/notification/service.ts` | `notify`, `listForUser`, `unreadCount`… |
| `src/modules/notification/events.ts` | helper theo sự kiện (tra cứu người nhận + dựng thông điệp) |
| `src/modules/notification/actions.ts` | server action đánh dấu đã đọc / lấy gần đây |
| `app/api/notifications/stream/route.ts` | SSE |
| `app/api/notifications/unread/route.ts` | đếm chưa đọc (fallback polling) |
| `src/components/notification-center.tsx` | chuông + toast (client) |
| `src/components/notification-list.tsx` | danh sách trang Thông báo (server) |
| `app/{user,teacher,admin}/notifications/page.tsx` | 3 trang mỏng |

---

### Task 1: Migration, procedure và DB test

**Files:**
- Create: `db/migrations/0010_notifications.sql`
- Create: `db/procs/notification.sql`
- Create: `db/tests/0008_notifications.sql`
- Modify: `docs/superpowers/specs/2026-10-11-notifications-design.md` (đổi `contest_ended` → `contest_started`, xem Step 5)

**Interfaces:**
- Produces (proc, schema `app`):
  - `usp_Notification_Create(@UserIDs NVARCHAR(MAX), @Type VARCHAR(40), @Title NVARCHAR(200), @Body NVARCHAR(500)=NULL, @Link NVARCHAR(300)=NULL)` → rowset `NotificationID BIGINT, UserID INT, CreatedAt DATETIME2` (chỉ các hàng **thực sự được chèn**).
  - `usp_Notification_List(@UserID, @OnlyUnread BIT=0, @Offset INT=0, @Limit INT=20)` → set 1: `NotificationID, Type, Title, Body, Link, IsRead, CreatedAt`; set 2: `Total INT`.
  - `usp_Notification_UnreadCount(@UserID)` → `Unread INT`.
  - `usp_Notification_MarkRead(@UserID, @NotificationID BIGINT)` — `THROW 50181` nếu không thuộc user.
  - `usp_Notification_MarkAllRead(@UserID)`.
  - Tra cứu: `usp_Notification_SubmissionInfo(@SubmissionID)` → `UserID, ProblemID, ProblemTitle`; `usp_Notification_ProblemInfo(@ProblemID)` → `CreatorID, Title, RejectionReason`; `usp_Notification_CommentInfo(@CommentID, @UserID)` → `AuthorID, ProblemID, ParentID, LikedByUser BIT`; `usp_Notification_ClassInfo(@ClassID)` → `ClassName`; `usp_Notification_ClassStudents(@ClassID)` → `UserID`; `usp_Notification_ContestInfo(@ContestID)` → `CreatorID, ContestName`; `usp_Notification_ContestParticipants(@ContestID)` → `UserID`.
- Mã lỗi dùng: `50180` (đầu vào không hợp lệ), `50181` (không thuộc user).

- [ ] **Step 1: Viết migration**

`db/migrations/0010_notifications.sql`:

```sql
CREATE TABLE dbo.Notifications (
    NotificationID BIGINT IDENTITY(1,1) CONSTRAINT PK_Notifications PRIMARY KEY,
    UserID         INT NOT NULL CONSTRAINT FK_Notifications_User REFERENCES dbo.Users(UserID) ON DELETE CASCADE,
    Type           VARCHAR(40) NOT NULL,
    Title          NVARCHAR(200) NOT NULL,
    Body           NVARCHAR(500) NULL,
    Link           NVARCHAR(300) NULL,
    IsRead         BIT NOT NULL CONSTRAINT DF_Notifications_IsRead DEFAULT 0,
    CreatedAt      DATETIME2(0) NOT NULL CONSTRAINT DF_Notifications_CreatedAt DEFAULT SYSUTCDATETIME(),
    ReadAt         DATETIME2(0) NULL,
    CONSTRAINT CK_Notifications_Title CHECK (LEN(RTRIM(LTRIM(Title))) > 0)
);
GO

CREATE INDEX IX_Notifications_User ON dbo.Notifications (UserID, IsRead, CreatedAt DESC);
GO
```

- [ ] **Step 2: Viết DB test (failing)**

`db/tests/0008_notifications.sql`:

```sql
DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
DECLARE @A INT, @B INT, @N BIGINT, @Cnt INT;

INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES ('ntf_a', 'x', 'ntf_a@test.com', N'Ntf A', 'User');
SET @A = SCOPE_IDENTITY();
INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES ('ntf_b', 'x', 'ntf_b@test.com', N'Ntf B', 'User');
SET @B = SCOPE_IDENTITY();

DECLARE @Created TABLE (NotificationID BIGINT, UserID INT, CreatedAt DATETIME2);
DECLARE @Ids NVARCHAR(100) = CONCAT(@A, ',', @B, ',', @A, ',999999999');

INSERT @Created EXEC app.usp_Notification_Create
    @UserIDs = @Ids, @Type = 'judge_result', @Title = N'Ket qua', @Body = N'AC', @Link = '/submissions/1';
INSERT @Results VALUES ('Creates one row per distinct existing user',
    CASE WHEN (SELECT COUNT(*) FROM @Created) = 2 THEN 1 ELSE 0 END);

DELETE @Created;
INSERT @Created EXEC app.usp_Notification_Create
    @UserIDs = @Ids, @Type = 'judge_result', @Title = N'Ket qua', @Body = N'AC', @Link = '/submissions/1';
INSERT @Results VALUES ('Identical unread notification is not duplicated',
    CASE WHEN (SELECT COUNT(*) FROM @Created) = 0 THEN 1 ELSE 0 END);

DECLARE @Unread TABLE (Unread INT);
INSERT @Unread EXEC app.usp_Notification_UnreadCount @UserID = @A;
INSERT @Results VALUES ('Unread count is 1',
    CASE WHEN (SELECT Unread FROM @Unread) = 1 THEN 1 ELSE 0 END);

SELECT @N = NotificationID FROM dbo.Notifications WHERE UserID = @A;

BEGIN TRY
    EXEC app.usp_Notification_MarkRead @UserID = @B, @NotificationID = @N;
    INSERT @Results VALUES ('Other user cannot mark read', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Other user cannot mark read', 1);
END CATCH;

EXEC app.usp_Notification_MarkRead @UserID = @A, @NotificationID = @N;
INSERT @Results VALUES ('Owner marks read',
    CASE WHEN (SELECT IsRead FROM dbo.Notifications WHERE NotificationID = @N) = 1 THEN 1 ELSE 0 END);

DELETE @Created;
INSERT @Created EXEC app.usp_Notification_Create
    @UserIDs = @Ids, @Type = 'judge_result', @Title = N'Ket qua', @Body = N'AC', @Link = '/submissions/1';
INSERT @Results VALUES ('Same notification is created again once the old one is read',
    CASE WHEN (SELECT COUNT(*) FROM @Created WHERE UserID = @A) = 1 THEN 1 ELSE 0 END);

EXEC app.usp_Notification_MarkAllRead @UserID = @A;
SELECT @Cnt = COUNT(*) FROM dbo.Notifications WHERE UserID = @A AND IsRead = 0;
INSERT @Results VALUES ('Mark all read leaves none unread', CASE WHEN @Cnt = 0 THEN 1 ELSE 0 END);
SELECT @Cnt = COUNT(*) FROM dbo.Notifications WHERE UserID = @B AND IsRead = 0;
INSERT @Results VALUES ('Mark all read does not touch other users', CASE WHEN @Cnt >= 1 THEN 1 ELSE 0 END);

DECLARE @List TABLE (NotificationID BIGINT, Type VARCHAR(40), Title NVARCHAR(200), Body NVARCHAR(500),
                     Link NVARCHAR(300), IsRead BIT, CreatedAt DATETIME2);
INSERT @List EXEC app.usp_Notification_List @UserID = @A, @OnlyUnread = 0, @Offset = 0, @Limit = 20;
INSERT @Results VALUES ('List returns own rows only',
    CASE WHEN (SELECT COUNT(*) FROM @List) = 2 THEN 1 ELSE 0 END);

DECLARE @Bad TABLE (v NVARCHAR(300));
INSERT @Bad VALUES (N'https://evil.com'), (N'//evil.com'), (N'javascript:alert(1)'), (N'/ok\evil'), (N'relative/path');
DECLARE @Link NVARCHAR(300), @Rejected INT = 0;
DECLARE c CURSOR LOCAL FOR SELECT v FROM @Bad;
OPEN c; FETCH NEXT FROM c INTO @Link;
WHILE @@FETCH_STATUS = 0
BEGIN
    BEGIN TRY
        EXEC app.usp_Notification_Create @UserIDs = @A, @Type = 'x', @Title = N't', @Link = @Link;
    END TRY
    BEGIN CATCH
        SET @Rejected += 1;
    END CATCH;
    FETCH NEXT FROM c INTO @Link;
END;
CLOSE c; DEALLOCATE c;
INSERT @Results VALUES ('Unsafe links are rejected', CASE WHEN @Rejected = 5 THEN 1 ELSE 0 END);

BEGIN TRY
    EXEC app.usp_Notification_Create @UserIDs = @A, @Type = 'x', @Title = N'   ';
    INSERT @Results VALUES ('Blank title is rejected', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Blank title is rejected', 1);
END CATCH;

DELETE dbo.Notifications WHERE UserID IN (@A, @B);
DELETE dbo.Users WHERE UserID IN (@A, @B);

SELECT Assertion, Passed FROM @Results;
```

- [ ] **Step 3: Chạy test, xác nhận FAIL**

Run: `npm run db:migrate; npm run db:test`
Expected: FAIL/ERROR ở `0008_notifications.sql` ("Could not find stored procedure 'app.usp_Notification_Create'"). (Lưu ý: `db:migrate` áp dụng `0010` và phần procs hiện có. Cần DB thử nghiệm đang chạy — xem README; **không** reset volume.)

- [ ] **Step 4: Viết procedure**

`db/procs/notification.sql`:

```sql
CREATE OR ALTER PROCEDURE app.usp_Notification_Create
    @UserIDs NVARCHAR(MAX),
    @Type    VARCHAR(40),
    @Title   NVARCHAR(200),
    @Body    NVARCHAR(500) = NULL,
    @Link    NVARCHAR(300) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @Title = LTRIM(RTRIM(ISNULL(@Title, N'')));
    IF LEN(@Title) = 0
        THROW 50180, 'Tieu de thong bao khong duoc de trong.', 1;

    IF @Link IS NOT NULL AND (
           @Link NOT LIKE N'/%'
        OR @Link LIKE N'//%'
        OR @Link LIKE N'%://%'
        OR @Link LIKE N'%\%'
        OR @Link LIKE N'%[<>"]%'
    )
        THROW 50180, 'Duong dan thong bao khong hop le.', 1;

    -- Recipients are existing users only; an identical unread notification is not repeated.
    INSERT dbo.Notifications (UserID, Type, Title, Body, Link)
    OUTPUT inserted.NotificationID, inserted.UserID, inserted.CreatedAt
    SELECT DISTINCT u.UserID, @Type, @Title, @Body, @Link
    FROM (
        SELECT TRY_CAST(LTRIM(RTRIM(value)) AS INT) AS UserID
        FROM STRING_SPLIT(@UserIDs, ',')
    ) ids
    JOIN dbo.Users u ON u.UserID = ids.UserID
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.Notifications n
        WHERE n.UserID = u.UserID AND n.IsRead = 0 AND n.Type = @Type
          AND n.Title = @Title AND ISNULL(n.Link, N'') = ISNULL(@Link, N'')
    );
END
GO

CREATE OR ALTER PROCEDURE app.usp_Notification_List
    @UserID     INT,
    @OnlyUnread BIT = 0,
    @Offset     INT = 0,
    @Limit      INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    IF @Offset < 0 SET @Offset = 0;
    IF @Limit < 1 SET @Limit = 20;
    IF @Limit > 100 SET @Limit = 100;

    SELECT NotificationID, Type, Title, Body, Link, IsRead, CreatedAt
    FROM dbo.Notifications
    WHERE UserID = @UserID AND (@OnlyUnread = 0 OR IsRead = 0)
    ORDER BY CreatedAt DESC, NotificationID DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;

    SELECT COUNT(*) AS Total
    FROM dbo.Notifications
    WHERE UserID = @UserID AND (@OnlyUnread = 0 OR IsRead = 0);
END
GO

CREATE OR ALTER PROCEDURE app.usp_Notification_UnreadCount
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT COUNT(*) AS Unread FROM dbo.Notifications WHERE UserID = @UserID AND IsRead = 0;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Notification_MarkRead
    @UserID         INT,
    @NotificationID BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Notifications WHERE NotificationID = @NotificationID AND UserID = @UserID)
        THROW 50181, 'Thong bao khong ton tai.', 1;

    UPDATE dbo.Notifications
    SET IsRead = 1, ReadAt = SYSUTCDATETIME()
    WHERE NotificationID = @NotificationID AND UserID = @UserID AND IsRead = 0;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Notification_MarkAllRead
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Notifications
    SET IsRead = 1, ReadAt = SYSUTCDATETIME()
    WHERE UserID = @UserID AND IsRead = 0;
END
GO

-- Read-only lookups used by src/modules/notification/events.ts to resolve recipients.
CREATE OR ALTER PROCEDURE app.usp_Notification_SubmissionInfo
    @SubmissionID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT s.UserID, s.ProblemID, p.Title AS ProblemTitle
    FROM dbo.Submissions s
    JOIN dbo.Problems p ON p.ProblemID = s.ProblemID
    WHERE s.SubmissionID = @SubmissionID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Notification_ProblemInfo
    @ProblemID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CreatorID, Title, RejectionReason FROM dbo.Problems WHERE ProblemID = @ProblemID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Notification_CommentInfo
    @CommentID INT,
    @UserID    INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.UserID AS AuthorID, c.ProblemID, c.ParentID,
           CAST(CASE WHEN EXISTS (
               SELECT 1 FROM dbo.ProblemCommentLikes l WHERE l.CommentID = c.CommentID AND l.UserID = @UserID
           ) THEN 1 ELSE 0 END AS BIT) AS LikedByUser
    FROM dbo.ProblemComments c
    WHERE c.CommentID = @CommentID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Notification_ClassInfo
    @ClassID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ClassName FROM dbo.Classes WHERE ClassID = @ClassID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Notification_ClassStudents
    @ClassID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT UserID FROM dbo.Class_Student WHERE ClassID = @ClassID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Notification_ContestInfo
    @ContestID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CreatorID, ContestName FROM dbo.Contests WHERE ContestID = @ContestID;
END
GO

CREATE OR ALTER PROCEDURE app.usp_Notification_ContestParticipants
    @ContestID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT UserID FROM dbo.Contest_User WHERE ContestID = @ContestID;
END
GO
```

- [ ] **Step 5: Đồng bộ spec (không có điểm gọi "kết thúc contest")**

Trong `docs/superpowers/specs/2026-10-11-notifications-design.md`: thay `contest_ended` bằng `contest_started`, và dòng Contest ở bảng §7 thành "tham gia → ban tổ chức; bắt đầu ngay (`startContestNowAction`) → người đã tham gia". Thêm một dòng vào §10: "Thông báo khi contest *kết thúc theo thời gian* cần tác vụ định kỳ — để sau."

- [ ] **Step 6: Chạy lại, xác nhận PASS**

Run: `npm run db:migrate; npm run db:test`
Expected: `PASS 0008_notifications.sql` và `all db tests passed`.

- [ ] **Step 7: Commit**

```bash
git add db/migrations/0010_notifications.sql db/procs/notification.sql db/tests/0008_notifications.sql docs/superpowers/specs/2026-10-11-notifications-design.md
git commit -m "feat(db): add notifications table and procedures"
```

---

### Task 2: Module notification — schema, repo, pubsub, service

**Files:**
- Create: `src/modules/notification/types.ts`, `schema.ts`, `repo.ts`, `pubsub.ts`, `service.ts`
- Test: `src/modules/notification/schema.test.ts`, `src/modules/notification/service.test.ts`

**Interfaces:**
- Consumes: procs của Task 1; `execProc` từ `@/db/exec`; `env()` từ `@/lib/env`.
- Produces:
  - `types.ts`: `NotificationItem = { id: number; type: string; title: string; body: string | null; link: string | null; createdAt: string; isRead: boolean }`; `StreamMessage = { kind: "ready"; unread: number } | { kind: "notification"; item: NotificationItem }`.
  - `schema.ts`: `NOTIFICATION_TYPES`, `notifyInputSchema`, `type NotifyInput = z.input<typeof notifyInputSchema>`, `isSafeLink(link: string): boolean`.
  - `repo.ts`: `createNotifications(input) => Promise<{id:number;userId:number;createdAt:string}[]>`, `listNotifications(userId, {onlyUnread, offset, limit}) => Promise<{items: NotificationItem[]; total: number}>`, `unreadCount(userId) => Promise<number>`, `markRead(userId, id)`, `markAllRead(userId)`, plus `*Info` lookups (Task 5 defines their use).
  - `pubsub.ts`: `publishToUser(userId: number, message: StreamMessage): Promise<void>`, `subscribeToUser(userId: number, onMessage: (m: StreamMessage) => void): Promise<() => void>`, `notifChannel(userId)`.
  - `service.ts`: `notify(input: NotifyInput): Promise<void>` (never throws), `listForUser`, `unreadCountFor`.

- [ ] **Step 1: Viết test schema (failing)**

`src/modules/notification/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isSafeLink, notifyInputSchema } from "./schema";

const base = { userIds: [1], type: "judge_result", title: "Kết quả" } as const;

describe("isSafeLink", () => {
  it.each(["/submissions/1", "/user/problems/5?tab=a"])("accepts %s", (l) => {
    expect(isSafeLink(l)).toBe(true);
  });
  it.each(["https://evil.com", "//evil.com", "javascript:alert(1)", "relative", "/a\\b", "/<x>"])(
    "rejects %s",
    (l) => expect(isSafeLink(l)).toBe(false),
  );
});

describe("notifyInputSchema", () => {
  it("accepts a minimal input", () => {
    expect(notifyInputSchema.safeParse(base).success).toBe(true);
  });
  it("rejects empty or oversized recipient lists", () => {
    expect(notifyInputSchema.safeParse({ ...base, userIds: [] }).success).toBe(false);
    expect(
      notifyInputSchema.safeParse({ ...base, userIds: Array.from({ length: 501 }, (_, i) => i + 1) }).success,
    ).toBe(false);
  });
  it("rejects unknown type, long title and unsafe link", () => {
    expect(notifyInputSchema.safeParse({ ...base, type: "nope" }).success).toBe(false);
    expect(notifyInputSchema.safeParse({ ...base, title: "x".repeat(201) }).success).toBe(false);
    expect(notifyInputSchema.safeParse({ ...base, link: "https://evil.com" }).success).toBe(false);
  });
  it("dedupes recipient ids", () => {
    const r = notifyInputSchema.parse({ ...base, userIds: [2, 2, 3] });
    expect(r.userIds).toEqual([2, 3]);
  });
});
```

- [ ] **Step 2: Chạy, xác nhận FAIL**

Run: `npx vitest run src/modules/notification/schema.test.ts`
Expected: FAIL ("Cannot find module './schema'").

- [ ] **Step 3: Viết `types.ts` và `schema.ts`**

`src/modules/notification/types.ts`:

```ts
export type NotificationItem = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  createdAt: string;
  isRead: boolean;
};

export type StreamMessage =
  | { kind: "ready"; unread: number }
  | { kind: "notification"; item: NotificationItem };
```

`src/modules/notification/schema.ts`:

```ts
import { z } from "zod";

export const NOTIFICATION_TYPES = [
  "judge_result",
  "problem_approved",
  "problem_rejected",
  "class_student_added",
  "class_student_removed",
  "class_document_added",
  "comment_reply",
  "comment_like",
  "contest_joined",
  "contest_started",
] as const;

// Internal paths only: must start with a single "/" and carry no scheme, backslash or markup.
export function isSafeLink(link: string): boolean {
  return link.startsWith("/") && !link.startsWith("//") && !/[\\<>"]|:\/\//.test(link);
}

export const notifyInputSchema = z.object({
  userIds: z
    .array(z.number().int().positive())
    .min(1)
    .max(500)
    .transform((ids) => [...new Set(ids)]),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(500).optional(),
  link: z.string().max(300).refine(isSafeLink, "Đường dẫn không hợp lệ").optional(),
});

export type NotifyInput = z.input<typeof notifyInputSchema>;
export type NotifyParsed = z.output<typeof notifyInputSchema>;
```

- [ ] **Step 4: Chạy lại, xác nhận PASS**

Run: `npx vitest run src/modules/notification/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Viết test service (failing)**

`src/modules/notification/service.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const createNotifications = vi.fn();
const publishToUser = vi.fn();
vi.mock("./repo", () => ({ createNotifications }));
vi.mock("./pubsub", () => ({ publishToUser }));

const { notify } = await import("./service");

const input = { userIds: [1, 2], type: "judge_result", title: "T", link: "/submissions/1" } as const;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("notify", () => {
  it("stores then publishes one message per created row", async () => {
    createNotifications.mockResolvedValue([
      { id: 10, userId: 1, createdAt: "2026-01-01T00:00:00.000Z" },
      { id: 11, userId: 2, createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    publishToUser.mockResolvedValue(undefined);
    await notify(input);
    expect(createNotifications).toHaveBeenCalledOnce();
    expect(publishToUser).toHaveBeenCalledTimes(2);
    expect(publishToUser.mock.calls[0][1]).toMatchObject({
      kind: "notification",
      item: { id: 10, type: "judge_result", title: "T", link: "/submissions/1", isRead: false },
    });
  });

  it("does nothing for an empty recipient list", async () => {
    await notify({ ...input, userIds: [] });
    expect(createNotifications).not.toHaveBeenCalled();
  });

  it("never throws when the database fails", async () => {
    createNotifications.mockRejectedValue(new Error("db down"));
    await expect(notify(input)).resolves.toBeUndefined();
    expect(publishToUser).not.toHaveBeenCalled();
  });

  it("never throws and stays fast when publish fails or hangs", async () => {
    createNotifications.mockResolvedValue([{ id: 1, userId: 1, createdAt: "x" }]);
    publishToUser.mockImplementation(() => new Promise(() => {})); // never settles
    const started = Date.now();
    await expect(notify(input)).resolves.toBeUndefined();
    expect(Date.now() - started).toBeLessThan(3000);
  });

  it("rejects an invalid link without touching the database", async () => {
    await notify({ ...input, link: "https://evil.com" });
    expect(createNotifications).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Chạy, xác nhận FAIL**

Run: `npx vitest run src/modules/notification/service.test.ts`
Expected: FAIL ("Cannot find module './service'").

- [ ] **Step 7: Viết `repo.ts`, `pubsub.ts`, `service.ts`**

`src/modules/notification/repo.ts`:

```ts
import { execProc } from "@/db/exec";
import type { NotificationItem } from "./types";

type CreatedRow = { NotificationID: number | string; UserID: number; CreatedAt: Date | string };
type ListRow = {
  NotificationID: number | string;
  Type: string;
  Title: string;
  Body: string | null;
  Link: string | null;
  IsRead: boolean;
  CreatedAt: Date | string;
};

const iso = (v: Date | string) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());

export async function createNotifications(input: {
  userIds: number[];
  type: string;
  title: string;
  body?: string;
  link?: string;
}): Promise<{ id: number; userId: number; createdAt: string }[]> {
  const { rows } = await execProc<CreatedRow>("usp_Notification_Create", {
    UserIDs: input.userIds.join(","),
    Type: input.type,
    Title: input.title,
    Body: input.body ?? null,
    Link: input.link ?? null,
  });
  return rows.map((r) => ({ id: Number(r.NotificationID), userId: r.UserID, createdAt: iso(r.CreatedAt) }));
}

export async function listNotifications(
  userId: number,
  opts: { onlyUnread?: boolean; offset?: number; limit?: number } = {},
): Promise<{ items: NotificationItem[]; total: number }> {
  const { sets } = await execProc<ListRow & { Total?: number }>("usp_Notification_List", {
    UserID: userId,
    OnlyUnread: opts.onlyUnread ?? false,
    Offset: opts.offset ?? 0,
    Limit: opts.limit ?? 20,
  });
  const items = (sets[0] ?? []).map((r) => ({
    id: Number(r.NotificationID),
    type: r.Type,
    title: r.Title,
    body: r.Body,
    link: r.Link,
    createdAt: iso(r.CreatedAt),
    isRead: Boolean(r.IsRead),
  }));
  return { items, total: Number(sets[1]?.[0]?.Total ?? 0) };
}

export async function unreadCount(userId: number): Promise<number> {
  const { rows } = await execProc<{ Unread: number }>("usp_Notification_UnreadCount", { UserID: userId });
  return Number(rows[0]?.Unread ?? 0);
}

export async function markRead(userId: number, notificationId: number) {
  await execProc("usp_Notification_MarkRead", { UserID: userId, NotificationID: notificationId });
}

export async function markAllRead(userId: number) {
  await execProc("usp_Notification_MarkAllRead", { UserID: userId });
}

// --- recipient lookups (used by events.ts) ---

export async function submissionInfo(submissionId: number) {
  const { rows } = await execProc<{ UserID: number; ProblemID: number; ProblemTitle: string }>(
    "usp_Notification_SubmissionInfo",
    { SubmissionID: submissionId },
  );
  return rows[0] ?? null;
}

export async function problemInfo(problemId: number) {
  const { rows } = await execProc<{ CreatorID: number; Title: string; RejectionReason: string | null }>(
    "usp_Notification_ProblemInfo",
    { ProblemID: problemId },
  );
  return rows[0] ?? null;
}

export async function commentInfo(commentId: number, userId: number) {
  const { rows } = await execProc<{
    AuthorID: number;
    ProblemID: number;
    ParentID: number | null;
    LikedByUser: boolean;
  }>("usp_Notification_CommentInfo", { CommentID: commentId, UserID: userId });
  return rows[0] ?? null;
}

export async function classInfo(classId: number) {
  const { rows } = await execProc<{ ClassName: string }>("usp_Notification_ClassInfo", { ClassID: classId });
  return rows[0] ?? null;
}

export async function classStudentIds(classId: number): Promise<number[]> {
  const { rows } = await execProc<{ UserID: number }>("usp_Notification_ClassStudents", { ClassID: classId });
  return rows.map((r) => r.UserID);
}

export async function contestInfo(contestId: number) {
  const { rows } = await execProc<{ CreatorID: number; ContestName: string }>(
    "usp_Notification_ContestInfo",
    { ContestID: contestId },
  );
  return rows[0] ?? null;
}

export async function contestParticipantIds(contestId: number): Promise<number[]> {
  const { rows } = await execProc<{ UserID: number }>("usp_Notification_ContestParticipants", {
    ContestID: contestId,
  });
  return rows.map((r) => r.UserID);
}
```

`src/modules/notification/pubsub.ts`:

```ts
import IORedis from "ioredis";
import { env } from "@/lib/env";
import type { StreamMessage } from "./types";

export const notifChannel = (userId: number) => `notif:user:${userId}`;

const g = globalThis as typeof globalThis & { __itojNotifPublisher?: IORedis };

// Publisher fails fast (no offline queue, 1 retry) so a Redis outage never stalls a request.
function publisher() {
  if (!g.__itojNotifPublisher) {
    const client = new IORedis(env().REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    client.on("error", () => {});
    g.__itojNotifPublisher = client;
  }
  return g.__itojNotifPublisher;
}

export async function publishToUser(userId: number, message: StreamMessage): Promise<void> {
  await publisher().publish(notifChannel(userId), JSON.stringify(message));
}

// One dedicated connection per SSE client; the returned function releases it.
export async function subscribeToUser(
  userId: number,
  onMessage: (message: StreamMessage) => void,
): Promise<() => void> {
  const sub = new IORedis(env().REDIS_URL, { maxRetriesPerRequest: null });
  sub.on("error", () => {});
  const channel = notifChannel(userId);
  sub.on("message", (ch, raw) => {
    if (ch !== channel) return;
    try {
      onMessage(JSON.parse(raw) as StreamMessage);
    } catch {
      /* ignore malformed payloads */
    }
  });
  await sub.subscribe(channel);
  return () => {
    sub.disconnect();
  };
}
```

`src/modules/notification/service.ts`:

```ts
import { notifyInputSchema, type NotifyInput } from "./schema";
import * as repo from "./repo";
import { publishToUser } from "./pubsub";

const PUBLISH_TIMEOUT_MS = 1500;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("publish timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

// Stores the notification (source of truth) then pushes it to online recipients. Failures are
// logged and swallowed: a notification problem must never fail the business operation.
export async function notify(input: NotifyInput): Promise<void> {
  if (input.userIds.length === 0) return;
  try {
    const data = notifyInputSchema.parse(input);
    const created = await repo.createNotifications(data);
    await Promise.allSettled(
      created.map((row) =>
        withTimeout(
          publishToUser(row.userId, {
            kind: "notification",
            item: {
              id: row.id,
              type: data.type,
              title: data.title,
              body: data.body ?? null,
              link: data.link ?? null,
              createdAt: row.createdAt,
              isRead: false,
            },
          }),
          PUBLISH_TIMEOUT_MS,
        ),
      ),
    );
  } catch (e) {
    console.error("notify failed", e);
  }
}

export const listForUser = repo.listNotifications;
export const unreadCountFor = repo.unreadCount;
```

- [ ] **Step 8: Chạy test + typecheck**

Run: `npx vitest run src/modules/notification; npm run typecheck`
Expected: tất cả PASS, typecheck sạch.

- [ ] **Step 9: Commit**

```bash
git add src/modules/notification
git commit -m "feat(notification): add notify service, repository and redis pubsub"
```

---

### Task 3: Server actions và API (SSE, unread)

**Files:**
- Create: `src/modules/notification/actions.ts`
- Create: `app/api/notifications/stream/route.ts`
- Create: `app/api/notifications/unread/route.ts`

**Interfaces:**
- Consumes: `verifySession`, `requireUser` (`@/lib/dal`); `listForUser`, `unreadCountFor`, `repo.markRead/markAllRead`; `subscribeToUser`.
- Produces:
  - `markReadAction(notificationId: number): Promise<void>`, `markAllReadAction(): Promise<void>`, `listRecentAction(): Promise<NotificationItem[]>` (5 mục gần nhất).
  - `GET /api/notifications/stream` → SSE; messages `StreamMessage` JSON trong `data:`.
  - `GET /api/notifications/unread` → `{ unread: number }`, 401 nếu chưa đăng nhập.

- [ ] **Step 1: Viết actions**

`src/modules/notification/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/dal";
import { DomainError } from "@/db/exec";
import * as repo from "./repo";
import type { NotificationItem } from "./types";

export async function markReadAction(notificationId: number): Promise<void> {
  const user = await requireUser();
  if (!Number.isSafeInteger(notificationId) || notificationId <= 0) return;
  try {
    await repo.markRead(user.userId, notificationId);
  } catch (e) {
    if (!(e instanceof DomainError)) throw e;
  }
  revalidatePath("/", "layout");
}

export async function markAllReadAction(): Promise<void> {
  const user = await requireUser();
  await repo.markAllRead(user.userId);
  revalidatePath("/", "layout");
}

export async function listRecentAction(): Promise<NotificationItem[]> {
  const user = await requireUser();
  return (await repo.listNotifications(user.userId, { limit: 5 })).items;
}
```

- [ ] **Step 2: Viết route unread**

`app/api/notifications/unread/route.ts`:

```ts
import { verifySession } from "@/lib/dal";
import { unreadCountFor } from "@/modules/notification/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await verifySession();
  if (!user) return new Response("Unauthorized", { status: 401 });
  return Response.json({ unread: await unreadCountFor(user.userId) });
}
```

- [ ] **Step 3: Viết route SSE**

`app/api/notifications/stream/route.ts` (cùng khuôn `app/api/submissions/[id]/events/route.ts`):

```ts
import { verifySession } from "@/lib/dal";
import { unreadCountFor } from "@/modules/notification/service";
import { subscribeToUser } from "@/modules/notification/pubsub";
import type { StreamMessage } from "@/modules/notification/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-sent events: pushes this user's new notifications as soon as they are published.
export async function GET(request: Request) {
  const user = await verifySession();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (message: StreamMessage) => {
        if (!closed) controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
      };
      const close = () => {
        if (closed) return;
        closed = true;
        cleanup();
        try {
          controller.close();
        } catch {}
      };

      const ping = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": ping\n\n"));
      }, 15000);
      let unsubscribe = () => {};
      cleanup = () => {
        clearInterval(ping);
        unsubscribe();
      };
      request.signal.addEventListener("abort", close);

      try {
        // Subscribe first, then read the count, so a notification landing in between is not missed.
        unsubscribe = await subscribeToUser(user.userId, send);
        send({ kind: "ready", unread: await unreadCountFor(user.userId) });
      } catch (e) {
        console.error("notification stream failed", e);
        close();
      }
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
```

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck; npm run lint`
Expected: sạch.

- [ ] **Step 5: Kiểm tra tay SSE (cần dev server + Redis + DB)**

Run (terminal 1): `npm run dev`. Đăng nhập trên trình duyệt, rồi trong DevTools console:
`const es = new EventSource('/api/notifications/stream'); es.onmessage = e => console.log(e.data)`
Expected: log `{"kind":"ready","unread":N}`. Ở terminal 2 chạy:
`npx tsx -e "import 'dotenv/config'; import('./src/modules/notification/service').then(m => m.notify({userIds:[<userId của bạn>], type:'judge_result', title:'Thử', link:'/user'}))"`
Expected: console in `{"kind":"notification","item":{...}}` trong ~1s. Dừng Redis rồi chạy lại lệnh `notify`: lệnh kết thúc < 3s, không ném lỗi, thông báo vẫn có trong DB.

- [ ] **Step 6: Commit**

```bash
git add src/modules/notification/actions.ts app/api/notifications
git commit -m "feat(notification): add SSE stream, unread API and read actions"
```

---

### Task 4: Giao diện — chuông, toast, trang Thông báo

**Files:**
- Modify: `src/components/icon.tsx` (thêm `bell`)
- Create: `src/components/notification-center.tsx`
- Create: `src/components/notification-list.tsx`
- Modify: `src/components/app-shell.tsx` (prop `notificationsHref`, render center)
- Modify: `app/user/layout.tsx`, `app/teacher/layout.tsx`, `app/admin/layout.tsx` (NAV + prop)
- Modify: `app/profile/layout.tsx`, `app/submissions/layout.tsx` (toast-only)
- Create: `app/user/notifications/page.tsx`, `app/teacher/notifications/page.tsx`, `app/admin/notifications/page.tsx`

**Interfaces:**
- Consumes: `markReadAction`, `markAllReadAction`, `listRecentAction` (Task 3); `StreamMessage`, `NotificationItem` (Task 2); `listForUser` (Task 2); `Pager` (`src/components/pager.tsx`).
- Produces: `NotificationCenter({ href: string; showBell?: boolean })`; `NotificationList({ basePath: string; searchParams: { page?: string; unread?: string } })`.

- [ ] **Step 1: Thêm icon `bell`**

Trong `src/components/icon.tsx`, thêm vào `PATHS` (trước `} as const;`):

```ts
  bell: '<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/>',
```

- [ ] **Step 2: Viết `NotificationCenter`**

`src/components/notification-center.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { listRecentAction, markReadAction } from "@/modules/notification/actions";
import type { NotificationItem, StreamMessage } from "@/modules/notification/types";

const TOAST_MS = 6000;
const MAX_TOASTS = 3;
const RETRY_MS = 15000;

// Mounted once per page. Subscribes to the SSE stream, shows toast popups and (when
// `showBell`) the bell with the unread badge and a dropdown of the latest items.
export function NotificationCenter({ href, showBell = true }: { href: string; showBell?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [toasts, setToasts] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<NotificationItem[] | null>(null);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const onNotificationsPage = pathname.endsWith("/notifications");

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const pending = timers.current;
    let source: EventSource | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    const refreshCount = async () => {
      try {
        const res = await fetch("/api/notifications/unread", { cache: "no-store" });
        if (res.ok) setUnread(((await res.json()) as { unread: number }).unread);
      } catch {
        /* offline: keep the last known count */
      }
    };

    const connect = () => {
      if (disposed) return;
      source = new EventSource("/api/notifications/stream");
      source.onmessage = (ev) => {
        const msg = JSON.parse(ev.data) as StreamMessage;
        if (msg.kind === "ready") {
          setUnread(msg.unread);
          return;
        }
        const item = msg.item;
        setUnread((n) => n + 1);
        setRecent(null);
        setToasts((list) => [...list.filter((t) => t.id !== item.id), item].slice(-MAX_TOASTS));
        pending.set(
          item.id,
          setTimeout(() => dismiss(item.id), TOAST_MS),
        );
        if (onNotificationsPage) router.refresh();
      };
      // Stream dropped (deploy, network, Redis): sync the count now and try again later.
      source.onerror = () => {
        source?.close();
        source = undefined;
        void refreshCount();
        retry = setTimeout(connect, RETRY_MS);
      };
    };

    connect();
    return () => {
      disposed = true;
      source?.close();
      if (retry) clearTimeout(retry);
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, [dismiss, router, onNotificationsPage]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    if (recent === null) {
      listRecentAction()
        .then((items) => !cancelled && setRecent(items))
        .catch(() => !cancelled && setRecent([]));
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, recent]);

  const openItem = (item: NotificationItem) => {
    dismiss(item.id);
    setOpen(false);
    if (!item.isRead) {
      setUnread((n) => Math.max(0, n - 1));
      setRecent(null);
      void markReadAction(item.id);
    }
    router.push(item.link ?? href);
  };

  return (
    <>
      {showBell && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={unread > 0 ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
            aria-expanded={open}
            className="relative grid h-9 w-9 place-items-center rounded-lg text-fg-muted hover:bg-muted hover:text-fg"
          >
            <Icon name="bell" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-bad px-1 text-[11px] font-semibold leading-[18px] text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
          {open && (
            <>
              <button
                type="button"
                aria-label="Đóng"
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => setOpen(false)}
              />
              <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-surface shadow-card max-[820px]:fixed max-[820px]:inset-x-3 max-[820px]:top-16 max-[820px]:w-auto">
                <div className="border-b border-line px-4 py-2.5 font-semibold">Thông báo</div>
                <ul className="max-h-96 overflow-y-auto">
                  {recent === null && <li className="px-4 py-6 text-center text-fg-muted">Đang tải...</li>}
                  {recent?.length === 0 && (
                    <li className="px-4 py-6 text-center text-fg-muted">Chưa có thông báo.</li>
                  )}
                  {recent?.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => openItem(item)}
                        className="flex w-full flex-col gap-0.5 border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-muted"
                      >
                        <span className={item.isRead ? "" : "font-semibold"}>{item.title}</span>
                        {item.body && <span className="line-clamp-2 text-sm text-fg-muted">{item.body}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className="block border-t border-line px-4 py-2.5 text-center font-medium text-primary hover:bg-muted"
                >
                  Xem tất cả
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto flex items-start gap-2 rounded-xl border border-line bg-surface p-3 shadow-card"
          >
            <button type="button" onClick={() => openItem(item)} className="min-w-0 flex-1 text-left">
              <span className="block font-semibold">{item.title}</span>
              {item.body && <span className="line-clamp-2 block text-sm text-fg-muted">{item.body}</span>}
            </button>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Đóng thông báo"
              className="grid h-6 w-6 flex-none place-items-center rounded-md text-fg-muted hover:bg-muted"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Gắn vào `AppShell`**

`src/components/app-shell.tsx`: thêm import và prop.

```tsx
import { NotificationCenter } from "@/components/notification-center";
```

Trong chữ ký props thêm `notificationsHref: string;` (cả destructuring lẫn kiểu). Trong `<header>`, thay khối avatar bằng:

```tsx
          <div className="flex items-center gap-2.5">
            <NotificationCenter href={notificationsHref} />
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
              {initial}
            </span>
            <span className="font-medium max-[820px]:hidden">{fullName}</span>
          </div>
```

- [ ] **Step 4: Cập nhật 3 layout**

`app/user/layout.tsx`: thêm vào `NAV` (trước "Hồ sơ") `{ href: "/user/notifications", label: "Thông báo", icon: "bell" },` và truyền `notificationsHref="/user/notifications"` vào `<AppShell>`.
`app/teacher/layout.tsx`: `{ href: "/teacher/notifications", label: "Thông báo", icon: "bell" },` + `notificationsHref="/teacher/notifications"`.
`app/admin/layout.tsx`: `{ href: "/admin/notifications", label: "Thông báo", icon: "bell" },` + `notificationsHref="/admin/notifications"`.

- [ ] **Step 5: Toast-only cho trang không dùng AppShell**

`app/profile/layout.tsx` và `app/submissions/layout.tsx` không dùng `AppShell`, nên thêm popup (không chuông). Trong `app/submissions/layout.tsx`:

```tsx
import { requireUser, roleHome } from "@/lib/dal";
import { NotificationCenter } from "@/components/notification-center";

export default async function SubmissionsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-5xl px-4 pb-16">
      <NotificationCenter href={`${roleHome(user.role)}/notifications`} showBell={false} />
      {children}
    </div>
  );
}
```

`app/profile/layout.tsx`: import `NotificationCenter`, thêm `<NotificationCenter href={`${home}/notifications`} showBell={false} />` ngay trong `<div className="mx-auto ...">` (trước `<div className="flex items-center justify-between">`). (`home` đã tính sẵn trong file.)

- [ ] **Step 6: Viết `NotificationList`**

`src/components/notification-list.tsx`:

```tsx
import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { listForUser } from "@/modules/notification/service";
import { markAllReadAction, markReadAction } from "@/modules/notification/actions";
import { Pager } from "@/components/pager";

const PAGE_SIZE = 20;

export async function NotificationList({
  basePath,
  searchParams,
}: {
  basePath: string;
  searchParams: { page?: string; unread?: string };
}) {
  const user = await requireUser();
  const onlyUnread = searchParams.unread === "1";
  const requested = Number.parseInt(searchParams.page ?? "1", 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;
  const { items, total } = await listForUser(user.userId, {
    onlyUnread,
    offset: (page - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
  });

  const buildHref = (p: number) => `${basePath}?${onlyUnread ? "unread=1&" : ""}page=${p}`;

  return (
    <div className="flex flex-col gap-4 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Thông báo</h1>
        <div className="flex items-center gap-3">
          <Link
            href={onlyUnread ? basePath : `${basePath}?unread=1`}
            className="text-sm font-medium text-primary hover:underline"
          >
            {onlyUnread ? "Hiện tất cả" : "Chỉ chưa đọc"}
          </Link>
          <form action={markAllReadAction}>
            <button type="submit" className="text-sm font-medium text-fg-muted hover:text-fg">
              Đánh dấu tất cả đã đọc
            </button>
          </form>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card p-8 text-center text-fg-muted">Không có thông báo nào.</div>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {items.map((item) => (
            <li
              key={item.id}
              className={`flex items-start gap-3 px-4 py-3 ${item.isRead ? "" : "bg-primary-soft/40"}`}
            >
              <div className="min-w-0 flex-1">
                {item.link ? (
                  <Link href={item.link} className={`hover:underline ${item.isRead ? "" : "font-semibold"}`}>
                    {item.title}
                  </Link>
                ) : (
                  <span className={item.isRead ? "" : "font-semibold"}>{item.title}</span>
                )}
                {item.body && <p className="text-sm text-fg-muted">{item.body}</p>}
                <time className="text-xs text-fg-muted" dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleString("vi-VN")}
                </time>
              </div>
              {!item.isRead && (
                <form action={markReadAction.bind(null, item.id)}>
                  <button type="submit" className="whitespace-nowrap text-sm text-fg-muted hover:text-fg">
                    Đã đọc
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      <Pager page={page} pageSize={PAGE_SIZE} total={total} buildHref={buildHref} />
    </div>
  );
}
```

- [ ] **Step 7: 3 trang mỏng**

`app/user/notifications/page.tsx` (tương tự cho `teacher`, `admin`, chỉ đổi `basePath`):

```tsx
import { NotificationList } from "@/components/notification-list";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; unread?: string }>;
}) {
  return <NotificationList basePath="/user/notifications" searchParams={await searchParams} />;
}
```

(Quyền truy cập: layout từng role đã `requireRole`.)

- [ ] **Step 8: Typecheck + lint + kiểm tra giao diện**

Run: `npm run typecheck; npm run lint`
Expected: sạch. Sau đó `npm run dev`, đăng nhập 1 session, chạy lệnh `notify` như Task 3 Step 5 → thấy popup góc phải dưới, badge chuông tăng, mở dropdown thấy mục, bấm → chuyển trang và badge giảm; `/user/notifications` hiển thị mục, "Đánh dấu tất cả đã đọc" hoạt động; thu hẹp cửa sổ < 820px kiểm tra dropdown không tràn.

- [ ] **Step 9: Commit**

```bash
git add src/components app/user/layout.tsx app/teacher/layout.tsx app/admin/layout.tsx app/profile/layout.tsx app/submissions/layout.tsx app/user/notifications app/teacher/notifications app/admin/notifications
git commit -m "feat(notification): add bell, toast popup and notifications page"
```

---

### Task 5: Gắn sự kiện — `events.ts` và các điểm gọi

**Files:**
- Create: `src/modules/notification/events.ts`
- Test: `src/modules/notification/events.test.ts`
- Modify: `worker/processor.ts` (chấm bài)
- Modify: `src/modules/problem/actions.ts` (`setProblemStatusAction`)
- Modify: `src/modules/class/actions.ts` (`addStudentAction`, `removeStudentAction`)
- Modify: `src/modules/document/actions.ts` (`uploadDocumentAction`)
- Modify: `src/modules/comment/actions.ts` (`addCommentAction`, `toggleLikeAction`)
- Modify: `src/modules/contest/actions.ts` (`joinContestAction`, `startContestNowAction`)

**Interfaces:**
- Consumes: `notify` (`./service`), lookup repo funcs (Task 2).
- Produces (tất cả `Promise<void>`, không bao giờ ném):
  - `notifyJudgeResult(submissionId, result, passedCases)`
  - `notifyProblemStatus(problemId, status, actorId)` — chỉ `Public`/`Rejected`, bỏ qua khi `actorId` = creator.
  - `notifyStudentAdded(classId, studentId)`, `notifyStudentRemoved(classId, studentId)`
  - `notifyClassDocument(classId, fileName, actorId)`
  - `notifyCommentReply(parentCommentId, actorId, actorName)`
  - `notifyCommentLike(commentId, actorId, actorName)`
  - `notifyContestJoined(contestId, userId, userName)`, `notifyContestStarted(contestId, actorId)`
  - Hàm thuần xuất để test: `buildJudgeResult(problemTitle, submissionId, result, passedCases)`.

- [ ] **Step 1: Viết test (failing)**

`src/modules/notification/events.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const notify = vi.fn();
const repo = {
  submissionInfo: vi.fn(),
  problemInfo: vi.fn(),
  commentInfo: vi.fn(),
  classInfo: vi.fn(),
  classStudentIds: vi.fn(),
  contestInfo: vi.fn(),
  contestParticipantIds: vi.fn(),
};
vi.mock("./service", () => ({ notify }));
vi.mock("./repo", () => repo);

const events = await import("./events");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("buildJudgeResult", () => {
  it("shows verdict and passed count only", () => {
    const m = events.buildJudgeResult("Tổng hai số", 7, "WA", "3/10");
    expect(m.title).toContain("Tổng hai số");
    expect(m.body).toContain("WA");
    expect(m.body).toContain("3/10");
    expect(m.link).toBe("/submissions/7");
  });
});

describe("events", () => {
  it("notifies the submission owner of a verdict", async () => {
    repo.submissionInfo.mockResolvedValue({ UserID: 5, ProblemID: 9, ProblemTitle: "P" });
    await events.notifyJudgeResult(7, "AC", "10/10");
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: [5], type: "judge_result", link: "/submissions/7" }),
    );
  });

  it("does not notify on an in-between status such as Private", async () => {
    await events.notifyProblemStatus(1, "Private", 2);
    expect(notify).not.toHaveBeenCalled();
  });

  it("does not notify a creator who changed their own problem", async () => {
    repo.problemInfo.mockResolvedValue({ CreatorID: 2, Title: "P", RejectionReason: null });
    await events.notifyProblemStatus(1, "Public", 2);
    expect(notify).not.toHaveBeenCalled();
  });

  it("includes the rejection reason", async () => {
    repo.problemInfo.mockResolvedValue({ CreatorID: 3, Title: "P", RejectionReason: "Thiếu testcase" });
    await events.notifyProblemStatus(1, "Rejected", 2);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: [3], type: "problem_rejected", body: expect.stringContaining("Thiếu testcase") }),
    );
  });

  it("does not notify a user who replies to their own comment", async () => {
    repo.commentInfo.mockResolvedValue({ AuthorID: 4, ProblemID: 1, ParentID: null, LikedByUser: false });
    await events.notifyCommentReply(10, 4, "A");
    expect(notify).not.toHaveBeenCalled();
  });

  it("notifies the comment author on like but not on unlike or self-like", async () => {
    repo.commentInfo.mockResolvedValue({ AuthorID: 4, ProblemID: 1, ParentID: null, LikedByUser: true });
    await events.notifyCommentLike(10, 8, "B");
    expect(notify).toHaveBeenCalledOnce();
    notify.mockClear();
    repo.commentInfo.mockResolvedValue({ AuthorID: 4, ProblemID: 1, ParentID: null, LikedByUser: false });
    await events.notifyCommentLike(10, 8, "B");
    expect(notify).not.toHaveBeenCalled();
    repo.commentInfo.mockResolvedValue({ AuthorID: 8, ProblemID: 1, ParentID: null, LikedByUser: true });
    await events.notifyCommentLike(10, 8, "B");
    expect(notify).not.toHaveBeenCalled();
  });

  it("notifies all class students about a new document except the actor", async () => {
    repo.classInfo.mockResolvedValue({ ClassName: "C1" });
    repo.classStudentIds.mockResolvedValue([1, 2, 3]);
    await events.notifyClassDocument(5, "bai1.pdf", 2);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: [1, 2, 3], type: "class_document_added", link: "/user/classes/5" }),
    );
  });

  it("swallows lookup failures", async () => {
    repo.submissionInfo.mockRejectedValue(new Error("db"));
    await expect(events.notifyJudgeResult(1, "AC", "1/1")).resolves.toBeUndefined();
    expect(notify).not.toHaveBeenCalled();
  });

  it("notifies the contest owner on join but not when the owner joins", async () => {
    repo.contestInfo.mockResolvedValue({ CreatorID: 2, ContestName: "K1" });
    await events.notifyContestJoined(1, 9, "Học viên");
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: [2], type: "contest_joined", link: "/teacher/contests/1" }),
    );
    notify.mockClear();
    await events.notifyContestJoined(1, 2, "Chủ kỳ thi");
    expect(notify).not.toHaveBeenCalled();
  });

  it("notifies participants when a contest starts", async () => {
    repo.contestInfo.mockResolvedValue({ CreatorID: 2, ContestName: "K1" });
    repo.contestParticipantIds.mockResolvedValue([2, 5, 6]);
    await events.notifyContestStarted(1, 2);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: [5, 6], type: "contest_started", link: "/user/contests/1" }),
    );
  });
});
```

- [ ] **Step 2: Chạy, xác nhận FAIL**

Run: `npx vitest run src/modules/notification/events.test.ts`
Expected: FAIL ("Cannot find module './events'").

- [ ] **Step 3: Viết `events.ts`**

`src/modules/notification/events.ts`:

```ts
import * as repo from "./repo";
import { notify } from "./service";

const VERDICT_LABEL: Record<string, string> = {
  AC: "Chấp nhận (AC)",
  WA: "Sai kết quả (WA)",
  TLE: "Quá thời gian (TLE)",
  MLE: "Quá bộ nhớ (MLE)",
  RE: "Lỗi khi chạy (RE)",
  CE: "Lỗi biên dịch (CE)",
  IE: "Lỗi hệ thống chấm (IE)",
};

// Looking up recipients must never break the caller either.
async function safely(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    console.error("notification event failed", e);
  }
}

export function buildJudgeResult(problemTitle: string, submissionId: number, result: string, passedCases: string) {
  return {
    title: `Kết quả chấm bài "${problemTitle}"`,
    body: `${VERDICT_LABEL[result] ?? result} — đúng ${passedCases} testcase`,
    link: `/submissions/${submissionId}`,
  };
}

export function notifyJudgeResult(submissionId: number, result: string, passedCases: string) {
  return safely(async () => {
    const info = await repo.submissionInfo(submissionId);
    if (!info) return;
    await notify({
      userIds: [info.UserID],
      type: "judge_result",
      ...buildJudgeResult(info.ProblemTitle, submissionId, result, passedCases),
    });
  });
}

// Only the two outcomes a creator cares about; "Private"/"Pending" transitions stay silent.
export function notifyProblemStatus(problemId: number, status: string, actorId: number) {
  return safely(async () => {
    if (status !== "Public" && status !== "Rejected") return;
    const info = await repo.problemInfo(problemId);
    if (!info || info.CreatorID === actorId) return;
    const rejected = status === "Rejected";
    await notify({
      userIds: [info.CreatorID],
      type: rejected ? "problem_rejected" : "problem_approved",
      title: rejected ? `Bài tập "${info.Title}" bị từ chối` : `Bài tập "${info.Title}" đã được duyệt`,
      body: rejected && info.RejectionReason ? `Lý do: ${info.RejectionReason}` : undefined,
      link: `/user/problems/${problemId}`,
    });
  });
}

export function notifyStudentAdded(classId: number, studentId: number) {
  return safely(async () => {
    const cls = await repo.classInfo(classId);
    if (!cls) return;
    await notify({
      userIds: [studentId],
      type: "class_student_added",
      title: `Bạn đã được thêm vào lớp "${cls.ClassName}"`,
      link: `/user/classes/${classId}`,
    });
  });
}

export function notifyStudentRemoved(classId: number, studentId: number) {
  return safely(async () => {
    const cls = await repo.classInfo(classId);
    if (!cls) return;
    await notify({
      userIds: [studentId],
      type: "class_student_removed",
      title: `Bạn đã bị xóa khỏi lớp "${cls.ClassName}"`,
      link: "/user/classes",
    });
  });
}

export function notifyClassDocument(classId: number, fileName: string, actorId: number) {
  return safely(async () => {
    const [cls, students] = await Promise.all([repo.classInfo(classId), repo.classStudentIds(classId)]);
    if (!cls) return;
    await notify({
      userIds: students.filter((id) => id !== actorId),
      type: "class_document_added",
      title: `Tài liệu mới trong lớp "${cls.ClassName}"`,
      body: fileName,
      link: `/user/classes/${classId}`,
    });
  });
}

export function notifyCommentReply(parentCommentId: number, actorId: number, actorName: string) {
  return safely(async () => {
    const parent = await repo.commentInfo(parentCommentId, actorId);
    if (!parent || parent.AuthorID === actorId) return;
    await notify({
      userIds: [parent.AuthorID],
      type: "comment_reply",
      title: `${actorName} đã trả lời bình luận của bạn`,
      link: `/user/problems/${parent.ProblemID}`,
    });
  });
}

// Call after the toggle: only a like that is now present notifies (not an unlike).
export function notifyCommentLike(commentId: number, actorId: number, actorName: string) {
  return safely(async () => {
    const comment = await repo.commentInfo(commentId, actorId);
    if (!comment || !comment.LikedByUser || comment.AuthorID === actorId) return;
    await notify({
      userIds: [comment.AuthorID],
      type: "comment_like",
      title: `${actorName} đã thích bình luận của bạn`,
      link: `/user/problems/${comment.ProblemID}`,
    });
  });
}

export function notifyContestJoined(contestId: number, userId: number, userName: string) {
  return safely(async () => {
    const contest = await repo.contestInfo(contestId);
    if (!contest || contest.CreatorID === userId) return;
    await notify({
      userIds: [contest.CreatorID],
      type: "contest_joined",
      title: `${userName} đã tham gia kỳ thi "${contest.ContestName}"`,
      link: `/teacher/contests/${contestId}`,
    });
  });
}

export function notifyContestStarted(contestId: number, actorId: number) {
  return safely(async () => {
    const [contest, participants] = await Promise.all([
      repo.contestInfo(contestId),
      repo.contestParticipantIds(contestId),
    ]);
    if (!contest) return;
    await notify({
      userIds: participants.filter((id) => id !== actorId),
      type: "contest_started",
      title: `Kỳ thi "${contest.ContestName}" đã bắt đầu`,
      link: `/user/contests/${contestId}`,
    });
  });
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run src/modules/notification`
Expected: tất cả PASS.

- [ ] **Step 5: Gắn vào worker (kết quả chấm)**

`worker/processor.ts`: thêm import

```ts
import { notifyJudgeResult } from "@/modules/notification/events";
```

Trong closure `finish` của `judgeSubmission`, ngay sau `await saveResult({...});` và trước `return { result, passedCases };` thêm:

```ts
    await notifyJudgeResult(submission.SubmissionID, result, passedCases);
```

Trong `judgeJob`, nhánh `if (job.attempt >= job.maxAttempts)`, ngay sau `await saveResult({...IE...});` và trước `return { submissionId, result: "IE" };` thêm:

```ts
      await notifyJudgeResult(submissionId, "IE", "0/0");
```

(`notifyJudgeResult` không ném, nên không ảnh hưởng retry/verdict.)

- [ ] **Step 6: Gắn vào bài tập**

`src/modules/problem/actions.ts` — import `notifyProblemStatus` từ `@/modules/notification/events`; trong `setProblemStatusAction`, ngay sau `await repo.setProblemStatus(...)`:

```ts
  await notifyProblemStatus(problemId, status, actor.userId);
```

- [ ] **Step 7: Gắn vào lớp học & tài liệu**

`src/modules/class/actions.ts` — import `notifyStudentAdded`, `notifyStudentRemoved`.
Trong `addStudentAction`: `await classRepository.addStudent(...)` → gán `const studentId = await ...` rồi sau đó `await notifyStudentAdded(classId, studentId);` (trước `revalidatePath`).
Trong `removeStudentAction`: sau `await classRepository.removeStudent(...)` thêm `await notifyStudentRemoved(classId, studentId);`.

`src/modules/document/actions.ts` — import `notifyClassDocument`; trong `uploadDocumentAction`, sau `await documentRepository.addDocument(...)` thêm `await notifyClassDocument(classId, fileName, user.userId);`.

- [ ] **Step 8: Gắn vào bình luận & contest**

`src/modules/comment/actions.ts` — import `notifyCommentReply`, `notifyCommentLike`.
`addCommentAction`: sau `await repo.addComment(...)` (trong `try`) thêm:

```ts
    if (parsed.data.parentId) {
      await notifyCommentReply(parsed.data.parentId, user.userId, user.fullName);
    }
```

`toggleLikeAction`: sau `await repo.toggleLike(commentId, user.userId);` thêm `await notifyCommentLike(commentId, user.userId, user.fullName);`.

`src/modules/contest/actions.ts` — import `notifyContestJoined`, `notifyContestStarted`.
`joinContestAction`: sau `await contestRepository.joinContest(...)` thêm `await notifyContestJoined(contestId, user.userId, user.fullName);`.
`startContestNowAction`: sau `await contestRepository.startContestNow(...)` thêm `await notifyContestStarted(contestId, actor.userId);`.

- [ ] **Step 9: Kiểm tra toàn bộ**

Run: `npm run lint; npm run typecheck; npm test; npm run db:test`
Expected: tất cả sạch/PASS.

- [ ] **Step 10: Kiểm thử end-to-end bằng 2 session**

Với DB + Redis + `npm run dev` + `npm run worker:start` (Docker sẵn sàng):
1. Học viên (session A) nộp bài ở trang bài tập; chờ chấm xong → popup "Kết quả chấm bài …" xuất hiện không reload, chuông +1, mở `/user/notifications` thấy mục; bấm → `/submissions/<id>`, badge giảm. Kiểm tra lần lượt các verdict AC/WA/TLE/CE/RE vẫn đúng (worker không bị ảnh hưởng).
2. Giáo viên (session B) thêm A vào lớp → A thấy popup "Bạn đã được thêm vào lớp"; tải tài liệu → A popup; Admin duyệt/từ chối bài của giáo viên → giáo viên thấy popup (kèm lý do).
3. Người khác reply/like bình luận của A → A thấy popup; A tự like comment của mình → không có thông báo.
4. Học viên tham gia contest → chủ contest popup; bấm "Bắt đầu ngay" → người đã tham gia popup.
5. Dừng Redis: thao tác (nộp bài/thêm học viên) vẫn thành công, thông báo hiện ở `/…/notifications` sau khi tải lại.

- [ ] **Step 11: Commit**

```bash
git add src/modules worker/processor.ts
git commit -m "feat(notification): notify on judge results, approvals, classes, comments and contests"
```

---

### Task 6: Cập nhật tài liệu

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Thêm mục mô tả**

Trong `README.md` (phần "Luồng xử lý dữ liệu" hoặc "Kiến trúc tổng quan"), thêm đoạn ngắn: thông báo lưu ở `dbo.Notifications`, đẩy realtime qua Redis pub/sub kênh `notif:user:<id>` và SSE `/api/notifications/stream`; cách thêm sự kiện mới = thêm hàm vào `src/modules/notification/events.ts` (và loại mới vào `NOTIFICATION_TYPES`).

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs(readme): document the notification system"
```

---

## Self-Review

**Spec coverage:** §3 dữ liệu → Task 1; §4 hạ tầng → Task 2; §5 realtime (+ fallback polling, `ready`+unread) → Task 3 & `NotificationCenter` (Task 4); §6 giao diện (chuông, toast, trang, nav, a11y `role=status`) → Task 4; §7 sự kiện → Task 5; §8 lỗi/bảo mật (sở hữu, link, Redis chết) → Task 1/2/3; §9 kiểm thử → các test + bước tay; §10 YAGNI không làm thêm. **Lệch spec có chủ đích:** `contest_ended` đổi thành `contest_started` (không có điểm gọi cho "kết thúc theo thời gian"), đã ghi vào spec ở Task 1 Step 5. Bổ sung ngoài spec: toast-only cho `/profile` và `/submissions/[id]` (không dùng `AppShell`) để popup thật sự "toàn site".

**Placeholder scan:** không có TBD/TODO; mọi bước code đều có nội dung.

**Type consistency:** `NotificationItem`/`StreamMessage` (Task 2) dùng nhất quán ở route (Task 3) và component (Task 4); `notify(NotifyInput)` khớp `events.ts`; tên helper trong test (Task 5 Step 1) trùng `events.ts` (Step 3) và điểm gọi (Step 5–8); lookup `repo.*` trùng giữa Task 2 và Task 5; proc trả về cột khớp interface repo (`AuthorID`, `LikedByUser`, `ProblemTitle`…).
