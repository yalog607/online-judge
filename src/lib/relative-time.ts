const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

// "10 phút trước", "1 giờ trước", "Hôm nay", "Hôm qua", else dd/mm/yyyy (local time).
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diff = now.getTime() - then.getTime();

  if (diff < MINUTE) return "Vừa xong"; // also covers small clock skew (timestamp slightly ahead)
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} phút trước`;
  if (diff < 6 * HOUR) return `${Math.floor(diff / HOUR)} giờ trước`;

  const days = Math.round((startOfDay(now) - startOfDay(then)) / (24 * HOUR));
  if (days <= 0) return "Hôm nay";
  if (days === 1) return "Hôm qua";

  const dd = String(then.getDate()).padStart(2, "0");
  const mm = String(then.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${then.getFullYear()}`;
}
