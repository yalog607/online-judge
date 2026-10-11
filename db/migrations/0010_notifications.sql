-- dbo.Notifications already exists from 0001_schema.sql (unused until now); extend it in place.
ALTER TABLE dbo.Notifications ADD
    Type   VARCHAR(40) NOT NULL CONSTRAINT DF_Notifications_Type DEFAULT 'general',
    ReadAt DATETIME2(0) NULL;
GO

ALTER TABLE dbo.Notifications ALTER COLUMN Link NVARCHAR(300) NULL;
GO

ALTER TABLE dbo.Notifications ADD CONSTRAINT CK_Notifications_Title CHECK (LEN(RTRIM(LTRIM(Title))) > 0);
GO
