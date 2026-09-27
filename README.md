# ITOJ Online Judge

Hệ thống luyện tập và chấm bài lập trình trực tuyến (đồ án CNPM + DBMS).

## Kiến trúc

- **Web**: Next.js 16 (App Router, Server Actions, Route Handlers), TypeScript strict.
- **DB**: SQL Server. Ứng dụng **chỉ** gọi qua stored procedure/function ở schema `app`
  (`src/db/exec.ts`); tài khoản ứng dụng bị `DENY` quyền `SELECT/INSERT/UPDATE/DELETE`
  trực tiếp trên bảng ở schema `dbo`. Toàn bộ ràng buộc, view, index, trigger nằm ở DB
  (`db/`).
- **Judge**: worker Node riêng (`worker/`), lấy job từ bảng `Submissions` (queue bằng
  `UPDLOCK, READPAST`), chạy code trong container Docker sandbox (không mạng, giới hạn
  CPU/RAM).
- **Mail**: Nodemailer (SMTP; Mailpit khi dev). **Lưu trữ file**: Cloudinary.

## Chạy dev

```bash
cp .env.example .env
docker compose up -d      # SQL Server 2022 + Mailpit
npm install
npm run db:migrate        # tạo database, áp constraint/view/proc/trigger
npm run db:seed           # tài khoản mẫu (mật khẩu: Password@123)
npm run dev
```

Mailpit UI xem OTP tại http://localhost:8025.

## Lệnh thường dùng

| Lệnh                                 | Mục đích                              |
| ------------------------------------ | ------------------------------------- |
| `npm run typecheck` / `npm run lint` | kiểm tra kiểu và style                |
| `npm test`                           | unit test (Vitest)                    |
| `npm run db:migrate`                 | áp migration + object DB mới nhất     |
| `npm run db:test`                    | chạy assertion T-SQL trong `db/tests` |
| `npm run format`                     | prettier --write                      |

## Quy ước

- Không viết SQL trực tiếp trong code ứng dụng (`src`, `app`, `worker`) — ESLint chặn,
  và quyền DB cũng chặn ở tầng database.
- Comment tối thiểu, chỉ ở chỗ logic không hiển nhiên.
- Commit message: một dòng, mô tả đủ ý, không kèm Co-Authored-By.
- Nhánh: `main` (production) ← `develop` ← `feature/*`.

## CI/CD

`\.github/workflows/ci.yml` chạy typecheck/lint/test/db:test/build trên mọi PR.
`\.github/workflows/deploy.yml` build image, đẩy GHCR, SSH lên VPS chạy
`deploy/deploy.sh` (migrate rồi mới chuyển traffic, tự rollback nếu health check lỗi).
Chi tiết hạ tầng VPS xem `docs/adr/0003-cicd-vps.md`.
