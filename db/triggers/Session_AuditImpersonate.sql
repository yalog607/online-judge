CREATE OR ALTER TRIGGER dbo.trg_Sessions_AuditImpersonate
ON dbo.Sessions
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.AuditLog (ActorID, Action, TargetType, TargetID)
    SELECT 
        i.ActorID,
        'IMPERSONATE_SESSION_START',
        'User',
        i.UserID
    FROM inserted i
    WHERE i.ActorID IS NOT NULL;
END;
GO
