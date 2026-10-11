-- Judging is function-based only. The JudgeMode switch ('stdin' | 'function') is removed;
-- FunctionSpec stays nullable so legacy stdin problems remain readable but cannot be judged
-- until a teacher configures a function signature for them.
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Problems_FunctionSpec' AND parent_object_id = OBJECT_ID('dbo.Problems'))
    ALTER TABLE dbo.Problems DROP CONSTRAINT CK_Problems_FunctionSpec;
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Problems_JudgeMode' AND parent_object_id = OBJECT_ID('dbo.Problems'))
    ALTER TABLE dbo.Problems DROP CONSTRAINT CK_Problems_JudgeMode;
GO

IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_Problems_JudgeMode' AND parent_object_id = OBJECT_ID('dbo.Problems'))
    ALTER TABLE dbo.Problems DROP CONSTRAINT DF_Problems_JudgeMode;
GO

IF COL_LENGTH('dbo.Problems', 'JudgeMode') IS NOT NULL
    ALTER TABLE dbo.Problems DROP COLUMN JudgeMode;
GO
