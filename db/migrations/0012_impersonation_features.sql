IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Sessions_Actor_Not_Self')
BEGIN
    ALTER TABLE dbo.Sessions ADD CONSTRAINT CK_Sessions_Actor_Not_Self CHECK (ActorID IS NULL OR ActorID <> UserID);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Sessions_ActorID' AND object_id = OBJECT_ID('dbo.Sessions'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Sessions_ActorID ON dbo.Sessions (ActorID) WHERE ActorID IS NOT NULL AND RevokedAt IS NULL;
END;
GO
