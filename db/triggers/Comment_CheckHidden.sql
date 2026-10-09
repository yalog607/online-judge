CREATE OR ALTER TRIGGER trg_Comment_CheckHidden
ON dbo.CommentReports
AFTER INSERT
AS
BEGIN
    UPDATE dbo.Comments
    SET IsHidden = 1
    WHERE CommentID IN (
        SELECT CommentID 
        FROM dbo.CommentReports 
        GROUP BY CommentID 
        HAVING COUNT(*) >= 5
    );
END;
GO
