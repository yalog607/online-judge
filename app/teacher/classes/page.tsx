import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { classRepository } from "@/modules/class/repo";
import { Pager } from "@/components/pager";
import { paginate, parsePage } from "@/lib/paginate";
import { JoinClassForm } from "../../user/classes/join-class-form";

const CLASS_PAGE_SIZE = 9;

export default async function TeacherClassesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requireRole("Teacher", "Admin");
  const sp = await searchParams;
  const { classes } = await classRepository.listClasses({
    userId: actor.userId,
    search: sp.q,
    onlyMine: false,
    page: 1,
    pageSize: 500,
  });
  const ownedClasses = classes.filter((c) => c.TeacherID === actor.userId);
  const joinedClasses = classes.filter(
    (c) => c.IsJoined && c.TeacherID !== actor.userId && !c.IsTA,
  );
  const otherClasses = classes.filter(
    (c) => !c.IsJoined && c.TeacherID !== actor.userId && !c.IsTA,
  );

  const hrefFor = (key: string) => (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v !== undefined && k !== key) params.set(k, v);
    params.set(key, String(p));
    return `?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lớp học</h1>
          <p className="mt-1 text-fg-muted">
            Quản lý lớp đang dạy và truy cập các lớp bạn tham gia.
          </p>
        </div>
        <Link
          href="/teacher/classes/new"
          className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-fg hover:opacity-90"
        >
          + Tạo lớp học
        </Link>
      </div>

      <div className="card p-5">
        <h2 className="mb-2 font-semibold">Tham gia lớp bằng mã mời</h2>
        <JoinClassForm />
      </div>

      <form className="flex flex-wrap gap-3 card p-3" method="get">
        {sp.view === "mine" && <input type="hidden" name="view" value="mine" />}
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Tìm theo tên lớp học..."
          className="min-w-[200px] flex-1 rounded-lg border border-line bg-muted px-3 py-2 text-fg"
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-fg"
        >
          Tìm kiếm
        </button>
      </form>

      <ClassCards
        title={`Lớp tôi quản lý (${ownedClasses.length})`}
        classes={ownedClasses}
        pageKey="po"
        sp={sp}
        buildHref={hrefFor("po")}
        hrefPrefix="/teacher/classes"
        empty="Bạn chưa tạo lớp học nào."
        label="Giảng viên"
      />
      <ClassCards
        title={`Lớp tôi đã tham gia (${joinedClasses.length})`}
        classes={joinedClasses}
        pageKey="pj"
        sp={sp}
        buildHref={hrefFor("pj")}
        hrefPrefix="/teacher/classes"
        empty="Bạn chưa tham gia lớp học nào."
        label="Đã tham gia"
      />
      <ClassCards
        title={`Lớp công khai khác (${otherClasses.length})`}
        classes={otherClasses}
        pageKey="pc"
        sp={sp}
        buildHref={hrefFor("pc")}
        hrefPrefix="/teacher/classes"
        empty="Không có lớp công khai phù hợp."
        label="Lớp công khai"
      />
    </div>
  );
}

function ClassCards({
  title,
  classes,
  hrefPrefix,
  empty,
  label,
  pageKey,
  sp,
  buildHref,
}: {
  title: string;
  classes: Awaited<ReturnType<typeof classRepository.listClasses>>["classes"];
  hrefPrefix: string;
  empty: string;
  label: string;
  pageKey: string;
  sp: Record<string, string | undefined>;
  buildHref: (page: number) => string;
}) {
  const paged = paginate(classes, parsePage(sp[pageKey]), CLASS_PAGE_SIZE);
  classes = paged.items;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {classes.length === 0 ? (
        <div className="card p-6 text-sm text-fg-muted">{empty}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <article key={c.ClassID} className="card card-hover relative flex flex-col justify-between p-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-primary">
                    {c.IsCancelled ? "Đã hủy · chỉ xem lịch sử" : label}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.ApprovalStatus === "Approved"
                        ? "bg-ok-soft text-ok"
                        : c.ApprovalStatus === "Rejected"
                          ? "bg-bad-soft text-bad"
                          : "bg-warn-soft text-warn"
                    }`}
                  >
                    {c.ApprovalStatus === "Approved"
                      ? "Đã duyệt"
                      : c.ApprovalStatus === "Rejected"
                        ? "Bị từ chối"
                        : "Chờ duyệt"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.IsCancelled ? "bg-muted text-fg-muted" : "bg-ok-soft text-ok"
                    }`}
                  >
                    {c.IsCancelled ? "Đã hủy" : "Đang hoạt động"}
                  </span>
                </div>
                <h3 className="mt-1 text-lg font-semibold">
                  <Link href={`${hrefPrefix}/${c.ClassID}`} className="hover:underline after:absolute after:inset-0">
                    {c.ClassName}
                  </Link>
                </h3>
                <p className="mt-1 text-sm text-fg-muted">
                  Giảng viên: {c.TeacherName} · {c.StudentCount} học sinh
                </p>
              </div>
              <div className="mt-4 flex gap-2">
                <Link
                  href={`${hrefPrefix}/${c.ClassID}`}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-primary-fg"
                >
                  {label === "Giảng viên"
                    ? "Quản lý lớp"
                    : c.IsTA
                      ? "Quản lý lớp"
                      : "Vào lớp"}{" "}
                  →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
      <Pager page={paged.page} pageSize={CLASS_PAGE_SIZE} total={paged.total} buildHref={buildHref} />
    </section>
  );
}
