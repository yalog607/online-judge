-- Bo dashboard "Tong quan": xoa 3 proc thong ke theo vai tro.
IF OBJECT_ID(N'app.usp_Dashboard_User', N'P') IS NOT NULL DROP PROCEDURE app.usp_Dashboard_User;
IF OBJECT_ID(N'app.usp_Dashboard_Teacher', N'P') IS NOT NULL DROP PROCEDURE app.usp_Dashboard_Teacher;
IF OBJECT_ID(N'app.usp_Dashboard_Admin', N'P') IS NOT NULL DROP PROCEDURE app.usp_Dashboard_Admin;
GO
