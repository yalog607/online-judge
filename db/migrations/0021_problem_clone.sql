CREATE OR ALTER PROCEDURE app.usp_Problem_Clone
    @ProblemID INT,
    @ActorID INT,
    @NewTitle NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF NOT EXISTS (
            SELECT 1 FROM dbo.Users 
            WHERE UserID = @ActorID AND Role IN ('Teacher', 'Admin')
        )
        BEGIN
            THROW 50020, 'Chi giang vien hoac quan tri vien moi co the nhan ban bai tap.', 1;
        END;

        DECLARE @SourceStatus VARCHAR(20), @SourceCreatorID INT, @OrigTitle NVARCHAR(200);
        SELECT 
            @SourceStatus = Status,
            @SourceCreatorID = CreatorID,
            @OrigTitle = Title
        FROM dbo.Problems 
        WHERE ProblemID = @ProblemID;

        IF @SourceStatus IS NULL
        BEGIN
            THROW 50021, 'Bai tap nguon khong ton tai.', 1;
        END;

        IF @SourceStatus <> 'Public' AND @SourceCreatorID <> @ActorID
           AND NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @ActorID AND Role = 'Admin')
        BEGIN
            THROW 50022, 'Ban khong co quyen nhan ban bai tap nay.', 1;
        END;

        DECLARE @FinalTitle NVARCHAR(200);
        IF @NewTitle IS NOT NULL AND LEN(RTRIM(LTRIM(@NewTitle))) > 0
            SET @FinalTitle = RTRIM(LTRIM(@NewTitle));
        ELSE
            SET @FinalTitle = N'[Bản sao] ' + @OrigTitle;

        IF LEN(@FinalTitle) > 200
            SET @FinalTitle = LEFT(@FinalTitle, 200);

        BEGIN TRANSACTION;

        DECLARE @NewProblemID INT;

        INSERT INTO dbo.Problems (
            CreatorID,
            Title,
            Statement,
            InputFormat,
            OutputFormat,
            TimeLimit,
            MemoryLimit,
            Tags,
            Difficulty,
            Status,
            CreatedAt
        )
        SELECT 
            @ActorID,
            @FinalTitle,
            Statement,
            InputFormat,
            OutputFormat,
            TimeLimit,
            MemoryLimit,
            Tags,
            Difficulty,
            'Private',
            SYSUTCDATETIME()
        FROM dbo.Problems
        WHERE ProblemID = @ProblemID;

        SET @NewProblemID = SCOPE_IDENTITY();

        INSERT INTO dbo.Testcases (
            ProblemID,
            InputData,
            ExpectedOutput,
            IsHidden,
            OrderIndex
        )
        SELECT 
            @NewProblemID,
            InputData,
            ExpectedOutput,
            IsHidden,
            OrderIndex
        FROM dbo.Testcases
        WHERE ProblemID = @ProblemID;

        COMMIT TRANSACTION;

        SELECT 
            p.ProblemID,
            p.Title,
            p.Difficulty,
            p.Status,
            p.CreatedAt
        FROM dbo.Problems p
        WHERE p.ProblemID = @NewProblemID;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
