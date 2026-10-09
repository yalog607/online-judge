import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { classRepository } from "@/modules/class/repo";
import { documentRepository } from "@/modules/document/repo";
import { listForManage as listProblemsForManage } from "@/modules/problem/repo";
import { DifficultyBadge, ProblemStatusBadge } from "@/components/badge";
import { AddStudentForm } from "./add-student-form";
import { RemoveStudentButton } from "./remove-student-button";
import { DocumentUploadForm } from "./document-upload-form";
import { TeacherDocumentList } from "./document-list";
import { EditClassDialog } from "./edit-class-dialog";
import { AssignProblemDialog } from "./assign-problem-dialog";
import { RemoveClassProblemButton } from "./remove-class-problem-button";
import { RequestTAUpgradeButton } from "./request-ta-button";
import { ApproveProblemButton } from "./approve-problem-button";

export default async function TeacherClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const actor = await requireRole("Teacher", "Admin");
  const { id } = await params;
  const sParams = await searchParams;
  const activeTab = sParams?.tab || "overview";

  const classId = parseInt(id, 10);
  if (isNaN(classId)) notFound();

  const [classDetail, students, documents, problems, allProblems, submissions] = await Promise.all([
    classRepository.getClassDetail(classId, actor.userId),
    classRepository.getClassStudents(classId, actor.userId),
    documentRepository.listDocuments(classId, actor.userId),
    classRepository.getClassProblems(classId, actor.userId),
    listProblemsForManage({ actorId: actor.userId, page: 1, pageSize: 100 }),
    activeTab === "submissions" ? classRepository.getClassSubmissions(classId, actor.userId) : Promise.resolve({ items: [], total: 0 }),
  ]);


  if (!classDetail) notFound();

  const assignedProblemIds = new Set(problems.map((p) => p.ProblemID));
  const availableToAdd = allProblems.rows
    .filter(
      (p) =>
        !assignedProblemIds.has(p.ProblemID) &&
        p.Status !== "Hidden",
    )
    .map((p) => ({
      problemId: p.ProblemID,
      title: p.Title,
      difficulty: p.Difficulty,
    }));

  return (
    <div className="flex flex-col gap-6 pt-8">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/teacher/classes"
            className="text-sm font-medium text-fg-muted hover:text-fg hover:underline"
          >
            ← Quay lại danh sách lớp
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{classDetail.ClassName}</h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                classDetail.IsPublic
                  ? "bg-ok/10 text-ok border border-ok/30"
                  : "bg-muted text-fg-muted border border-line"
              }`}
            >
              {classDetail.IsPublic ? "Công khai" : "Riêng tư"}
            </span>
          </div>
          <p className="mt-1 text-fg-muted">
            {classDetail.Description || "Chưa có mô tả cho lớp học này."}
          </p>
        </div>

        <EditClassDialog
          classId={classId}
          initialClassName={classDetail.ClassName}
          initialDescription={classDetail.Description}
          initialIsPublic={classDetail.IsPublic}
        />
      </div>

      <div className="flex border-b border-line gap-4">
        <Link
          href={`/teacher/classes/${classId}?tab=overview`}
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "overview"
              ? "border-primary text-primary"
              : "border-transparent text-fg-muted hover:text-fg"
          }`}
        >
          Tổng quan lớp học
        </Link>
        <Link
          href={`/teacher/classes/${classId}?tab=submissions`}
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "submissions"
              ? "border-primary text-primary"
              : "border-transparent text-fg-muted hover:text-fg"
          }`}
        >
          Lịch sử nộp bài
        </Link>
      </div>

      {activeTab === "overview" && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">

        <div className="rounded-xl border border-line bg-surface p-4">
          <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
            Mã mời tham gia
          </span>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-xl font-bold text-primary">
              {classDetail.InviteCode}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4">
          <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
            Tổng số học sinh
          </span>
          <p className="mt-2 text-xl font-bold text-fg">{students.length} học sinh</p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4">
          <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
            Bài tập đã giao
          </span>
          <p className="mt-2 text-xl font-bold text-fg">{problems.length} bài tập</p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4">
          <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
            Tài liệu đã đăng
          </span>
          <p className="mt-2 text-xl font-bold text-fg">{documents.length} tài liệu</p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4">
          <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
            Ngày thành lập
          </span>
          <p className="mt-2 text-xl font-bold text-fg">
            {new Date(classDetail.CreatedAt).toLocaleDateString("vi-VN")}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-fg">Bài tập của lớp ({problems.length})</h2>
            <p className="text-xs text-fg-muted">
              Quản lý các bài tập được giao cho học sinh trong lớp học này.
            </p>
          </div>
          <AssignProblemDialog classId={classId} availableProblems={availableToAdd} />
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-muted font-medium text-fg-muted">
              <tr>
                <th className="px-4 py-3">STT</th>
                <th className="px-4 py-3">Tên bài tập</th>
                <th className="px-4 py-3">Độ khó</th>
                <th className="px-4 py-3">Phạm vi</th>
                <th className="px-4 py-3">Ngày giao</th>
                <th className="px-4 py-3">Hạn nộp</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {problems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-fg-muted">
                    Chưa có bài tập nào được giao cho lớp này. Nhấn &quot;Giao bài tập&quot; để thêm.
                  </td>
                </tr>
              ) : (
                problems.map((p, idx) => (
                  <tr key={p.ProblemID} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-fg-muted">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-fg">
                      <Link
                        href={`/teacher/problems/${p.ProblemID}`}
                        className="hover:text-primary hover:underline"
                        target="_blank"
                      >
                        {p.Title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <DifficultyBadge difficulty={p.Difficulty} />
                    </td>
                    <td className="px-4 py-3">
                      <ProblemStatusBadge status={p.Status} />
                    </td>
                    <td className="px-4 py-3 text-fg-muted">
                      {new Date(p.AssignedDate).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-3 text-fg-muted">
                      {p.DueDate
                        ? new Date(p.DueDate).toLocaleString("vi-VN")
                        : "Không thời hạn"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {p.Status === "Pending" && (
                          <ApproveProblemButton problemId={p.ProblemID} />
                        )}
                        <RemoveClassProblemButton
                          classId={classId}
                          problemId={p.ProblemID}
                          problemTitle={p.Title}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-surface p-5">
        <h2 className="mb-2 text-base font-semibold text-fg">Đăng tải tài liệu học tập</h2>
        <p className="mb-4 text-xs text-fg-muted">
          Tải lên bài giảng, slide, bài tập hoặc tài liệu tham khảo cho học sinh trong lớp.
        </p>
        <DocumentUploadForm classId={classId} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Tài liệu học tập ({documents.length})</h2>
        <TeacherDocumentList classId={classId} documents={documents} />
      </div>

      <div className="rounded-xl border border-line bg-surface p-5">
        <h2 className="mb-2 text-base font-semibold text-fg">Thêm học sinh vào lớp</h2>
        <p className="mb-4 text-xs text-fg-muted">
          Nhập địa chỉ email hoặc tên đăng nhập của học sinh để thêm trực tiếp vào lớp.
        </p>
        <AddStudentForm classId={classId} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Danh sách học sinh ({students.length})</h2>
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-muted font-medium text-fg-muted">
              <tr>
                <th className="px-4 py-3">STT</th>
                <th className="px-4 py-3">Họ và tên</th>
                <th className="px-4 py-3">Tên đăng nhập</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Ngày tham gia</th>
                <th className="px-4 py-3 text-center">Tiến độ</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-fg-muted">
                    Chưa có học sinh nào tham gia lớp học này.
                  </td>
                </tr>
              ) : (
                students.map((s, idx) => (
                  <tr key={s.UserID} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-fg-muted">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-fg">
                      <div className="flex items-center gap-2">
                        {s.FullName}
                        {Boolean(s.IsTA) && (
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                            Trợ giảng
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-fg-muted">{s.Username}</td>
                    <td className="px-4 py-3 text-fg-muted">{s.Email}</td>
                    <td className="px-4 py-3 text-fg-muted">
                      {new Date(s.JoinDate).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-ok">
                      {s.ProgressPercent}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RemoveStudentButton
                        classId={classId}
                        studentId={s.UserID}
                        studentName={s.FullName}
                      />
                      {!s.IsTA && (
                        <RequestTAUpgradeButton
                          classId={classId}
                          studentId={s.UserID}
                        />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </div>
      )}

      {activeTab === "submissions" && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Lịch sử nộp bài của sinh viên</h2>
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-muted font-medium text-fg-muted">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Sinh viên</th>
                  <th className="px-4 py-3">Bài tập</th>
                  <th className="px-4 py-3">Kết quả</th>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {submissions.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-fg-muted">
                      Chưa có lượt nộp bài nào từ học sinh trong lớp.
                    </td>
                  </tr>
                ) : (
                  submissions.items.map((s: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => (
                    <tr key={s.SubmissionID} className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-mono text-xs text-fg-muted">#{s.SubmissionID}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-fg">{s.FullName}</div>
                        <div className="text-xs text-fg-muted">@{s.Username}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/teacher/problems/${s.ProblemID}`}
                          className="font-medium text-fg hover:text-primary hover:underline"
                        >
                          {s.ProblemTitle}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          s.Result === "AC" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : 
                          s.Result === "Pending" || s.Result === "Judging" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                          "bg-red-500/10 text-red-500 border border-red-500/20"
                        }`}>
                          {s.Result}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-fg-muted">
                        {new Date(s.SubmitTime).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/submissions/${s.SubmissionID}`}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Xem mã nguồn →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
