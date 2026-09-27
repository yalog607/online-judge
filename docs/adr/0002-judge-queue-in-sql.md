# ADR 0002: Hàng đợi chấm bài dùng bảng SQL, không dùng Redis/queue riêng

## Bối cảnh

Cần một hàng đợi cho worker chấm bài lấy job an toàn khi chạy nhiều worker song song,
mà không muốn thêm một hạ tầng (Redis) chỉ để phục vụ một nhu cầu đơn giản.

## Quyết định

Dùng chính bảng `Submissions` làm hàng đợi: bản ghi `Result = 'Pending'` là job chờ.
Proc `usp_Judge_ClaimNext` (Phase 2) khoá và đánh dấu một dòng bằng
`UPDLOCK, READPAST, ROWLOCK` trong một transaction ngắn, đảm bảo nhiều worker không lấy
trùng job mà không cần khoá bảng. Bảng `JudgeWorkers` lưu heartbeat để màn hình giám sát
Judge Engine (Admin) biết worker nào còn sống.

## Hệ quả

- Không thêm thành phần hạ tầng mới; toàn bộ trạng thái nằm trong SQL Server đã có.
- Không phù hợp nếu số lượng submission/giây rất lớn (ngoài phạm vi đồ án); nếu cần mở
  rộng sau này, có thể thay bằng Redis/queue chuyên dụng mà không đổi API của Judge
  worker.
