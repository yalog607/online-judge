#!/usr/bin/env bash
# Sao lưu DB SQL Server (container `db` của docker-compose.prod.yml) ra backups/.
# Chạy tay:        bash deploy/backup.sh
# Giữ N bản mới:   KEEP=30 bash deploy/backup.sh
# deploy.sh cũng gọi script này trước khi migrate.
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f docker-compose.prod.yml)
KEEP="${KEEP:-14}"

DB_NAME="${DB_NAME:-}"
if [ -z "$DB_NAME" ] && [ -f .env ]; then
  DB_NAME="$(grep -E '^DB_NAME=' .env | tail -1 | cut -d= -f2- | tr -d '"\r' || true)"
fi
DB_NAME="${DB_NAME:-itoj}"
[[ "$DB_NAME" =~ ^[A-Za-z0-9_]+$ ]] || { echo "DB_NAME không hợp lệ" >&2; exit 1; }
[[ "$KEEP" =~ ^[0-9]+$ ]] && [ "$KEEP" -ge 1 ] || { echo "KEEP phải là số nguyên >= 1" >&2; exit 1; }

# Mật khẩu SA lấy từ biến môi trường trong container, không đi qua host.
sqlcmd_raw() {
  "${COMPOSE[@]}" exec -T db sh -c \
    '/opt/mssql-tools18/bin/sqlcmd -C -b -S localhost -U sa -P "$MSSQL_SA_PASSWORD" "$@"' _ "$@"
}

mkdir -p backups 2>/dev/null || true
if command -v flock >/dev/null 2>&1; then
  exec 9>"${TMPDIR:-/tmp}/itoj-backup.lock"
  flock -n 9 || { echo "Một tiến trình backup khác đang chạy" >&2; exit 1; }
fi

exists="$(sqlcmd_raw -h -1 -W -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM sys.databases WHERE name = N'$DB_NAME'" | tr -d '[:space:]')"
if [ "$exists" != "1" ]; then
  echo "Database [$DB_NAME] chưa tồn tại, bỏ qua backup."
  exit 0
fi

# Thư mục bind mount do host tạo (root) nên user mssql chưa ghi được; cấp quyền từ trong container.
"${COMPOSE[@]}" exec -T -u 0 db chown mssql:root /backups

file="${DB_NAME}_$(date -u +%Y%m%d_%H%M%S).bak"
path="/backups/$file"

echo "Backup [$DB_NAME] -> backups/$file"
sqlcmd_raw -Q "BACKUP DATABASE [$DB_NAME] TO DISK = N'$path' WITH COMPRESSION, CHECKSUM, INIT, STATS = 25"
sqlcmd_raw -Q "RESTORE VERIFYONLY FROM DISK = N'$path' WITH CHECKSUM"

# Chỉ dọn bản cũ sau khi bản mới đã verify. Xóa trong container vì file thuộc user mssql.
"${COMPOSE[@]}" exec -T db sh -c \
  'cd /backups && ls -1t "$1"_*.bak 2>/dev/null | tail -n +"$2" | xargs -r rm -f --' _ "$DB_NAME" "$((KEEP + 1))"

echo "Xong: backups/$file (giữ tối đa $KEEP bản)"
