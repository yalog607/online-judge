import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { classRepository } from "@/modules/class/repo";
import { documentRepository } from "@/modules/document/repo";
import { leaveClassAction, joinPublicClassAction } from "@/modules/class/actions";
import { DifficultyBadge, UserStatusBadge } from "@/components/badge";
import { LeaveButton } from "./leave-button";
import { JoinPublicButton } from "./join-public-button";
import { TAClassView } from "./ta-class-view";

function getFormatTag(fileName: string, url: string) {
  const extFromFileName = fileName.includes(".") ? fileName.split(".").pop() : "";
  const extFromUrl = url.includes(".") ? url.split(".").pop()?.split("?")[0] : "";
  const ext = (extFromFileName || extFromUrl || "FILE").toUpperCase();
  return ext.length > 5 ? "FILE" : ext;
}

export default async function UserClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const user = await requireRole("User", "TA");
  const { id } = await params;
  const sParams = await searchParams;
  const activeTab = sParams?.tab || "overview";
  const classId = parseInt(id, 10);
  if (isNaN(classId)) notFound();

  const classDetail = await classRepository.getClassDetail(classId, user.userId);
  if (!classDetail) notFound();

  if (classDetail.IsTA) {
    return <TAClassView classId={classId} userId={user.userId} activeTab={activeTab} />;
  }

  const [problems, documents] = await Promise.all([
    classRepository.getClassProblems(classId, user.userId),
    documentRepository.listDocuments(classId, user.userId).catch(() => []),
  ]);

  const leaveActionWithId = leaveClassAction.bind(null, classId);
  const joinPublicActionWithId = joinPublicClassAction.bind(null, classId);

  return (
    <div className="flex flex-col gap-6 pt-8">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/user/classes"
            className="text-sm font-medium text-fg-muted hover:text-fg hover:underline"
          >
            ← Quay lại danh sách lớp học
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{classDetail.ClassName}</h1>
          <p className="mt-1 text-fg-muted">
            {classDetail.Description || "Chưa có mô tả cho lớp học này."}
          </p>
        </div>

        {classDetail.IsJoined ? (
          <form action={leaveActionWithId}>
            <LeaveButton />
          </form>
        ) : classDetail.IsPublic ? (
          <form action={joinPublicActionWithId}>
            <JoinPublicButton />
          </form>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="card p-4">
          <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
            Giảng viên
          </span>
          <p className="mt-2 text-lg font-bold text-fg">{classDetail.TeacherName}</p>
          <span className="text-xs text-fg-muted">{classDetail.TeacherEmail}</span>
        </div>

        <div className="card p-4">
          <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
            Trạng thái tham gia
          </span>
          <p className="mt-2 text-lg font-bold text-ok">
            {classDetail.IsJoined ? "Đã tham gia" : "Chưa tham gia"}
          </p>
        </div>

        <div className="card p-4">
          <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
            Sĩ số lớp
          </span>
          <p className="mt-2 text-lg font-bold text-fg">{classDetail.StudentCount} học sinh</p>
        </div>

        {Boolean(classDetail.IsJoined) && (
          <div className="card p-4">
            <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
              Tài liệu học tập
            </span>
            <p className="mt-2 text-lg font-bold text-fg">{documents.length} tài liệu</p>
          </div>
        )}
      </div>

      {Boolean(classDetail.IsJoined) && (
        <>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tài liệu học tập ({documents.length})</h2>
        </div>

        {documents.length === 0 ? (
          <div className="card p-8 text-center text-fg-muted">
            Lớp học hiện chưa có tài liệu nào được chia sẻ.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-muted text-xs uppercase text-fg-muted">
                <tr>
                  <th className="px-5 py-3">STT</th>
                  <th className="px-5 py-3">Tên tài liệu</th>
                  <th className="px-5 py-3">Định dạng</th>
                  <th className="px-5 py-3">Phân loại</th>
                  <th className="px-5 py-3">Ngày đăng</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {documents.map((doc, idx) => {
                  const format = getFormatTag(doc.FileName, doc.CloudinaryURL);
                  return (
                    <tr key={doc.DocumentID} className="hover:bg-muted/50 transition-colors">
                      <td className="px-5 py-4 text-fg-muted">{idx + 1}</td>
                      <td className="px-5 py-4 font-medium text-fg">
                        <a
                          href={doc.CloudinaryURL}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-primary hover:underline"
                        >
                          {doc.FileName}
                        </a>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-block rounded border border-line bg-muted/60 px-2 py-0.5 font-mono text-[11px] font-semibold text-fg">
                          {format}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-xs text-fg-muted">
                          {doc.Category || "Chung"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-fg-muted">
                        {new Date(doc.UploadDate).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <a
                          href={doc.CloudinaryURL}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-fg hover:bg-muted transition-colors"
                        >
                          Tải về / Xem →
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bài tập được giao ({problems.length})</h2>
        </div>

        {problems.length === 0 ? (
          <div className="card p-8 text-center text-fg-muted">
            Lớp học hiện chưa có bài tập nào được giao. Vui lòng quay lại sau!
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-muted text-xs uppercase text-fg-muted">
                <tr>
                  <th className="px-5 py-3">Bài tập</th>
                  <th className="px-5 py-3">Độ khó</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3">Hạn nộp</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {problems.map((p) => (
                  <tr key={p.ProblemID} className="hover:bg-muted/50 transition-colors">
                    <td className="px-5 py-4">
                      <Link
                        href={`/user/problems/${p.ProblemID}`}
                        className="font-medium text-fg hover:underline"
                      >
                        {p.Title}
                      </Link>
                      <div className="mt-0.5 text-xs text-fg-muted">
                        Giới hạn: {(p.TimeLimit / 1000).toFixed(1)}s, {p.MemoryLimit}MB
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <DifficultyBadge value={p.Difficulty} />
                    </td>
                    <td className="px-5 py-4">
                      <UserStatusBadge value={p.UserStatus} />
                    </td>
                    <td className="px-5 py-4 text-xs text-fg-muted">
                      {p.DueDate
                        ? new Date(p.DueDate).toLocaleString("vi-VN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "Không giới hạn"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/user/problems/${p.ProblemID}`}
                        className="inline-flex items-center rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-fg hover:bg-muted transition-colors"
                      >
                        Làm bài →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
