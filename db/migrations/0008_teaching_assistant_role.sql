-- Create Class_TA table
CREATE TABLE dbo.Class_TA (
    ClassID INT NOT NULL,
    UserID_TA INT NOT NULL,
    AssignedDate DATETIME2(0) NOT NULL CONSTRAINT DF_ClassTA_Date DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Class_TA PRIMARY KEY (ClassID, UserID_TA),
    CONSTRAINT FK_Class_TA_Classes FOREIGN KEY (ClassID) REFERENCES dbo.Classes(ClassID) ON DELETE CASCADE,
    CONSTRAINT FK_Class_TA_Users FOREIGN KEY (UserID_TA) REFERENCES dbo.Users(UserID) ON DELETE CASCADE
);
GO

-- Create TA_Requests table
CREATE TABLE dbo.TA_Requests (
    RequestID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TA_Requests PRIMARY KEY,
    ClassID INT NOT NULL,
    UserID INT NOT NULL,
    RequestedBy INT NOT NULL,
    Status VARCHAR(20) NOT NULL CONSTRAINT DF_TARequests_Status DEFAULT 'Pending',
    RequestDate DATETIME2(0) NOT NULL CONSTRAINT DF_TARequests_Date DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_TARequests_Classes FOREIGN KEY (ClassID) REFERENCES dbo.Classes(ClassID) ON DELETE CASCADE,
    CONSTRAINT FK_TARequests_Users FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID),
    CONSTRAINT FK_TARequests_RequestedBy FOREIGN KEY (RequestedBy) REFERENCES dbo.Users(UserID),
    CONSTRAINT CK_TARequests_Status CHECK (Status IN ('Pending', 'Approved', 'Rejected'))
);
GO

-- Update Role constraint in Users
ALTER TABLE dbo.Users DROP CONSTRAINT CK_Users_Role;
GO
ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_Role CHECK (Role IN ('User','Teacher','Admin','TA'));
GO

-- Update Status constraint in Problems
ALTER TABLE dbo.Problems DROP CONSTRAINT CK_Problems_Status;
GO
ALTER TABLE dbo.Problems ADD CONSTRAINT CK_Problems_Status CHECK (Status IN ('Public', 'Private', 'Hidden', 'Pending'));
GO
