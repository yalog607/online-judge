#!/usr/bin/env bash
# Khôi phục DB từ một file trong backups/.
#   bash deploy/restore.sh                      # liệt kê các bản backup
#   bash deploy/restore.sh itoj_X.bak           # restore vào DB tạm <DB_NAME>_restore_test (an toàn)
#   bash deploy/restore.sh itoj_X.bak --target itoj [--yes]
#                                               # GHI ĐÈ DB thật: dừng web/worker, backup lại, restore, bật lại
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f docker-compose.prod.yml)

DB_NAME="${DB_NAME:-}"
if [ -z "$DB_NAME" ] && [ -f .env ]; then
  DB_NAME="$(grep -E '^DB_NAME=' .env | tail -1 | cut -d= -f2- | tr -d '"\r' || true)"
fi
DB_NAME="${DB_NAME:-itoj}"
[[ "$DB_NAME" =~ ^[A-Za-z0-9_]+$ ]] || { echo "DB_NAME không hợp lệ" >&2; exit 1; }

sqlcmd_raw() {
  "${COMPOSE[@]}" exec -T db sh -c \
    '/opt/mssql-tools18/bin/sqlcmd -C -b -S localhost -U sa -P "$MSSQL_SA_PASSWORD" "$@"' _ "$@"
}

list_backups() {
  echo "Các bản backup trong backups/ (mới nhất trước):"
  "${COMPOSE[@]}" exec -T db sh -c 'cd /backups && ls -1t *.bak 2>/dev/null || true' | sed 's/^/  /'
}

FILE=""
TARGET="${DB_NAME}_restore_test"
ASSUME_YES=0
while [ $# -gt 0 ]; do
  case "$1" in
    --target) TARGET="${2:-}"; shift 2 ;;
    --yes) ASSUME_YES=1; shift ;;
    -h|--help) sed -n 2,7p "$0"; exit 0 ;;
    -*) echo "Tham số không hợp lệ: $1" >&2; exit 1 ;;
    *) [ -z "$FILE" ] || { echo "Chỉ được chỉ định một file" >&2; exit 1; }; FILE="$1"; shift ;;
  esac
done

if [ -z "$FILE" ]; then
  list_backups
  echo
  echo "Dùng: bash deploy/restore.sh <tên-file.bak> [--target $DB_NAME] [--yes]"
  exit 0
fi

[[ "$FILE" =~ ^[A-Za-z0-9._-]+\.bak$ ]] || { echo "Tên file không hợp lệ: $FILE" >&2; exit 1; }
[[ "$TARGET" =~ ^[A-Za-z0-9_]+$ ]] || { echo "Tên DB đích không hợp lệ" >&2; exit 1; }
if [ "$TARGET" != "$DB_NAME" ] && [[ "$TARGET" != *_restore_test ]]; then
  echo "DB đích chỉ được là '$DB_NAME' hoặc tên kết thúc bằng _restore_test" >&2
  exit 1
fi

if ! "${COMPOSE[@]}" exec -T db test -f "/backups/$FILE"; then
  echo "Không tìm thấy backups/$FILE" >&2
  list_backups >&2
  exit 1
fi

path="/backups/$FILE"
echo "Kiểm tra file $FILE ..."
sqlcmd_raw -Q "RESTORE VERIFYONLY FROM DISK = N'$path' WITH CHECKSUM"

data_logical="$(sqlcmd_raw -h -1 -W -s '|' -Q "SET NOCOUNT ON; RESTORE FILELISTONLY FROM DISK = N'$path'" | awk -F'|' '$3=="D"{print $1; exit}')"
log_logical="$(sqlcmd_raw -h -1 -W -s '|' -Q "SET NOCOUNT ON; RESTORE FILELISTONLY FROM DISK = N'$path'" | awk -F'|' '$3=="L"{print $1; exit}')"
[ -n "$data_logical" ] && [ -n "$log_logical" ] || { echo "Không đọc được danh sách file trong backup" >&2; exit 1; }
[[ "$data_logical$log_logical" =~ ^[A-Za-z0-9_.\ -]+$ ]] || { echo "Tên logical file bất thường" >&2; exit 1; }

restore_sql="RESTORE DATABASE [$TARGET] FROM DISK = N'$path' WITH CHECKSUM, REPLACE, \
MOVE N'$data_logical' TO N'/var/opt/mssql/data/${TARGET}.mdf', \
MOVE N'$log_logical' TO N'/var/opt/mssql/data/${TARGET}_log.ldf', STATS = 25"

if [ "$TARGET" != "$DB_NAME" ]; then
  echo "Restore vào DB tạm [$TARGET] (không ảnh hưởng DB thật)"
  sqlcmd_raw -Q "IF DB_ID(N'$TARGET') IS NOT NULL BEGIN ALTER DATABASE [$TARGET] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$TARGET]; END"
  sqlcmd_raw -Q "$restore_sql"
  echo "Xong. Kiểm tra dữ liệu rồi xóa DB tạm: DROP DATABASE [$TARGET]"
  exit 0
fi

echo "CẢNH BÁO: sẽ GHI ĐÈ database [$DB_NAME] bằng $FILE và tạm dừng web/worker."
if [ "$ASSUME_YES" -ne 1 ]; then
  [ -t 0 ] || { echo "Không có terminal để xác nhận; dùng --yes nếu thật sự muốn tự động." >&2; exit 1; }
  read -r -p "Gõ đúng tên DB '$DB_NAME' để xác nhận: " answer
  [ "$answer" = "$DB_NAME" ] || { echo "Đã hủy."; exit 1; }
fi

echo "Backup DB hiện tại làm điểm quay lại ..."
bash deploy/backup.sh

echo "Dừng web/worker ..."
"${COMPOSE[@]}" stop web worker

sqlcmd_raw -Q "IF DB_ID(N'$DB_NAME') IS NOT NULL ALTER DATABASE [$DB_NAME] SET SINGLE_USER WITH ROLLBACK IMMEDIATE"
if ! sqlcmd_raw -Q "$restore_sql"; then
  sqlcmd_raw -Q "IF DB_ID(N'$DB_NAME') IS NOT NULL ALTER DATABASE [$DB_NAME] SET MULTI_USER" || true
  echo "Restore thất bại. web/worker vẫn đang dừng; kiểm tra rồi chạy: ${COMPOSE[*]} up -d web worker" >&2
  exit 1
fi
sqlcmd_raw -Q "ALTER DATABASE [$DB_NAME] SET MULTI_USER"

echo "Bật lại web/worker ..."
"${COMPOSE[@]}" up -d --no-deps web worker
echo "Đã khôi phục [$DB_NAME] từ $FILE"
