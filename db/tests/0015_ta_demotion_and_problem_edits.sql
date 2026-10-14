DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);

DECLARE @TeacherID INT, @TAID INT, @ClassID INT, @ProblemID INT;
INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES
 ('ta_mgr_teacher_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8), 'hash', 'tamgr_t_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8) + '@test.com', N'TA Class Teacher', 'Teacher'),
 ('ta_mgr_ta_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8), 'hash', 'tamgr_ta_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8) + '@test.com', N'TA Problem Creator', 'TA');

SELECT @TeacherID = MAX(CASE WHEN FullName = N'TA Class Teacher' THEN UserID END),
       @TAID = MAX(CASE WHEN FullName = N'TA Problem Creator' THEN UserID END)
FROM dbo.Users;

-- Tạo lớp học và gán TA vào lớp
INSERT dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus)
VALUES (@TeacherID, 'TC' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 10), N'TA Problem Management Class', 1, 'Approved');
SET @ClassID = SCOPE_IDENTITY();
INSERT dbo.Class_TA (ClassID, UserID_TA) VALUES (@ClassID, @TAID);

-- 1. TA tạo bài tập gán cho lớp
DECLARE @NewProblem TABLE (ProblemID INT);
INSERT @NewProblem
EXEC app.usp_Problem_Create
    @CreatorID = @TAID,
    @Title = N'TA Math Problem',
    @Statement = N'Initial Statement',
    @InputFormat = N'N',
    @OutputFormat = N'N',
    @TimeLimit = 1000,
    @MemoryLimit = 256,
    @Tags = N'math',
    @Difficulty = 'Easy',
    @Status = 'Public',
    @ClassID = @ClassID;
SELECT @ProblemID = ProblemID FROM @NewProblem;

-- Thêm testcase ban đầu
EXEC app.usp_Testcase_ReplaceAll 
    @ProblemID = @ProblemID, 
    @ActorID = @TAID, 
    @TestcasesJson = N'[{"input":"1","expectedOutput":"1","isHidden":false},{"input":"2","expectedOutput":"2","isHidden":true}]';

INSERT @Results VALUES ('TA problem created with Pending status',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID = @ProblemID AND Status = 'Pending') THEN 1 ELSE 0 END);

-- 2. Giảng viên sở hữu lớp duyệt bài tập thành Public
EXEC app.usp_Problem_SetStatus @ProblemID = @ProblemID, @ActorID = @TeacherID, @Status = 'Public';
INSERT @Results VALUES ('Teacher can approve TA problem in their class',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID = @ProblemID AND Status = 'Public') THEN 1 ELSE 0 END);

-- 3. Giảng viên của lớp có quyền xem testcase ẩn
BEGIN TRY
    EXEC app.usp_Testcase_ListForOwner @ProblemID = @ProblemID, @ActorID = @TeacherID;
    INSERT @Results VALUES ('Teacher of the class can view owner testcases', 1);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Teacher of the class can view owner testcases', 0);
END CATCH;

-- 4. TA sửa metadata trên bài đã duyệt -> Vẫn giữ Public dù form gửi Status = Pending
EXEC app.usp_Problem_Update
    @ProblemID = @ProblemID,
    @ActorID = @TAID,
    @Title = N'TA Math Problem',
    @Statement = N'Initial Statement',
    @InputFormat = N'N',
    @OutputFormat = N'N',
    @TimeLimit = 1000,
    @MemoryLimit = 256,
    @Tags = N'math,easy',
    @Difficulty = 'Easy',
    @Status = 'Pending';

INSERT @Results VALUES ('TA metadata edit preserves approved status despite hidden Pending form value',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID = @ProblemID AND Status = 'Public' AND Tags = N'math,easy') THEN 1 ELSE 0 END);

-- 5. TA thực hiện Major Edit (sửa TimeLimit) trên bài đã duyệt -> Tự động chuyển về Pending
EXEC app.usp_Problem_Update
    @ProblemID = @ProblemID,
    @ActorID = @TAID,
    @Title = N'TA Math Problem Updated',
    @Statement = N'Updated Statement',
    @InputFormat = N'N',
    @OutputFormat = N'N',
    @TimeLimit = 2000, -- thay đổi TimeLimit
    @MemoryLimit = 256,
    @Tags = N'math,easy',
    @Difficulty = 'Easy',
    @Status = 'Pending';

INSERT @Results VALUES ('TA major edit (TimeLimit) automatically resets status to Pending',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID = @ProblemID AND Status = 'Pending' AND TimeLimit = 2000) THEN 1 ELSE 0 END);

-- Duyệt lại bài
EXEC app.usp_Problem_SetStatus @ProblemID = @ProblemID, @ActorID = @TeacherID, @Status = 'Public';

-- 6. TA thực hiện Major Edit (sửa Testcase) trên bài đã duyệt -> Tự động chuyển về Pending
EXEC app.usp_Testcase_ReplaceAll 
    @ProblemID = @ProblemID, 
    @ActorID = @TAID, 
    @TestcasesJson = N'[{"input":"10","expectedOutput":"10","isHidden":false}]';

INSERT @Results VALUES ('TA major edit (Testcases) automatically resets status to Pending',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Problems WHERE ProblemID = @ProblemID AND Status = 'Pending') THEN 1 ELSE 0 END);

-- Duyệt lại bài
EXEC app.usp_Problem_SetStatus @ProblemID = @ProblemID, @ActorID = @TeacherID, @Status = 'Public';

-- 7. Giáng chức TA thành User
UPDATE dbo.Users SET Role = 'User' WHERE UserID = @TAID;
DELETE FROM dbo.Class_TA WHERE UserID_TA = @TAID;

-- 8. Cựu TA (bây giờ là User) cố gắng sửa bài tập -> Phải bị chặn
BEGIN TRY
    EXEC app.usp_Problem_Update
        @ProblemID = @ProblemID,
        @ActorID = @TAID,
        @Title = N'Hacked Title',
        @Statement = N'Hacked',
        @InputFormat = NULL,
        @OutputFormat = NULL,
        @TimeLimit = 1000,
        @MemoryLimit = 256,
        @Tags = NULL,
        @Difficulty = 'Easy';
    INSERT @Results VALUES ('Demoted TA cannot edit problem', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Demoted TA cannot edit problem', 1);
END CATCH;

-- 9. Cựu TA cố gắng xem testcase ẩn -> Phải bị chặn
BEGIN TRY
    EXEC app.usp_Testcase_ListForOwner @ProblemID = @ProblemID, @ActorID = @TAID;
    INSERT @Results VALUES ('Demoted TA cannot view hidden testcases', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Demoted TA cannot view hidden testcases', 1);
END CATCH;

-- 10. Cựu TA cố gắng sửa testcase -> Phải bị chặn
BEGIN TRY
    EXEC app.usp_Testcase_ReplaceAll 
        @ProblemID = @ProblemID, 
        @ActorID = @TAID, 
        @TestcasesJson = N'[{"input":"bad","expectedOutput":"bad","isHidden":false}]';
    INSERT @Results VALUES ('Demoted TA cannot replace testcases', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Demoted TA cannot replace testcases', 1);
END CATCH;

-- 11. Giảng viên của lớp vẫn có toàn quyền quản lý bài tập
BEGIN TRY
    EXEC app.usp_Problem_Update
        @ProblemID = @ProblemID,
        @ActorID = @TeacherID,
        @Title = N'Teacher Managed Title',
        @Statement = N'Teacher refined statement',
        @InputFormat = N'N',
        @OutputFormat = N'N',
        @TimeLimit = 1000,
        @MemoryLimit = 256,
        @Tags = N'math',
        @Difficulty = 'Easy',
        @Status = 'Public';
    INSERT @Results VALUES ('Teacher retains full management of class problem after TA demotion', 1);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('Teacher retains full management of class problem after TA demotion', 0);
END CATCH;

DELETE FROM dbo.Testcases WHERE ProblemID = @ProblemID;
DELETE FROM dbo.Class_Problem WHERE ProblemID = @ProblemID;
DELETE FROM dbo.Problems WHERE ProblemID = @ProblemID;
DELETE FROM dbo.Class_TA WHERE ClassID = @ClassID;
DELETE FROM dbo.Classes WHERE ClassID = @ClassID;
DELETE FROM dbo.Users WHERE UserID IN (@TeacherID, @TAID);

SELECT Assertion, Passed FROM @Results;
