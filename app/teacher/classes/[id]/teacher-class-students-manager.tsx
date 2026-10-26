"use client";

import { useState } from "react";
import { RequestTAUpgradeButton } from "./request-ta-button";
import { DemoteTAButton } from "./demote-ta-button";
import { RemoveStudentButton } from "./remove-student-button";
import { StudentProgressModal } from "./student-progress-modal";
import type { StudentItem } from "@/modules/class/repo";

const STUDENT_PAGE_SIZE = 20;

type TeacherClassStudentsManagerProps = {
  classId: number;
  students: StudentItem[];
};

const AVATAR_COLORS = [
  "bg-purple-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-sky-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-indigo-600",
];

export function TeacherClassStudentsManager({
  classId,
  students,
}: TeacherClassStudentsManagerProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    students[0]?.UserID ?? null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [studentPage, setStudentPage] = useState(1);
  const [progressStudent, setProgressStudent] = useState<StudentItem | null>(null);

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.FullName.toLowerCase().includes(q) ||
      s.Username.toLowerCase().includes(q) ||
      s.Email.toLowerCase().includes(q)
    );
  });

  const studentTotalPages = Math.max(1, Math.ceil(filteredStudents.length / STUDENT_PAGE_SIZE));
  const currentStudentPage = Math.min(studentPage, studentTotalPages);
  const pagedStudents = filteredStudents.slice(
    (currentStudentPage - 1) * STUDENT_PAGE_SIZE,
    currentStudentPage * STUDENT_PAGE_SIZE,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-fg">
            Học viên trong lớp ({students.length})
          </h2>
          <p className="text-xs text-fg-muted">
            Xem danh sách và theo dõi tiến độ của học viên.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-surface p-2.5 shadow-xs">
        <div className="relative max-w-sm">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-muted">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setStudentPage(1);
            }}
            placeholder="Tìm theo tên, email, tên đăng nhập..."
            className="w-full rounded-lg border border-line bg-muted/50 py-1.5 pl-9 pr-3 text-sm text-fg placeholder:text-fg-muted focus:border-primary focus:bg-surface focus:outline-none"
          />
        </div>
      </div>

      <div className="card overflow-hidden rounded-2xl border border-line bg-surface shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-muted/40 text-xs font-semibold uppercase tracking-wider text-fg-muted">
              <tr>
                <th className="w-12 px-4 py-3.5 text-center"></th>
                <th className="px-4 py-3.5">Học viên</th>
                <th className="px-4 py-3.5">Email</th>
                <th className="px-4 py-3.5">Ngày tham gia</th>
                <th className="px-4 py-3.5 text-center">Tiến độ</th>
                <th className="px-4 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-fg-muted"
                  >
                    {students.length === 0
                      ? "Chưa có học viên nào tham gia lớp học này."
                      : "Không tìm thấy học viên nào phù hợp."}
                  </td>
                </tr>
              ) : (
                pagedStudents.map((s) => {
                  const isSelected = selectedStudentId === s.UserID;
                  const initial =
                    s.FullName.trim().split(/\s+/).pop()?.[0]?.toUpperCase() ??
                    "?";
                  const avatarColor =
                    AVATAR_COLORS[s.UserID % AVATAR_COLORS.length];

                  return (
                    <tr
                      key={s.UserID}
                      onClick={() => setSelectedStudentId(s.UserID)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-primary/10"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center">
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${
                              isSelected
                                ? "border-primary bg-surface"
                                : "border-line hover:border-fg-muted"
                            }`}
                          >
                            {isSelected && (
                              <span className="h-2 w-2 rounded-full bg-primary" />
                            )}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`grid h-9 w-9 flex-none place-items-center rounded-full text-sm font-semibold text-white ${avatarColor}`}
                          >
                            {initial}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-fg truncate flex items-center gap-1.5">
                              <span className="truncate">{s.FullName}</span>
                              {Boolean(s.IsTA) && (
                                <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                  Trợ giảng
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-fg-muted truncate">
                              @{s.Username}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-fg-muted">
                        {s.Email}
                      </td>

                      <td className="px-4 py-3.5 text-fg-muted whitespace-nowrap">
                        {new Date(s.JoinDate).toLocaleDateString("vi-VN")}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProgressStudent(s);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          title="Bấm để xem chi tiết tiến độ học viên"
                        >
                          <span>{s.ProgressPercent}%</span>
                        </button>
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div
                          className="flex items-center justify-end gap-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => setProgressStudent(s)}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            Xem tiến độ
                          </button>
                          {Boolean(s.IsTA) && (
                            <DemoteTAButton
                              classId={classId}
                              userId={s.UserID}
                              userName={s.FullName}
                            />
                          )}
                          {!s.IsTA && s.IsTAPending && (
                            <span className="text-warn text-xs font-medium">
                              Chờ duyệt TA
                            </span>
                          )}
                          {!s.IsTA && !s.IsTAPending && (
                            <RequestTAUpgradeButton
                              classId={classId}
                              studentId={s.UserID}
                              studentName={s.FullName}
                            />
                          )}
                          <RemoveStudentButton
                            classId={classId}
                            studentId={s.UserID}
                            studentName={s.FullName}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {studentTotalPages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-fg-muted">
            <span>
              Trang {currentStudentPage}/{studentTotalPages} · {filteredStudents.length} học viên
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={currentStudentPage <= 1}
                onClick={() => setStudentPage(currentStudentPage - 1)}
                className="grid h-8 min-w-8 place-items-center rounded-lg px-2 hover:bg-muted disabled:opacity-40"
                aria-label="Trang trước"
              >
                ‹
              </button>
              <button
                type="button"
                disabled={currentStudentPage >= studentTotalPages}
                onClick={() => setStudentPage(currentStudentPage + 1)}
                className="grid h-8 min-w-8 place-items-center rounded-lg px-2 hover:bg-muted disabled:opacity-40"
                aria-label="Trang sau"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {progressStudent && (
        <StudentProgressModal
          key={progressStudent.UserID}
          classId={classId}
          student={progressStudent}
          onClose={() => setProgressStudent(null)}
        />
      )}
    </div>
  );
}
