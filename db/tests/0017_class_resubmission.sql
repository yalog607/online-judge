DECLARE @Results TABLE (Assertion NVARCHAR(200), Passed BIT);
BEGIN TRANSACTION;

INSERT dbo.Users (Username, Password, Email, FullName, Role)
VALUES
    ('class_resubmit_owner_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8), 'hash', 'cro_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8) + '@test.com', N'Class Resubmit Owner', 'Teacher'),
    ('class_resubmit_other_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8), 'hash', 'crx_' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 8) + '@test.com', N'Class Resubmit Other', 'Teacher');

DECLARE @OwnerID INT = (SELECT TOP (1) UserID FROM dbo.Users WHERE FullName = N'Class Resubmit Owner' ORDER BY UserID DESC);
DECLARE @OtherID INT = (SELECT TOP (1) UserID FROM dbo.Users WHERE FullName = N'Class Resubmit Other' ORDER BY UserID DESC);
INSERT dbo.Classes (TeacherID, InviteCode, ClassName, IsPublic, ApprovalStatus, RejectionReason)
VALUES (@OwnerID, 'CR' + LEFT(REPLACE(CAST(NEWID() AS VARCHAR(36)), '-', ''), 10), N'Class Resubmit Test', 1, 'Rejected', N'Please revise');
DECLARE @ClassID INT = SCOPE_IDENTITY();

BEGIN TRY
    EXEC app.usp_Class_Resubmit @ClassID = @ClassID, @TeacherID = @OtherID;
    INSERT @Results VALUES ('only owner can resubmit rejected class', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('only owner can resubmit rejected class',
        CASE WHEN EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassID = @ClassID AND ApprovalStatus = 'Rejected') THEN 1 ELSE 0 END);
END CATCH;

EXEC app.usp_Class_Resubmit @ClassID = @ClassID, @TeacherID = @OwnerID;
INSERT @Results VALUES ('owner resubmission returns class to Pending and clears rejection reason',
    CASE WHEN EXISTS (SELECT 1 FROM dbo.Classes WHERE ClassID = @ClassID AND ApprovalStatus = 'Pending' AND RejectionReason IS NULL) THEN 1 ELSE 0 END);

BEGIN TRY
    EXEC app.usp_Class_Resubmit @ClassID = @ClassID, @TeacherID = @OwnerID;
    INSERT @Results VALUES ('approved workflow cannot be resubmitted repeatedly', 0);
END TRY
BEGIN CATCH
    INSERT @Results VALUES ('approved workflow cannot be resubmitted repeatedly', 1);
END CATCH;

ROLLBACK TRANSACTION;
SELECT Assertion, Passed FROM @Results;
