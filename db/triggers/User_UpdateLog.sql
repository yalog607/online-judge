CREATE OR ALTER TRIGGER trg_User_UpdateLog
ON dbo.Users
AFTER UPDATE
AS
BEGIN
    INSERT INTO dbo.AuditLog (Action, TargetType, TargetID, Detail)
    SELECT 'UPDATE', 'User', i.UserID, 'User details updated: ' + i.Username
    FROM inserted i;
END;
GO
