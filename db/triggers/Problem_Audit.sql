CREATE OR ALTER TRIGGER trg_Problem_Audit
ON dbo.Problems
AFTER INSERT
AS
BEGIN
    INSERT INTO dbo.AuditLog (ActorID, Action, TargetType, TargetID, Detail)
    SELECT CreatorID, 'CREATE', 'Problem', ProblemID, Title
    FROM inserted;
END;
GO
