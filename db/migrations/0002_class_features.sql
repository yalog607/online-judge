IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CS_Class' AND object_id = OBJECT_ID('dbo.Class_Student'))
BEGIN
    CREATE INDEX IX_CS_Class ON dbo.Class_Student (ClassID);
END;
GO
