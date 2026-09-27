# ADR 0003: CI/CD build image → GHCR → SSH deploy lên VPS

## Bối cảnh

Cần deploy tự động lên một VPS (không dùng nền tảng PaaS như Vercel, vì worker cần
Docker socket để sandbox code, và SQL Server cần chạy dài hạn trên máy chủ mình quản lý).

## Quyết định

- **CI** (`ci.yml`): mọi PR vào `develop`/`main` chạy typecheck, lint, unit test, dựng
  SQL Server bằng service container để chạy `db:migrate` + `db:test`, rồi build.
- **CD** (`deploy.yml`): chỉ chạy khi push `main`. Build image `web` và `worker` (worker
  image cũng chứa `db/`, `scripts/` để chạy migrate), đẩy lên GHCR, SSH vào VPS, đồng bộ
  file compose/Caddyfile, chạy `deploy/deploy.sh`.
- `deploy.sh`: kéo image mới → chạy migrate qua container `worker` một lần trước khi bật
  `web`/`worker` mới → health check `/api/health` (proc `usp_System_Ping`) → tự rollback
  `web` về image cũ nếu health check thất bại.
- **VPS stack**: Caddy (auto-HTTPS, reverse proxy) → `web`; `worker` mount Docker socket
  để sandbox; SQL Server container với volume bền vững, thư mục `backups/` để
  `BACKUP DATABASE` định kỳ (cron ngoài compose).

## Việc cần làm khi có VPS thật

Thêm secrets ở GitHub Environment `production`: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`,
`CI_DB_SA_PASSWORD`, `CI_DB_APP_PASSWORD`, `CI_SESSION_SECRET`; tạo `/opt/itoj/.env` trên
VPS từ `.env.example`; đặt `DOMAIN` cho Caddyfile.
