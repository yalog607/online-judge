-- Output comparison mode and testcase groups with points.
-- CompareMode: exact | unordered (top-level array order ignored) | float (numbers within FloatEpsilon).
ALTER TABLE dbo.Problems ADD CompareMode VARCHAR(20) NOT NULL
    CONSTRAINT DF_Problems_CompareMode DEFAULT 'exact';
GO

ALTER TABLE dbo.Problems ADD FloatEpsilon FLOAT NULL;
GO

ALTER TABLE dbo.Problems ADD CONSTRAINT CK_Problems_CompareMode
    CHECK (CompareMode IN ('exact', 'unordered', 'float'));
ALTER TABLE dbo.Problems ADD CONSTRAINT CK_Problems_FloatEpsilon
    CHECK (FloatEpsilon IS NULL OR (FloatEpsilon > 0 AND FloatEpsilon <= 1));
GO

-- NULL group = ungrouped testcase (not scored).
ALTER TABLE dbo.Testcases ADD GroupNo INT NULL;
GO

CREATE TABLE dbo.TestcaseGroups (
    ProblemID INT NOT NULL CONSTRAINT FK_TestcaseGroups_Problem REFERENCES dbo.Problems(ProblemID) ON DELETE CASCADE,
    GroupNo   INT NOT NULL,
    Points    INT NOT NULL,
    CONSTRAINT PK_TestcaseGroups PRIMARY KEY (ProblemID, GroupNo),
    CONSTRAINT CK_TestcaseGroups_Points CHECK (Points >= 0 AND Points <= 1000)
);
GO

-- Score is the sum of points of fully accepted groups; NULL when the problem has no groups.
ALTER TABLE dbo.Submissions ADD Score INT NULL, MaxScore INT NULL;
GO
