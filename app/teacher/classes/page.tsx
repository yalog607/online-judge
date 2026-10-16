import { requireRole } from "@/lib/dal";
import { classRepository } from "@/modules/class/repo";
import { ClassCard, ClassSection } from "@/components/class-card";
import { ClassActiveBadge, ClassApprovalBadge } from "@/components/badge";
import { PageHeader } from "@/components/page-header";
import { pageHrefBuilder, paginate, parsePage } from "@/lib/paginate";
import { JoinClassForm } from "@/components/join-class-form";

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

  return (
    <div className="flex flex-col gap-6 pt-8">
      <PageHeader
        title="Lớp học"
        description="Quản lý lớp đang dạy và truy cập các lớp bạn tham gia."
        action={{ href: "/teacher/classes/new", label: "+ Tạo lớp học" }}
      />

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
        buildHref={pageHrefBuilder(sp, "po")}
        hrefPrefix="/teacher/classes"
        empty="Bạn chưa tạo lớp học nào."
        label="Giảng viên"
      />
      <ClassCards
        title={`Lớp tôi đã tham gia (${joinedClasses.length})`}
        classes={joinedClasses}
        pageKey="pj"
        sp={sp}
        buildHref={pageHrefBuilder(sp, "pj")}
        hrefPrefix="/teacher/classes"
        empty="Bạn chưa tham gia lớp học nào."
        label="Đã tham gia"
      />
      <ClassCards
        title={`Lớp công khai khác (${otherClasses.length})`}
        classes={otherClasses}
        pageKey="pc"
        sp={sp}
        buildHref={pageHrefBuilder(sp, "pc")}
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
  return (
    <ClassSection
      title={title}
      empty={empty}
      isEmpty={paged.items.length === 0}
      pager={{ page: paged.page, pageSize: CLASS_PAGE_SIZE, total: paged.total, buildHref }}
    >
      {paged.items.map((c) => (
        <ClassCard
          key={c.ClassID}
          href={`${hrefPrefix}/${c.ClassID}`}
          name={c.ClassName}
          description={c.Description}
          teacherName={c.TeacherName}
          studentCount={c.StudentCount}
          kicker={c.IsCancelled ? "Đã hủy · chỉ xem lịch sử" : label}
          kickerTone={c.IsCancelled ? "bad" : "primary"}
          badges={
            <>
              <ClassApprovalBadge status={c.ApprovalStatus} />
              <ClassActiveBadge cancelled={c.IsCancelled} />
            </>
          }
          ctaLabel={label === "Giảng viên" || c.IsTA ? "Quản lý lớp" : "Vào lớp"}
        />
      ))}
    </ClassSection>
  );
}
