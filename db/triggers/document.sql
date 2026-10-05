CREATE OR ALTER TRIGGER dbo.trg_Documents_AuditLog
ON dbo.Documents
AFTER INSERT, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM inserted)
    BEGIN
        INSERT INTO dbo.AuditLog (ActorID, Action, TargetType, TargetID, Detail)
        SELECT 
            c.TeacherID,
            'DOCUMENT_UPLOAD',
            'Document',
            i.DocumentID,
            i.FileName
        FROM inserted i
        LEFT JOIN dbo.Classes c ON i.ClassID = c.ClassID;
    END;

    IF EXISTS (SELECT 1 FROM deleted) AND NOT EXISTS (SELECT 1 FROM inserted)
    BEGIN
        INSERT INTO dbo.AuditLog (ActorID, Action, TargetType, TargetID, Detail)
        SELECT 
            NULL,
            'DOCUMENT_DELETE',
            'Document',
            d.DocumentID,
            d.FileName
        FROM deleted d;
    END;
END;
GO
