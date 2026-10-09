import Link from "next/link";
import { verifySession, roleHome } from "@/lib/dal";
import { Logo } from "@/components/logo";
import { Icon, type IconName } from "@/components/icon";
import { Badge } from "@/components/badge";

const SAMPLE_CODE = `#include <bits/stdc++.h>
using namespace std;

int main() {
    long long a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}`;

const SAMPLE_TESTS = [
  { name: "#1", time: "3 ms" },
  { name: "#2", time: "4 ms" },
  { name: "#3", time: "4 ms" },
  { name: "#4", time: "6 ms" },
  { name: "#5", time: "9 ms" },
  { name: "#6 ẩn", time: "12 ms" },
];

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "code",
    title: "Chấm tự động",
    body: "Nhiều ngôn ngữ lập trình. Phán quyết AC, WA, TLE, CE, RE kèm thời gian và bộ nhớ cho từng testcase.",
  },
  {
    icon: "shield",
    title: "Sandbox cách ly",
    body: "Code chạy trong container tắt mạng, giới hạn CPU, RAM, số tiến trình và dung lượng output.",
  },
  {
    icon: "users",
    title: "Quản lý lớp học",
    body: "Tạo lớp, chia sẻ mã mời, nhập danh sách bằng Excel và giao bài kèm hạn nộp.",
  },
  {
    icon: "trophy",
    title: "Kỳ thi trực tuyến",
    body: "Bảng xếp hạng theo điểm và thời gian phạt, khóa bằng mật khẩu, giám sát trực tiếp.",
  },
  {
    icon: "upload",
    title: "Testcase từ file ZIP",
    body: "Ghép cặp file vào và ra, tự đặt ở chế độ ẩn để học viên không xem được đáp án.",
  },
  {
    icon: "chart",
    title: "Báo cáo tiến độ",
    body: "Biểu đồ theo tuần và mức thành thạo theo chủ đề cho từng học viên.",
  },
];

const STEPS = [
  {
    title: "Nộp bài",
    body: "Chọn ngôn ngữ, dán code và bấm nộp. Bài nộp được lưu ngay vào hệ thống.",
  },
  {
    title: "Chấm trong sandbox",
    body: "Worker nhận bài từ hàng đợi, biên dịch và chạy từng testcase, rồi so sánh output với đáp án.",
  },
  {
    title: "Xem kết quả",
    body: "Phán quyết, thời gian và bộ nhớ hiện ngay trong trang. Có thể gửi khiếu nại nếu cần chấm lại.",
  },
];

const VERDICTS: { code: string; kind: "ok" | "bad" | "warn"; body: string }[] = [
  { code: "AC", kind: "ok", body: "Bài làm đúng với mọi testcase." },
  { code: "WA", kind: "bad", body: "Output khác đáp án ở ít nhất một testcase." },
  { code: "TLE", kind: "warn", body: "Chạy quá thời gian cho phép." },
  { code: "CE", kind: "warn", body: "Code không biên dịch được." },
  { code: "RE", kind: "bad", body: "Chương trình dừng giữa chừng do lỗi khi chạy." },
];

const ROLES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "user",
    title: "Học viên",
    body: "Luyện bài theo chủ đề, tham gia lớp và kỳ thi, xem lịch sử nộp bài.",
  },
  {
    icon: "book",
    title: "Giảng viên và trợ giảng",
    body: "Soạn bài, giao bài cho lớp, tạo kỳ thi, giám sát trực tiếp và chấm lại khi có khiếu nại.",
  },
  {
    icon: "settings",
    title: "Quản trị viên",
    body: "Duyệt yêu cầu trợ giảng, quản lý người dùng và theo dõi hệ thống chấm bài.",
  },
];

const KEYWORD = /^(using|namespace|int|long|return)$/;
const FUNCTION = /^(cin|cout|endl)$/;

function CodeLine({ line }: { line: string }) {
  const parts = line.split(/(#include.*|\b(?:using|namespace|int|long|return|cin|cout|endl)\b)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("#include")) {
          return (
            <span key={i} className="text-fg-muted">
              {part}
            </span>
          );
        }
        if (KEYWORD.test(part)) {
          return (
            <span key={i} className="text-indigo">
              {part}
            </span>
          );
        }
        if (FUNCTION.test(part)) {
          return (
            <span key={i} className="text-primary">
              {part}
            </span>
          );
        }
        return part;
      })}
    </>
  );
}

async function currentHome() {
  try {
    const user = await verifySession();
    return user ? roleHome(user.role) : null;
  } catch {
    // Trang giới thiệu vẫn phải mở được khi không đọc được phiên đăng nhập.
    return null;
  }
}

const BTN_PRIMARY =
  "inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-fg shadow-card transition-opacity hover:opacity-90";
const BTN_SECONDARY =
  "inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-5 py-2.5 font-medium transition-colors hover:bg-muted";

function SectionHead({ kicker, title, lead }: { kicker: string; title: string; lead?: string }) {
  return (
    <div className="mb-9 max-w-2xl">
      <span className="mb-2.5 block text-xs font-semibold tracking-[0.08em] text-primary uppercase">
        {kicker}
      </span>
      <h2 className="text-[clamp(26px,3.4vw,36px)] leading-[1.1] font-bold tracking-[-0.03em] text-balance">
        {title}
      </h2>
      {lead && <p className="mt-2.5 text-base text-fg-muted">{lead}</p>}
    </div>
  );
}

export default async function Home() {
  const home = await currentHome();

  return (
    <div className="flex-1 bg-bg">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center gap-3 px-5">
          <Logo />
          <nav className="ml-6 flex gap-1 text-fg-muted max-[820px]:hidden">
            {[
              ["#tinh-nang", "Tính năng"],
              ["#quy-trinh", "Quy trình"],
              ["#ket-qua", "Kết quả chấm"],
              ["#vai-tro", "Vai trò"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-lg px-3 py-2 font-medium hover:bg-muted hover:text-fg"
              >
                {label}
              </a>
            ))}
          </nav>
          <span className="flex-1" />
          {home ? (
            <Link href={home} className={`${BTN_PRIMARY} !px-4 !py-2`}>
              Vào trang của tôi
            </Link>
          ) : (
            <>
              <Link href="/login" className={`${BTN_SECONDARY} !px-4 !py-2`}>
                Đăng nhập
              </Link>
              <Link href="/register" className={`${BTN_PRIMARY} !px-4 !py-2`}>
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden py-[72px] max-[1000px]:py-11">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(var(--grid-line)_1px,transparent_1px),linear-gradient(90deg,var(--grid-line)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:linear-gradient(#000_25%,transparent)]"
          />
          <div className="relative mx-auto grid w-full max-w-[1200px] grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] items-center gap-12 px-5 max-[1000px]:grid-cols-1">
            <div className="flex min-w-0 flex-col items-start">
              <h1 className="mb-[18px] text-[clamp(34px,5.2vw,58px)] leading-[1.04] font-bold tracking-[-0.04em] text-balance">
                Thực hành và luyện tập không ngừng
              </h1>
              <p className="mb-7 max-w-[520px] text-lg leading-relaxed text-fg-muted">
                ITOJ là hệ thống luyện tập lập trình, hỗ trợ chấm bài cho lớp học và kỳ thi. Sinh
                viên luyện thuật toán, giảng viên theo dõi tiến độ của học viên rõ ràng.
              </p>
              <div className="flex flex-wrap gap-3">
                {home ? (
                  <Link href={home} className={BTN_PRIMARY}>
                    <Icon name="send" size={16} />
                    Vào trang của tôi
                  </Link>
                ) : (
                  <>
                    <Link href="/register" className={BTN_PRIMARY}>
                      <Icon name="send" size={16} />
                      Bắt đầu luyện tập
                    </Link>
                    <Link href="/login" className={BTN_SECONDARY}>
                      Đăng nhập
                    </Link>
                  </>
                )}
              </div>
              <ul className="mt-7 flex flex-col gap-2 text-fg-muted">
                {[
                  "Mỗi bài chạy trong container riêng",
                  "Tắt mạng, giới hạn CPU, RAM, thời gian",
                  "Kết quả theo từng testcase",
                ].map((text) => (
                  <li key={text} className="flex items-center gap-2">
                    <Icon name="check" size={15} className="text-ok" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            <div
              aria-label="Ví dụ một lần chấm bài"
              className="min-w-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
            >
              <div className="flex items-center gap-3 border-b border-line bg-muted px-3.5 py-2.5">
                <span className="flex gap-1.5" aria-hidden="true">
                  <i className="h-2.5 w-2.5 rounded-full bg-neutral-soft" />
                  <i className="h-2.5 w-2.5 rounded-full bg-neutral-soft" />
                  <i className="h-2.5 w-2.5 rounded-full bg-neutral-soft" />
                </span>
                <b className="font-mono text-[12.5px]">tong_hai_so.cpp</b>
                <span className="flex-1" />
                <Badge kind="info">C++ 17</Badge>
              </div>
              <pre className="overflow-x-auto py-3 font-mono text-[13px] leading-[1.7]">
                {SAMPLE_CODE.split("\n").map((line, i) => (
                  <div key={i} className="grid grid-cols-[40px_minmax(0,1fr)]">
                    <span className="pr-3.5 text-right text-fg-muted/70 select-none">{i + 1}</span>
                    <code>
                      <CodeLine line={line} />
                    </code>
                  </div>
                ))}
              </pre>
              <div className="flex justify-between gap-2.5 border-t border-line bg-muted px-4 py-2.5 text-[13px]">
                <b>Kết quả chấm</b>
                <span className="text-fg-muted">Bài 1 · Tổng hai số</span>
              </div>
              {SAMPLE_TESTS.map((t, i) => (
                <div
                  key={t.name}
                  style={{ animationDelay: `${0.35 + i * 0.16}s` }}
                  className="rise grid grid-cols-[64px_1fr_auto] items-center gap-3 border-t border-line px-4 py-2 text-[13px]"
                >
                  <span className="font-mono">{t.name}</span>
                  <span>
                    <Badge kind="ok">✓ Accepted</Badge>
                  </span>
                  <span className="font-mono text-fg-muted">{t.time}</span>
                </div>
              ))}
              <div
                style={{ animationDelay: "1.4s" }}
                className="rise flex items-center gap-3.5 bg-ok-soft px-4 py-3.5 text-ok"
              >
                <Icon name="check" size={22} />
                <div>
                  <b className="text-[17px]">Accepted</b>
                  <div className="text-[13px]">10/10 testcase · 12 ms · 4.2 MB</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="tinh-nang" className="scroll-mt-16 py-[72px] max-[820px]:py-[52px]">
          <div className="mx-auto w-full max-w-[1200px] px-5">
            <SectionHead
              kicker="Tính năng"
              title="Mọi thứ một lớp học lập trình cần"
              lead="Từ bài tập đầu tiên đến kỳ thi cuối kỳ, trên cùng một hệ thống."
            />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="card flex flex-col gap-3 p-[22px]">
                  <div className="grid h-11 w-11 place-items-center rounded-[10px] bg-primary-soft text-primary">
                    <Icon name={f.icon} size={22} />
                  </div>
                  <h3 className="text-base font-semibold">{f.title}</h3>
                  <p className="text-fg-muted">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="quy-trinh"
          className="scroll-mt-16 border-y border-line bg-surface py-[72px] max-[820px]:py-[52px]"
        >
          <div className="mx-auto w-full max-w-[1200px] px-5">
            <SectionHead kicker="Quy trình" title="Một lần nộp bài đi qua ba bước" />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4">
              {STEPS.map((s, i) => (
                <div key={s.title} className="card flex flex-col gap-2 p-[22px]">
                  <div className="mb-1.5 grid h-[30px] w-[30px] place-items-center rounded-full bg-fg text-[13px] font-bold text-bg">
                    {i + 1}
                  </div>
                  <h3 className="text-base font-semibold">{s.title}</h3>
                  <p className="text-fg-muted">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="ket-qua" className="scroll-mt-16 py-[72px] max-[820px]:py-[52px]">
          <div className="mx-auto w-full max-w-[1200px] px-5">
            <SectionHead
              kicker="Kết quả chấm"
              title="Biết ngay bài làm sai ở đâu"
              lead="Năm phán quyết quen thuộc của các kỳ thi lập trình."
            />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3">
              {VERDICTS.map((v) => (
                <div key={v.code} className="card flex flex-col items-start gap-2.5 p-4">
                  <Badge kind={v.kind}>{v.code}</Badge>
                  <p className="text-[13px] text-fg-muted">{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="vai-tro"
          className="scroll-mt-16 border-y border-line bg-surface py-[72px] max-[820px]:py-[52px]"
        >
          <div className="mx-auto w-full max-w-[1200px] px-5">
            <SectionHead kicker="Vai trò" title="Mỗi người một góc làm việc riêng" />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-4">
              {ROLES.map((r) => (
                <div key={r.title} className="card flex flex-col gap-3 p-[22px]">
                  <div className="grid h-11 w-11 place-items-center rounded-[10px] bg-primary-soft text-primary">
                    <Icon name={r.icon} size={22} />
                  </div>
                  <h3 className="text-base font-semibold">{r.title}</h3>
                  <p className="text-fg-muted">{r.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {!home && (
          <section className="py-[72px] max-[820px]:py-[52px]">
            <div className="mx-auto w-full max-w-[1200px] px-5">
              <div className="flex flex-col items-center gap-3.5 rounded-[20px] bg-fg px-6 py-[52px] text-center text-bg">
                <h2 className="text-[clamp(26px,3.4vw,36px)] font-bold tracking-[-0.03em]">
                  Sẵn sàng cho bài đầu tiên?
                </h2>
                <p className="opacity-75">Tạo tài khoản bằng email và xác thực OTP trong một phút.</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/register" className={BTN_PRIMARY}>
                    <Icon name="send" size={16} />
                    Tạo tài khoản
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center rounded-lg px-5 py-2.5 font-medium hover:bg-bg/15"
                  >
                    Tôi đã có tài khoản
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-line py-10">
        <div className="mx-auto w-full max-w-[1200px] px-5">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-6">
            <div className="flex flex-col gap-2.5">
              <Logo />
              <p className="text-fg-muted">Hệ thống chấm bài lập trình trực tuyến.</p>
            </div>
            <div className="flex flex-col gap-2 text-fg-muted">
              <b className="text-fg">Tài khoản</b>
              <Link href="/login" className="hover:text-fg">
                Đăng nhập
              </Link>
              <Link href="/register" className="hover:text-fg">
                Đăng ký
              </Link>
            </div>
          </div>
          <div className="mt-7 text-[13px] text-fg-muted">
            © {new Date().getFullYear()} ITOJ · Đồ án Công nghệ phần mềm
          </div>
        </div>
      </footer>
    </div>
  );
}
