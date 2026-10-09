# Báo Cáo Đồ Án Cuối Kỳ
**Học phần:** HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284)
**Đề tài:** XÂY DỰNG HỆ THỐNG CHẤM BÀI LẬP TRÌNH TRỰC TUYẾN (ITOJ) CÓ KẾT NỐI VỚI SQL SERVER

---

## 1. Trang bìa, Mục lục, Danh mục hình/bảng
- **Trang bìa:** Tên trường, khoa, môn học, tên đề tài, danh sách thành viên nhóm, mã số sinh viên, GVHD.
- **Mục lục:** Cấu trúc chi tiết các phần của báo cáo.
- **Danh mục hình/bảng:** Liệt kê các hình ảnh, bảng biểu có trong báo cáo kèm số trang.

## 2. Chương 1: Tổng quan đề tài
- **Lý do chọn đề tài:** Tầm quan trọng của việc tự động hóa chấm bài lập trình (Online Judge), hỗ trợ giảng viên và sinh viên học tập.
- **Phát biểu bài toán:** Nghiệp vụ quản lý sinh viên, bài tập (Problems), bài nộp (Submissions), các kỳ thi (Contests), lớp học (Classes) và chấm bài tự động bằng Judge Worker (Docker).
- **Phạm vi thực hiện:** Quản lý người dùng, lớp học, kỳ thi, nộp mã nguồn, chấm tự động AC/WA/TLE/RE... và bảng xếp hạng.

## 3. Chương 2: Phân tích & thiết kế CSDL
- **Mô hình thực thể - kết hợp (ERD):** Sơ đồ ERD từ các bảng cốt lõi (Users, Problems, Submissions, Contests, Classes, Documents,...).
- **Lược đồ quan hệ (Relational Schema):** Chuyển đổi từ ERD sang bảng, liệt kê khóa chính, khóa ngoại (Chuẩn hóa 3NF).
- **Mô tả chi tiết từng bảng:** Mô tả cấu trúc các bảng trong file `0001_schema.sql` (Tên cột, kiểu dữ liệu, các ràng buộc DEFAULT, CHECK, ý nghĩa thuộc tính).

## 4. Chương 3: Cài đặt CSDL trên SQL Server
- **Script tạo bảng & Ràng buộc:** Script SQL trong thư mục `db/migrations` và giải thích các ràng buộc toàn vẹn.
- **Trigger (Tối thiểu 5):** Giải thích và trích code các trigger trong `db/triggers/` (vd: `Comment_CheckHidden`, `Contest_DateCheck`, `Problem_Audit`, `Submission_PreventDelete`, `User_UpdateLog`, hoặc trong `contest.sql`).
- **View (Tối thiểu 5):** Giải thích các view trong `db/views/` (vd: `vw_Leaderboard`, `vw_RecentSubmissions`, `vw_UserStats`, `vw_ContestStandings`, `vw_ProblemStats`).
- **Index (Tối thiểu 5):** Giải thích các Index (Non-Clustered) phục vụ tăng tốc độ truy vấn (vd: Index trên UserRole, Submission Date, ProblemID) - minh họa cải thiện hiệu năng.
- **Stored Procedure & Function:**
  - **Stored Procedure:** Giải thích các SP quan trọng trong `db/procs/` dùng để Insert/Update/Delete và nghiệp vụ phức tạp (vd: `usp_User_Register`, `usp_Problem_Create`, `usp_Judge_Claim`, `usp_Submission_Create`, `usp_Contest_AddProblem`...). Có minh họa xử lý lỗi `TRY...CATCH`.
  - **User-Defined Function (UDF):** Giải thích các function trong `db/functions/` (vd: `CalculatePenaltyTime`, `GetProblemACRate`, `GetRemainingTime`, `GetTotalScore`, `IsContestRunning`).

## 5. Chương 4: Quản lý giao dịch & Bảo mật
- **Minh họa Transaction:** Phân tích các Stored Procedure có sử dụng `BEGIN TRAN / COMMIT / ROLLBACK` để đảm bảo ACID. (Ví dụ: quy trình chấm bài từ hàng đợi, nộp bài, hoặc tạo kỳ thi mới).
- **Phân quyền Role/User:** 
  - Mô tả các Role trong hệ thống: `Admin`, `Teacher`, `TA` (Trợ giảng), `Student` (hoặc `Guest`).
  - Minh họa các lệnh GRANT/REVOKE/DENY phân quyền trên CSDL, đảm bảo ứng dụng chỉ gọi thông qua schema `app`.
- **Quản trị CSDL:** Có trình bày quá trình tái cấu trúc (Rebuild/Reorganize) Index để tối ưu, và thực hiện các lệnh sao lưu, phục hồi dữ liệu (Backup/Restore).

## 6. Chương 5: Xây dựng ứng dụng
- **Kiến trúc hệ thống & Công nghệ:** 
  - Web App: Next.js App Router, TypeScript, TailwindCSS.
  - Judge Worker: Chạy ngầm bằng Node.js, sử dụng Redis/BullMQ làm hàng đợi, Docker sandbox để biên dịch/chạy mã nguồn.
  - Database: SQL Server.
- **Mô tả các màn hình chức năng:** Chụp màn hình và giải thích các trang (đăng nhập/đăng ký, danh sách bài tập, chi tiết bài tập & nộp bài, bảng xếp hạng kỳ thi, trang quản trị Admin/Teacher). *Nhấn mạnh việc gọi Stored Procedure thông qua DB repository, không viết SQL rời rạc*.

## 7. Chương 6: Kết luận & Hướng phát triển
- **Kết quả đạt được:** Hoàn thành module nộp bài, chấm điểm tự động, quản lý kỳ thi an toàn.
- **Hạn chế:** Giới hạn tải của hệ thống, hoặc một số bài toán chấm điểm nâng cao chưa có.
- **Đề xuất phát triển:** Scale worker thành nhiều máy chủ, hỗ trợ thêm ngôn ngữ lập trình, hệ thống gợi ý bài tập.

## 8. Tài liệu tham khảo
- Tài liệu môn DBMS, Docs SQL Server, Next.js, Docker.

## 9. Phụ lục
- **Bảng phân công công việc:** Ai làm web, ai làm worker, ai viết script DB.
- **Source code chính:** Trích dẫn các function quan trọng của Next.js gọi `src/db/exec.ts` và script Stored Procedure.

---
**Quy định nộp bài quan trọng:**
- Định dạng Word/PDF, font Times New Roman 13, giãn dòng 1.5, từ 50-100 trang.
- Đặt tên file: Nhom_STT_TenDeTai (vd: Nhom01_QuanLyHeThongITOJ).
- Nộp kèm file backup CSDL (.bak) hoặc script (.sql) và mã nguồn (zip/rar có README).
