-- Aggregated notifications (e.g. "N people joined your contest") keep their running count here.
ALTER TABLE dbo.Notifications ADD GroupCount INT NOT NULL CONSTRAINT DF_Notifications_GroupCount DEFAULT 1;
GO
