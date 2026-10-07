ALTER TABLE dbo.Submissions DROP CONSTRAINT CK_Sub_Language;
GO

ALTER TABLE dbo.Submissions ADD CONSTRAINT CK_Sub_Language
    CHECK (Language IN ('cpp','c','java','python','javascript','go','csharp'));
GO
