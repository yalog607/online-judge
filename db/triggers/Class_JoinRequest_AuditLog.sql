CREATE OR ALTER TRIGGER dbo.trg_Class_JoinRequest_AuditLog
ON dbo.Class_JoinRequests
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO dbo.AuditLog (ActorID, Action, TargetType, TargetID, Detail)
        SELECT i.UserID, 'REQUEST_JOIN_CLASS', 'Class_JoinRequests', i.RequestID, 
               CONCAT('Student applied for ClassID: ', i.ClassID)
        FROM inserted i;
    END
    ELSE IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO dbo.AuditLog (ActorID, Action, TargetType, TargetID, Detail)
        SELECT i.ReviewedBy, CONCAT('REVIEW_JOIN_REQUEST_', i.Status), 'Class_JoinRequests', i.RequestID,
               CONCAT('Status changed to ', i.Status, ' for Student UserID: ', i.UserID)
        FROM inserted i
        JOIN deleted d ON i.RequestID = d.RequestID
        WHERE i.Status <> d.Status;
    END
END;
GO
