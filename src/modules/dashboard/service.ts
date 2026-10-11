import "server-only";
import * as repo from "./repo";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export type HeatCell = { day: string; level: 0 | 1 | 2 | 3 | 4; count: number } | null;

function parseDay(day: string) {
  return new Date(`${day}T00:00:00Z`);
}
function fmtDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

function level(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

/** Lưới 26 tuần × 7 ngày (thứ 2 → CN), duyệt theo cột; ô sau hôm nay là null. */
export function buildHeatmap(activity: repo.ActivityDay[], today: string): HeatCell[] {
  const counts = new Map(activity.map((a) => [a.Day, a.Cnt]));
  const t = parseDay(today);
  const mondayOffset = (t.getUTCDay() + 6) % 7;
  const start = new Date(t.getTime() - (mondayOffset + 25 * 7) * DAY_MS);
  const cells: HeatCell[] = [];
  for (let i = 0; i < 26 * 7; i++) {
    const d = new Date(start.getTime() + i * DAY_MS);
    if (d > t) {
      cells.push(null);
      continue;
    }
    const day = fmtDay(d);
    const count = counts.get(day) ?? 0;
    cells.push({ day, level: level(count), count });
  }
  return cells;
}

export async function getUserDashboard(userId: number) {
  const data = await repo.getUserDashboard(userId);
  return { ...data, heatmap: buildHeatmap(data.activity, data.summary.Today) };
}

/** 7 ngày gần nhất, điền 0 cho ngày không có bài nộp. */
export async function getTeacherDashboard(teacherId: number) {
  const data = await repo.getTeacherDashboard(teacherId);
  const counts = new Map(data.daily.map((d) => [d.Day, d.Cnt]));
  const today = parseDay(data.summary.Today);
  const series = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getTime() - (6 - i) * DAY_MS);
    return { label: WEEKDAYS[d.getUTCDay()], value: counts.get(fmtDay(d)) ?? 0 };
  });
  return { ...data, series };
}

export async function getAdminDashboard() {
  return repo.getAdminDashboard();
}
