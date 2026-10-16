import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { classRepository } from "@/modules/class/repo";
import { documentRepository } from "@/modules/document/repo";
import { listForManage as listProblemsForManage } from "@/modules/problem/repo";
import { DifficultyBadge, ProblemStatusBadge, VerdictBadge } from "@/components/badge";
import { Pager } from "@/components/pager";
import { AddStudentForm } from "./add-student-form";
import { DocumentUploadForm } from "./document-upload-form";
import { TeacherDocumentList } from "./document-list";
import { EditClassDialog } from "./edit-class-dialog";
import { AssignProblemDialog } from "./assign-problem-dialog";
import { RemoveClassProblemButton } from "./remove-class-problem-button";
import { ApproveProblemButton } from "./approve-problem-button";
import { TeacherClassStudentsManager } from "./teacher-class-students-manager";
import { CancelClassButton } from "../cancel-class-button";
import { ResubmitClassButton } from "../resubmit-class-button";
import { TeacherClassJoinRequests } from "./teacher-class-join-requests";

export default async function TeacherClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string; page?: string; problemId?: string; result?: string }>;
}) {
  const actor = await requireRole("Teacher", "Admin");
  const { id } = await params;
  const sParams = await searchParams;
  const activeTab = sParams?.tab || "overview";
  const page = Math.max(1, Number(sParams?.page) || 1);
  const selectedProblemId = sParams?.problemId ? Number(sParams.problemId) : undefined;
  const selectedResult = sParams?.result || undefined;
  const PAGE_SIZE = 20;

  const classId = parseInt(id, 10);
  if (isNaN(classId)) notFound();

  const classDetail = await classRepository.getTeacherClassView(classId, actor.userId);
  if (!classDetail || !classDetail.CanManage) {
    redirect(`/user/classes/${classId}`);
  }

  const [students, documents, problems, allProblems, submissions, joinRequests] = await Promise.all([
    classRepository.getClassStudents(classId, actor.userId),
    documentRepository.listDocuments(classId, actor.userId),
    classRepository.getClassProblems(classId, actor.userId),
    listProblemsForManage({ actorId: actor.userId, page: 1, pageSize: 100 }),
    activeTab === "submissions"
      ? classRepository.getClassSubmissions(classId, actor.userId, page, PAGE_SIZE, selectedProblemId, selectedResult)
      : Promise.resolve({ items: [], total: 0 }),
    classRepository.listJoinRequests(classId, actor.userId),
  ]);

  const pendingRequestsCount = joinRequests.filter((r) => r.Status === "Pending").length;

  const VERDICT_FILTERS = [
    { label: "Tất cả", value: "" },
    { label: "AC", value: "AC" },
    { label: "WA", value: "WA" },
    { label: "TLE", value: "TLE" },
    { label: "MLE", value: "MLE" },
    { label: "RE", value: "RE" },
    { label: "CE", value: "CE" },
  ];

  const buildSubmissionsHref = (filterParams: { page?: number; problemId?: number | null; result?: string | null }) => {
    const query = new URLSearchParams();
    query.set("tab", "submissions");
    const p = filterParams.page !== undefined ? filterParams.page : page;
    if (p > 1) query.set("page", String(p));
    const prob = filterParams.problemId !== undefined ? filterParams.problemId : selectedProblemId;
    if (prob) query.set("problemId", String(prob));
    const res = filterParams.result !== undefined ? filterParams.result : selectedResult;
    if (res) query.set("result", res);
    return `/teacher/classes/${classId}?${query.toString()}`;
  };


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
            {classDetail.IsCancelled && (
              <span className="rounded-full border border-bad/30 bg-bad/10 px-2.5 py-0.5 text-xs font-medium text-bad">
                Đã hủy
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                classDetail.ApprovalStatus === "Approved"
                  ? "bg-ok-soft text-ok"
                  : classDetail.ApprovalStatus === "Rejected"
                    ? "bg-bad-soft text-bad"
                    : "bg-warn-soft text-warn"
              }`}
            >
              {classDetail.ApprovalStatus === "Approved"
                ? "Đã duyệt"
                : classDetail.ApprovalStatus === "Rejected"
                  ? "Bị từ chối"
                  : "Chờ duyệt"}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                classDetail.IsPublic
                  ? "bg-ok/10 text-ok border border-ok/30"
                  : "bg-warn/10 text-warn border border-warn/30"
              }`}
            >
              {classDetail.IsPublic ? "Lớp công khai" : "Lớp cần duyệt"}
            </span>
          </div>
          <p className="mt-1 text-fg-muted">
            {classDetail.Description || "Chưa có mô tả cho lớp học này."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {classDetail.TeacherID === actor.userId &&
            classDetail.ApprovalStatus === "Rejected" &&
            !classDetail.IsCancelled && <ResubmitClassButton classId={classId} />}
          {!classDetail.IsCancelled && (
            <EditClassDialog
              classId={classId}
              initialClassName={classDetail.ClassName}
              initialDescription={classDetail.Description}
              initialIsPublic={classDetail.IsPublic}
            />
          )}
          {classDetail.TeacherID === actor.userId && !classDetail.IsCancelled && (
            <CancelClassButton classId={classId} className={classDetail.ClassName} />
          )}
        </div>
      </div>

      {classDetail.IsCancelled && (
        <div className="rounded-lg border border-bad/30 bg-bad/5 px-4 py-3 text-sm text-bad">
          Lớp đã hủy. Học sinh cũ vẫn có thể xem bài tập và lịch sử nộp bài; lớp không nhận học sinh hoặc bài nộp mới.
        </div>
      )}

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
        <Link
          href={`/teacher/classes/${classId}?tab=requests`}
          className={`flex items-center gap-1.5 pb-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "requests"
              ? "border-primary text-primary"
              : "border-transparent text-fg-muted hover:text-fg"
          }`}
        >
          <span>Yêu cầu tham gia</span>
          {pendingRequestsCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-bold text-primary-fg">
              {pendingRequestsCount}
            </span>
          )}
        </Link>
      </div>

      {activeTab === "overview" && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">

        <div className="card p-4">
          <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
            Mã mời tham gia
          </span>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-xl font-bold text-primary">
              {classDetail.InviteCode}
            </span>
          </div>
        </div>

        <div className="card p-4">
          <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
            Tổng số học sinh
          </span>
          <p className="mt-2 text-xl font-bold text-fg">{students.length} học sinh</p>
        </div>

        <div className="card p-4">
          <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
            Bài tập đã giao
          </span>
          <p className="mt-2 text-xl font-bold text-fg">{problems.length} bài tập</p>
        </div>

        <div className="card p-4">
          <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
            Tài liệu đã đăng
          </span>
          <p className="mt-2 text-xl font-bold text-fg">{documents.length} tài liệu</p>
        </div>

        <div className="card p-4">
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
          {!classDetail.IsCancelled && (
            <AssignProblemDialog classId={classId} availableProblems={availableToAdd} />
          )}
        </div>

        <div className="card overflow-hidden">
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
                        <Link
                          href={`/teacher/classes/${classId}?tab=submissions&problemId=${p.ProblemID}`}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Danh sách nộp bài
                        </Link>
                        {p.Status === "Pending" && (
                          <ApproveProblemButton problemId={p.ProblemID} />
                        )}
                        {!classDetail.IsCancelled && (
                          <RemoveClassProblemButton
                            classId={classId}
                            problemId={p.ProblemID}
                            problemTitle={p.Title}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-2 text-base font-semibold text-fg">Đăng tải tài liệu học tập</h2>
        <p className="mb-4 text-xs text-fg-muted">
          Tải lên bài giảng, slide, bài tập hoặc tài liệu tham khảo cho học sinh trong lớp.
        </p>
        {!classDetail.IsCancelled && <DocumentUploadForm classId={classId} />}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Tài liệu học tập ({documents.length})</h2>
        <TeacherDocumentList classId={classId} documents={documents} />
      </div>

      {!classDetail.IsCancelled && <div className="card p-5">
        <h2 className="mb-2 text-base font-semibold text-fg">Thêm học sinh vào lớp</h2>
        <p className="mb-4 text-xs text-fg-muted">
          Nhập địa chỉ email hoặc tên đăng nhập của học sinh để thêm trực tiếp vào lớp.
        </p>
        <AddStudentForm classId={classId} />
      </div>}

      <TeacherClassStudentsManager classId={classId} students={students} />
        </div>
      )}

      {activeTab === "submissions" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase text-fg-muted mr-1">Bài tập:</span>
              <Link
                href={buildSubmissionsHref({ problemId: null, page: 1 })}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  !selectedProblemId
                    ? "bg-primary text-primary-fg"
                    : "bg-muted text-fg-muted hover:text-fg"
                }`}
              >
                Tất cả bài tập
              </Link>
              {problems.map((prob) => {
                const isSelected = selectedProblemId === prob.ProblemID;
                return (
                  <Link
                    key={prob.ProblemID}
                    href={buildSubmissionsHref({ problemId: prob.ProblemID, page: 1 })}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-fg"
                        : "bg-muted text-fg-muted hover:text-fg"
                    }`}
                  >
                    #{prob.ProblemID} - {prob.Title}
                  </Link>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
              <span className="text-xs font-semibold uppercase text-fg-muted mr-1">Kết quả:</span>
              {VERDICT_FILTERS.map((f) => {
                const isSelected = (selectedResult || "") === f.value;
                return (
                  <Link
                    key={f.value}
                    href={buildSubmissionsHref({ result: f.value || null, page: 1 })}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-fg"
                        : "bg-muted text-fg-muted hover:text-fg"
                    }`}
                  >
                    {f.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-muted font-medium text-fg-muted">
                <tr>
                  <th className="px-4 py-3">STT</th>
                  <th className="px-4 py-3">Sinh viên</th>
                  <th className="px-4 py-3">Bài tập</th>
                  <th className="px-4 py-3">Kết quả</th>
                  <th className="px-4 py-3">Ngôn ngữ</th>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Bộ nhớ</th>
                  <th className="px-4 py-3">Thời gian nộp</th>
                  <th className="px-4 py-3 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {submissions.items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-fg-muted">
                      Chưa có lượt nộp bài nào phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  submissions.items.map((s, idx) => (
                    <tr key={s.SubmissionID} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-fg-muted font-mono text-xs">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-fg">{s.FullName}</div>
                        <div className="text-xs text-fg-muted">@{s.Username}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/teacher/problems/${s.ProblemID}`}
                          className="font-medium text-fg hover:text-primary hover:underline"
                        >
                          #{s.ProblemID} - {s.ProblemTitle}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <VerdictBadge value={s.Result} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{s.Language}</td>
                      <td className="px-4 py-3 text-xs text-fg-muted">
                        {s.Runtime !== null && s.Runtime !== undefined ? `${s.Runtime}ms` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-fg-muted">
                        {s.Memory !== null && s.Memory !== undefined ? `${(s.Memory / 1024).toFixed(1)}MB` : "—"}
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

          {submissions.total > PAGE_SIZE && (
            <div className="flex justify-center pt-2">
              <Pager
                page={page}
                pageSize={PAGE_SIZE}
                total={submissions.total}
                buildHref={(p) => buildSubmissionsHref({ page: p })}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === "requests" && (
        <TeacherClassJoinRequests requests={joinRequests} classId={classId} />
      )}
    </div>
  );
}
