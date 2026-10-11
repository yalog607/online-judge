ALTER TABLE dbo.Problems ADD ProposedStatus VARCHAR(20) NULL;
GO

ALTER TABLE dbo.Problems ADD CONSTRAINT CK_Problems_ProposedStatus
    CHECK (ProposedStatus IS NULL OR ProposedStatus IN ('Public', 'Private'));
GO
