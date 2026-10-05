ALTER TABLE dbo.Contests ADD ClassID INT NULL CONSTRAINT FK_Contests_Class REFERENCES dbo.Classes(ClassID) ON DELETE SET NULL;
GO

ALTER TABLE dbo.Contests ADD CONSTRAINT CK_Contests_Name CHECK (LEN(TRIM(ContestName)) > 0);
GO

CREATE NONCLUSTERED INDEX IX_Contests_Class ON dbo.Contests (ClassID) WHERE ClassID IS NOT NULL;
GO

CREATE NONCLUSTERED INDEX IX_Contests_Creator ON dbo.Contests (CreatorID);
GO

CREATE NONCLUSTERED INDEX IX_Contest_Problem_Order ON dbo.Contest_Problem (ContestID, OrderIndex);
GO
