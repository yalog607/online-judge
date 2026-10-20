import { requireRole } from "@/lib/dal";
import { PageHeader } from "@/components/page-header";
import { classRepository } from "@/modules/class/repo";
import { ClassCard, ClassSection } from "@/components/class-card";
import { pageHrefBuilder, paginate, parsePage } from "@/lib/paginate";
import { JoinClassForm } from "@/components/join-class-form";

const CLASS_PAGE_SIZE = 9;

export default async function UserClassesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireRole("User", "TA", "Teacher", "Admin");
  const sp = await searchParams;

  const { classes } = await classRepository.listClasses({
    userId: user.userId,
    search: sp.q,
    page: 1,
    pageSize: 500,
  });

  const allTa = classes.filter((c) => c.IsTA);
  const allMine = classes.filter((c) => c.IsJoined && !c.IsTA);
  const allOther = classes.filter((c) => !c.IsJoined && !c.IsTA);
  const taPage = paginate(allTa, parsePage(sp.pt), CLASS_PAGE_SIZE);
  const minePage = paginate(allMine, parsePage(sp.pm), CLASS_PAGE_SIZE);
  const otherPage = paginate(allOther, parsePage(sp.po), CLASS_PAGE_SIZE);
  const taClasses = taPage.items;
  const myClasses = minePage.items;
  const otherClasses = otherPage.items;

  const getHref = (classId: number) => {
    return `/user/classes/${classId}`;
  };

  return (
    <div className="flex flex-col gap-8 pt-8">
      <PageHeader
        title="Lớp học của tôi"
        description="Tham gia các lớp học của giảng viên để làm bài tập và theo dõi tiến độ học tập."
      />

      <div className="card p-6">
        <h2 className="mb-2 text-base font-semibold">Tham gia lớp học mới</h2>
        <p className="mb-4 text-sm text-fg-muted">
          Nhập mã mời được cung cấp bởi giảng viên để tham gia vào lớp.
        </p>
        <JoinClassForm />
      </div>

      <form className="flex flex-wrap gap-3 card p-3" method="get">
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

      <ClassSection
        title={`Lớp học bạn đã tham gia (${allMine.length})`}
        empty="Bạn chưa tham gia lớp học nào. Hãy nhập mã mời phía trên để tham gia lớp."
        isEmpty={myClasses.length === 0}
        pager={{ page: minePage.page, pageSize: CLASS_PAGE_SIZE, total: minePage.total, buildHref: pageHrefBuilder(sp, "pm") }}
      >
        {myClasses.map((c) => (
          <ClassCard
            key={c.ClassID}
            href={getHref(c.ClassID)}
            name={c.ClassName}
            description={c.Description}
            teacherName={c.TeacherName}
            kicker={c.IsCancelled ? "Đã hủy · chỉ xem lịch sử" : "Đang tham gia"}
            kickerTone={c.IsCancelled ? "bad" : "primary"}
            ctaLabel="Vào lớp"
          />
        ))}
      </ClassSection>

      {allTa.length > 0 && (
        <ClassSection
          title="Lớp học bạn phụ trách (Trợ giảng)"
          empty=""
          isEmpty={false}
          pager={{ page: taPage.page, pageSize: CLASS_PAGE_SIZE, total: taPage.total, buildHref: pageHrefBuilder(sp, "pt") }}
        >
          {taClasses.map((c) => (
            <ClassCard
              key={c.ClassID}
              variant="ta"
              href={getHref(c.ClassID)}
              name={c.ClassName}
              description={c.Description}
              teacherName={c.TeacherName}
              studentCount={c.StudentCount}
              kicker="Trợ giảng"
              ctaLabel="Quản lý lớp"
            />
          ))}
        </ClassSection>
      )}

      {allOther.length > 0 && (
        <ClassSection
          title={`Các lớp học khác (${allOther.length})`}
          empty=""
          isEmpty={false}
          pager={{ page: otherPage.page, pageSize: CLASS_PAGE_SIZE, total: otherPage.total, buildHref: pageHrefBuilder(sp, "po") }}
        >
          {otherClasses.map((c) => (
            <ClassCard
              key={c.ClassID}
              href={getHref(c.ClassID)}
              name={c.ClassName}
              description={c.Description}
              teacherName={c.TeacherName}
              kicker={c.IsPublic ? "Lớp công khai" : "Lớp cần duyệt"}
              kickerTone={c.IsPublic ? "ok" : "warn"}
              ctaLabel="Xem chi tiết"
            />
          ))}
        </ClassSection>
      )}
    </div>
  );
}
