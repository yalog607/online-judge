# ADR 0001: Truy cập DB chỉ qua stored procedure, không dùng ORM

## Bối cảnh

Đồ án làm chung với môn DBMS, yêu cầu: dùng SQL Server, viết lệnh T-SQL kỹ (constraint,
view, index, trigger), và mọi tương tác ứng dụng ↔ DB phải qua stored procedure hoặc
function — không được viết `SELECT`/`INSERT` trực tiếp trong code ứng dụng.

## Quyết định

- Không dùng ORM (Prisma/Drizzle/TypeORM): các công cụ này sinh SQL trực tiếp, không thể
  tuân thủ yêu cầu "chỉ qua proc".
- `src/db/exec.ts` là điểm chạm DB duy nhất trong code ứng dụng: nhận tên proc + tham số,
  gọi `EXECUTE app.<proc>`, trả `recordset`/`recordsets`, và map lỗi SQL số hiệu ≥ 50000
  thành `DomainError` để tầng service xử lý theo nghiệp vụ.
- Tài khoản đăng nhập của ứng dụng chỉ có quyền `EXECUTE` trên schema `app`, bị `DENY`
  toàn bộ quyền `SELECT/INSERT/UPDATE/DELETE` trên schema `dbo`. Proc dùng ownership
  chaining để đọc/ghi bảng, nên vi phạm quy tắc sẽ gãy ngay ở tầng DB chứ không chỉ ở
  code review.
- ESLint (`eslint.config.mjs`) chặn chuỗi bắt đầu bằng từ khoá SQL trong `src/app/worker`
  như một lớp bảo vệ sớm, không thay thế cho quyền DB ở trên.
- `scripts/` (migrate, seed, db-test) không bị ràng buộc này vì đây là công cụ vận hành
  DB (chạy bằng tài khoản `sa`), tương đương vai trò DBA chứ không phải code ứng dụng.

## Hệ quả

- Mỗi tính năng mới cần viết proc trước khi có thể gọi từ ứng dụng — chậm hơn ORM nhưng
  đúng yêu cầu môn học và tách bạch rõ ràng lớp nghiệp vụ dữ liệu.
- Kiểu dữ liệu trả về từ proc được xác thực bằng Zod ở tầng service, không có type-safety
  tự động như ORM.
