import "server-only";
import { execProc } from "@/db/exec";

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
  CreatedAt: string;
  StudentCount: number;
  IsJoined: boolean;
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
}

export interface ClassProblemItem {
  ProblemID: number;
  Title: string;
  Difficulty: "Easy" | "Medium" | "Hard";
  TimeLimit: number;
  MemoryLimit: number;
  AssignedDate: string;
  DueDate: string | null;
  IsClosed: boolean;
  UserStatus: "done" | "tried" | "todo";
}

export interface IClassRepository {
  createClass(teacherId: number, input: {
    className: string;
    description?: string;
    isPublic?: boolean;
    inviteCode?: string;
  }): Promise<{ classId: number; inviteCode: string }>;

  joinByInviteCode(userId: number, inviteCode: string): Promise<number>;

  leaveClass(userId: number, classId: number): Promise<boolean>;

  listClasses(params: {
    userId?: number;
    search?: string;
    onlyMine?: boolean;
    page: number;
    pageSize: number;
  }): Promise<{ classes: ClassItem[]; totalCount: number }>;

  getClassDetail(classId: number, userId?: number): Promise<ClassItem | null>;

  getClassStudents(classId: number, actorId: number): Promise<StudentItem[]>;

  getClassProblems(classId: number, userId: number): Promise<ClassProblemItem[]>;

  addStudent(classId: number, teacherId: number, identifier: string): Promise<number>;

  removeStudent(classId: number, teacherId: number, studentId: number): Promise<boolean>;

  updateClass(
    teacherId: number,
    classId: number,
    input: {
      className: string;
      description?: string | null;
      isPublic?: boolean;
    }
  ): Promise<ClassItem>;
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

  async addStudent(classId: number, teacherId: number, identifier: string): Promise<number> {
    const { rows } = await execProc<{ StudentID: number }>("usp_Class_AddStudent", {
      ClassID: classId,
      TeacherID: teacherId,
      Identifier: identifier,
    });
    return rows[0].StudentID;
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
}

export const classRepository = new ClassRepository();
