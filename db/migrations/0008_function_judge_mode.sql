ALTER TABLE dbo.Problems ADD JudgeMode VARCHAR(20) NOT NULL
    CONSTRAINT DF_Problems_JudgeMode DEFAULT 'stdin';
GO

ALTER TABLE dbo.Problems ADD FunctionSpec NVARCHAR(MAX) NULL;
GO

ALTER TABLE dbo.Problems ADD CONSTRAINT CK_Problems_JudgeMode
    CHECK (JudgeMode IN ('stdin', 'function'));
GO

ALTER TABLE dbo.Problems ADD CONSTRAINT CK_Problems_FunctionSpec
    CHECK (JudgeMode = 'stdin' OR FunctionSpec IS NOT NULL);
GO
