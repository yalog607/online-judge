IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Documents_FileName'
)
BEGIN
    ALTER TABLE dbo.Documents
    ADD CONSTRAINT CK_Documents_FileName CHECK (LEN(RTRIM(LTRIM(FileName))) > 0);
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Documents_URL'
)
BEGIN
    ALTER TABLE dbo.Documents
    ADD CONSTRAINT CK_Documents_URL CHECK (LEN(RTRIM(LTRIM(CloudinaryURL))) > 0);
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_Documents_ClassCategory' AND object_id = OBJECT_ID('dbo.Documents')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_Documents_ClassCategory
    ON dbo.Documents (ClassID, Category, UploadDate DESC);
END;
GO
