UPDATE dbo.Problems 
SET Status = 'Private' 
WHERE Status IN ('ClassOnly', 'ContestOnly');
GO

UPDATE dbo.Problems 
SET Status = 'Hidden' 
WHERE Status = 'Locked';
GO

ALTER TABLE dbo.Problems DROP CONSTRAINT CK_Problems_Status;
GO

ALTER TABLE dbo.Problems ADD CONSTRAINT CK_Problems_Status 
    CHECK (Status IN ('Public', 'Private', 'Hidden'));
GO
