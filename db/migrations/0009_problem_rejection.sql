ALTER TABLE dbo.Problems ADD RejectionReason NVARCHAR(MAX) NULL;
GO

ALTER TABLE dbo.Problems DROP CONSTRAINT CK_Problems_Status;
GO

ALTER TABLE dbo.Problems ADD CONSTRAINT CK_Problems_Status CHECK (Status IN ('Public', 'Private', 'Hidden', 'Pending', 'Rejected'));
GO
