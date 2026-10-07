ALTER TABLE dbo.Problems DROP CONSTRAINT CK_Problems_Status;
GO

ALTER TABLE dbo.Problems ADD CONSTRAINT CK_Problems_Status 
    CHECK (Status IN ('Public', 'ClassOnly', 'ContestOnly', 'Hidden', 'Private'));
GO
