-- Source size cap (characters) as a safety net behind app.usp_Submission_Create and the Zod check.
-- WITH NOCHECK keeps existing rows untouched; new rows are validated.
ALTER TABLE dbo.Submissions WITH NOCHECK
    ADD CONSTRAINT CK_Sub_SourceLen CHECK (LEN(SourceCode) <= 65536);
GO

-- Supports the per-user Pending/Judging count in app.usp_Submission_Create.
CREATE INDEX IX_Sub_UserActive ON dbo.Submissions (UserID) WHERE Result IN ('Pending', 'Judging');
GO
