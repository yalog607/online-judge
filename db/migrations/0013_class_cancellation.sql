ALTER TABLE dbo.Classes
ADD IsCancelled BIT NOT NULL
    CONSTRAINT DF_Classes_IsCancelled DEFAULT 0;
GO
