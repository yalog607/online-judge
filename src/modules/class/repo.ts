import "server-only";
import { execProc, DomainError } from "@/db/exec";
import type { ProblemStatus } from "@/modules/problem/repo";

export interface StudentProgressSummary {
  UserID: number;
  FullName: string;
  Username: string;
  Email: string;
  JoinDate: string;
  ProgressPercent: number;
  TotalProblems: number;
  SolvedProblems: number;
  AttemptedProblems: number;
  UnattemptedProblems: number;
  TotalSubmissions: number;
  TotalAC: number;
}

export interface StudentProblemProgress {
  ProblemID: number;
  Title: string;
  Difficulty: string;
  TimeLimit: number;
  MemoryLimit: number;
  AssignedDate: string;
  DueDate: string | null;
  IsClosed: boolean;
  Status: "Solved" | "Attempted" | "Unattempted";
  BestResult: string | null;
  SubmissionCount: number;
  LastSubmitTime: string | null;
}

export interface StudentClassSubmission {
  SubmissionID: number;
  ProblemID: number;
  ProblemTitle: string;
  Language: string;
  Result: string;
  Runtime: number | null;
  Memory: number | null;
  PassedCases: number | null;
  SubmitTime: string;
}

export interface StudentProgressDetailData {
  student: StudentProgressSummary;
  problems: StudentProblemProgress[];
  submissions: StudentClassSubmission[];
}

export interface ClassItem {
  ClassID: number;
  TeacherID: number;
  TeacherName: string;
  TeacherEmail: string;
  InviteCode: string;
  ClassName: string;
  Description: string | null;
  IsPublic: boolean;
  ApprovalStatus: string;
  IsCancelled: boolean;
  RejectionReason?: string;
  CreatedAt: string;
  StudentCount: number;
  IsJoined: boolean;
  IsTA?: boolean;
  TotalCount?: number;
}

export interface StudentItem {
  ClassID: number;
  UserID: number;
  Username: string;
  FullName: string;
  Email: string;
  JoinDate: string;
  ProgressPercent: number;
  IsTA?: boolean;
  IsTAPending?: boolean;
}

export interface ClassProblemItem {
  ProblemID: number;
  Title: string;
  Difficulty: "Easy" | "Medium" | "Hard";
  Status: ProblemStatus;
  TimeLimit: number;
  MemoryLimit: number;
  AssignedDate: string;
  DueDate: string | null;
  IsClosed: boolean;
  UserStatus: "done" | "tried" | "todo";
}

export interface TeacherClassView {
  ClassID: number;
  TeacherID: number;
  TeacherName: string;
  InviteCode: string | null;
  ClassName: string;
  Description: string | null;
  IsPublic: boolean;
  ApprovalStatus: string;
  IsCancelled: boolean;
  CreatedAt: string;
  CanManage: boolean;
}

export interface ImportStudentResultItem {
  rowOrder: number;
  identifier: string;
  userId: number | null;
  username: string | null;
  fullName: string | null;
  email: string | null;
  status: "SUCCESS" | "ALREADY_EXISTS" | "NOT_FOUND" | "CANNOT_ADD_TEACHER" | "DUPLICATE_IN_FILE";
}

export interface ImportStudentsSummary {
  total: number;
  successCount: number;
  alreadyExistsCount: number;
  notFoundCount: number;
  cannotAddTeacherCount: number;
  duplicateCount: number;
  results: ImportStudentResultItem[];
}

export interface IClassRepository {
  createClass(teacherId: number, input: {
    className: string;
    description?: string;
    isPublic?: boolean;
    inviteCode?: string;
  }): Promise<{ classId: number; inviteCode: string }>;

  joinByInviteCode(userId: number, inviteCode: string): Promise<number>;

  joinPublicClass(userId: number, classId: number): Promise<number>;

  leaveClass(userId: number, classId: number): Promise<boolean>;

  listClasses(params: {
    userId?: number;
    search?: string;
    onlyMine?: boolean;
    page: number;
    pageSize: number;
  }): Promise<{ classes: ClassItem[]; totalCount: number }>;

  getClassDetail(classId: number, userId?: number): Promise<ClassItem | null>;

  getTeacherClassView(classId: number, actorId: number): Promise<TeacherClassView | null>;

  getClassStudents(classId: number, actorId: number): Promise<StudentItem[]>;

  getClassProblems(classId: number, userId: number): Promise<ClassProblemItem[]>;

  getPublicClassProblems(classId: number, actorId: number): Promise<ClassProblemItem[]>;

  addStudent(classId: number, teacherId: number, identifier: string): Promise<number>;

  importStudents(classId: number, actorId: number, identifiers: string[]): Promise<ImportStudentsSummary>;

  removeStudent(classId: number, teacherId: number, studentId: number): Promise<boolean>;

  assignProblem(
    classId: number,
    teacherId: number,
    problemId: number,
    dueDate?: string | null
  ): Promise<void>;

  removeProblem(classId: number, teacherId: number, problemId: number): Promise<void>;

  updateClass(
    teacherId: number,
    classId: number,
    input: {
      className: string;
      description?: string | null;
      isPublic?: boolean;
    }
  ): Promise<ClassItem>;

  cancelClass(classId: number, teacherId: number): Promise<void>;

  resubmitClass(classId: number, teacherId: number): Promise<void>;

  requestUpgradeToTA(classId: number, teacherId: number, studentId: number): Promise<void>;

  listTARequests(adminId: number): Promise<any[]>; // eslint-disable-line @typescript-eslint/no-explicit-any

  approveTARequest(adminId: number, requestId: number, isApproved: boolean, rejectionReason?: string): Promise<void>;

  getClassesForTA(taUserId: number): Promise<ClassItem[]>;

  listClassRequests(): Promise<ClassItem[]>;
  approveClassRequest(adminId: number, classId: number, isApproved: boolean, rejectionReason?: string): Promise<void>;

  getStudentProgressDetail(
    classId: number,
    studentId: number,
    actorId: number
  ): Promise<StudentProgressDetailData>;
}

export class ClassRepository implements IClassRepository {
  async createClass(teacherId: number, input: {
    className: string;
    description?: string;
    isPublic?: boolean;
    inviteCode?: string;
  }): Promise<{ classId: number; inviteCode: string }> {
    const { rows } = await execProc<{ ClassID: number; InviteCode: string }>("usp_Class_Create", {
      TeacherID: teacherId,
      ClassName: input.className,
      Description: input.description ?? null,
      IsPublic: input.isPublic ?? true,
      InviteCode: input.inviteCode ?? null,
    });
    return {
      classId: rows[0].ClassID,
      inviteCode: rows[0].InviteCode,
    };
  }

  async joinByInviteCode(userId: number, inviteCode: string): Promise<number> {
    const { rows } = await execProc<{ ClassID: number }>("usp_Class_JoinByInviteCode", {
      UserID: userId,
      InviteCode: inviteCode,
    });
    return rows[0].ClassID;
  }

  async joinPublicClass(userId: number, classId: number): Promise<number> {
    const { rows } = await execProc<{ ClassID: number }>("usp_Class_JoinPublic", {
      UserID: userId,
      ClassID: classId,
    });
    return rows[0].ClassID;
  }

  async leaveClass(userId: number, classId: number): Promise<boolean> {
    await execProc("usp_Class_Leave", {
      UserID: userId,
      ClassID: classId,
    });
    return true;
  }

  async listClasses(params: {
    userId?: number;
    search?: string;
    onlyMine?: boolean;
    page: number;
    pageSize: number;
  }): Promise<{ classes: ClassItem[]; totalCount: number }> {
    const { rows } = await execProc<ClassItem>("usp_Class_List", {
      UserID: params.userId ?? null,
      Search: params.search ?? null,
      OnlyMine: params.onlyMine ?? false,
      Page: params.page,
      PageSize: params.pageSize,
    });
    const totalCount = rows[0]?.TotalCount ?? 0;
    return { classes: rows, totalCount };
  }

  async getClassDetail(classId: number, userId?: number): Promise<ClassItem | null> {
    const { rows } = await execProc<ClassItem>("usp_Class_GetDetail", {
      ClassID: classId,
      UserID: userId ?? null,
    });
    return rows[0] ?? null;
  }

  async getTeacherClassView(classId: number, actorId: number): Promise<TeacherClassView | null> {
    const { rows } = await execProc<TeacherClassView>("usp_Class_GetTeacherView", {
      ClassID: classId,
      ActorID: actorId,
    });
    return rows[0] ?? null;
  }

  async getClassStudents(classId: number, actorId: number): Promise<StudentItem[]> {
    const { rows } = await execProc<StudentItem>("usp_Class_GetStudents", {
      ClassID: classId,
      ActorID: actorId,
    });
    return rows;
  }

  async getClassProblems(classId: number, userId: number): Promise<ClassProblemItem[]> {
    const { rows } = await execProc<ClassProblemItem>("usp_Class_GetProblems", {
      ClassID: classId,
      UserID: userId,
    });
    return rows;
  }

  async getPublicClassProblems(classId: number, actorId: number): Promise<ClassProblemItem[]> {
    const { rows } = await execProc<ClassProblemItem>("usp_Class_GetPublicPreviewProblems", {
      ClassID: classId,
      ActorID: actorId,
    });
    return rows;
  }

  async addStudent(classId: number, teacherId: number, identifier: string): Promise<number> {
    const { rows } = await execProc<{ StudentID: number }>("usp_Class_AddStudent", {
      ClassID: classId,
      TeacherID: teacherId,
      Identifier: identifier,
    });
    return rows[0].StudentID;
  }

  async importStudents(
    classId: number,
    actorId: number,
    identifiers: string[]
  ): Promise<ImportStudentsSummary> {
    const payload = identifiers.map((identifier) => ({ identifier }));
    const { rows } = await execProc<{
      RowOrder: number;
      Identifier: string;
      UserID: number | null;
      Username: string | null;
      FullName: string | null;
      Email: string | null;
      Status: "SUCCESS" | "ALREADY_EXISTS" | "NOT_FOUND" | "CANNOT_ADD_TEACHER" | "DUPLICATE_IN_FILE";
    }>("usp_Class_ImportStudents", {
      ClassID: classId,
      ActorID: actorId,
      StudentsJson: JSON.stringify(payload),
    });

    const results: ImportStudentResultItem[] = rows.map((r) => ({
      rowOrder: r.RowOrder,
      identifier: r.Identifier,
      userId: r.UserID,
      username: r.Username,
      fullName: r.FullName,
      email: r.Email,
      status: r.Status,
    }));

    return {
      total: results.length,
      successCount: results.filter((r) => r.status === "SUCCESS").length,
      alreadyExistsCount: results.filter((r) => r.status === "ALREADY_EXISTS").length,
      notFoundCount: results.filter((r) => r.status === "NOT_FOUND").length,
      cannotAddTeacherCount: results.filter((r) => r.status === "CANNOT_ADD_TEACHER").length,
      duplicateCount: results.filter((r) => r.status === "DUPLICATE_IN_FILE").length,
      results,
    };
  }

  async removeStudent(classId: number, teacherId: number, studentId: number): Promise<boolean> {
    await execProc("usp_Class_RemoveStudent", {
      ClassID: classId,
      TeacherID: teacherId,
      StudentID: studentId,
    });
    return true;
  }

  async updateClass(
    teacherId: number,
    classId: number,
    input: {
      className: string;
      description?: string | null;
      isPublic?: boolean;
    }
  ): Promise<ClassItem> {
    const { rows } = await execProc<ClassItem>("usp_Class_Update", {
      ClassID: classId,
      TeacherID: teacherId,
      ClassName: input.className,
      Description: input.description ?? null,
      IsPublic: input.isPublic ?? true,
    });
    return rows[0];
  }

  async cancelClass(classId: number, teacherId: number): Promise<void> {
    await execProc("usp_Class_Cancel", { ClassID: classId, TeacherID: teacherId });
  }

  async resubmitClass(classId: number, teacherId: number): Promise<void> {
    await execProc("usp_Class_Resubmit", { ClassID: classId, TeacherID: teacherId });
  }

  async assignProblem(
    classId: number,
    teacherId: number,
    problemId: number,
    dueDate?: string | null
  ): Promise<void> {
    await execProc("usp_Class_AssignProblem", {
      ClassID: classId,
      ProblemID: problemId,
      TeacherID: teacherId,
      DueDate: dueDate ? new Date(dueDate) : null,
    });
  }

  async removeProblem(classId: number, teacherId: number, problemId: number): Promise<void> {
    await execProc("usp_Class_RemoveProblem", {
      ClassID: classId,
      ProblemID: problemId,
      TeacherID: teacherId,
    });
  }

  async requestUpgradeToTA(classId: number, teacherId: number, studentId: number): Promise<void> {
    await execProc("usp_Class_RequestUpgradeToTA", {
      ClassID: classId,
      UserID: studentId,
      TeacherID: teacherId,
    });
  }

  async listTARequests(adminId: number) {
    const { rows } = await execProc("usp_Admin_ListTARequests", {
      AdminID: adminId,
    });
    return rows;
  }

  async approveTARequest(adminId: number, requestId: number, isApproved: boolean, rejectionReason?: string): Promise<void> {
    await execProc("usp_Admin_ApproveTA", {
      AdminID: adminId,
      RequestID: requestId,
      IsApproved: isApproved,
      RejectionReason: rejectionReason ?? null,
    });
  }

  async getClassesForTA(taUserId: number): Promise<ClassItem[]> {
    const { rows } = await execProc<ClassItem>("usp_Class_GetForTA", {
      TAUserID: taUserId,
    });
    return rows;
  }

  async getClassSubmissions(classId: number, actorId: number, page: number = 1, pageSize: number = 20) {
    const { rows } = await execProc("usp_Class_GetSubmissions", {
      ClassID: classId,
      ActorID: actorId,
      Page: page,
      PageSize: pageSize,
    });
    return {
      items: rows,
      total: rows[0]?.TotalCount ?? 0,
    };
  }

  async listClassRequests(): Promise<ClassItem[]> {
    const { rows } = await execProc("usp_Admin_ListClassRequests");
    return rows as unknown as ClassItem[];
  }

  async approveClassRequest(adminId: number, classId: number, isApproved: boolean, rejectionReason?: string): Promise<void> {
    await execProc("usp_Admin_ReviewClass", {
      AdminID: adminId,
      ClassID: classId,
      IsApproved: isApproved,
      RejectionReason: rejectionReason ?? null,
    });
  }

  async getStudentProgressDetail(
    classId: number,
    studentId: number,
    actorId: number
  ): Promise<StudentProgressDetailData> {
    const res = await execProc<unknown>("usp_Class_GetStudentProgressDetail", {
      ClassID: classId,
      StudentID: studentId,
      ActorID: actorId,
    });

    const student = res.sets[0]?.[0] as StudentProgressSummary | undefined;
    if (!student) {
      throw new DomainError(50032, "Không tìm thấy thông tin tiến độ sinh viên.");
    }
    const problems = (res.sets[1] as StudentProblemProgress[] | undefined) ?? [];
    const submissions = (res.sets[2] as StudentClassSubmission[] | undefined) ?? [];

    return { student, problems, submissions };
  }
}

export const classRepository = new ClassRepository();
