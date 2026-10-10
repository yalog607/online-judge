CREATE OR ALTER VIEW app.uvw_ActiveImpersonations
AS
SELECT 
    s.SessionID,
    s.ActorID,
    a.Username AS ActorUsername,
    a.FullName AS ActorFullName,
    a.Role AS ActorRole,
    s.UserID AS TargetUserID,
    u.Username AS TargetUsername,
    u.FullName AS TargetFullName,
    u.Role AS TargetRole,
    s.CreatedAt,
    s.ExpiresAt
FROM dbo.Sessions s
INNER JOIN dbo.Users a ON a.UserID = s.ActorID
INNER JOIN dbo.Users u ON u.UserID = s.UserID
WHERE s.ActorID IS NOT NULL
  AND s.RevokedAt IS NULL
  AND s.ExpiresAt > SYSUTCDATETIME();
GO
