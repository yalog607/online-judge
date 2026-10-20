-- Bài nộp chỉ tính vào lớp khi học viên nộp từ trong lớp đó (xem usp_Submission_Create).
ALTER TABLE dbo.Submissions
    ADD ClassID INT NULL CONSTRAINT FK_Sub_Class REFERENCES dbo.Classes(ClassID);
GO

CREATE INDEX IX_Sub_Class ON dbo.Submissions (ClassID, UserID, ProblemID) WHERE ClassID IS NOT NULL;
GO

-- Gắn lại các bài nộp cũ vào lớp khi chỉ có đúng một lớp phù hợp (học viên trong lớp, lớp có bài này,
-- nộp sau khi vào lớp). Bài nộp mơ hồ (nhiều lớp cùng giao bài) hoặc nộp ngoài lớp để ClassID = NULL.
UPDATE s
SET ClassID = m.ClassID
FROM dbo.Submissions s
CROSS APPLY (
    SELECT MIN(cs.ClassID) AS ClassID, COUNT(*) AS Cnt
    FROM dbo.Class_Student cs
    JOIN dbo.Class_Problem cp ON cp.ClassID = cs.ClassID AND cp.ProblemID = s.ProblemID
    WHERE cs.UserID = s.UserID AND cs.JoinDate <= s.SubmitTime
) m
WHERE s.ContestID IS NULL AND m.Cnt = 1;
GO
