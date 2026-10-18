import type { ContestDef, Sub, Verdict } from "./types";

// PRNG xác định (mulberry32) để mỗi lần seed sinh cùng một lịch sử bài nộp.
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FAILS: Verdict[] = ["WA", "WA", "WA", "TLE", "RE", "CE"];

// Bài nộp trong các kỳ thi đã kết thúc (khoảng thời gian tính từ lúc bắt đầu kỳ thi).
export function contestSubmissions(contests: ContestDef[]): Sub[] {
  const rand = rng(20260101);
  const out: Sub[] = [];
  // Học viên 1 (user) làm tốt hơn học viên 2 (user2).
  const skill: Record<number, number> = { 1: 0.9, 2: 0.65 };
  for (const c of contests) {
    const duration = c.end - c.start;
    for (const s of c.participants) {
      for (const [j, [problem]] of c.problems.entries()) {
        const solved = rand() < skill[s] - 0.08 * j;
        const wrongs = solved ? Math.floor(rand() * 3) : rand() < 0.6 ? 1 + Math.floor(rand() * 2) : 0;
        let minute = 8 + j * 22 + Math.floor(rand() * 18);
        for (let w = 0; w < wrongs; w++) {
          out.push({
            student: s,
            problem,
            verdict: FAILS[Math.floor(rand() * FAILS.length)],
            contest: c.key,
            at: c.start + Math.min(minute, duration - 2),
          });
          minute += 4 + Math.floor(rand() * 8);
        }
        if (solved) {
          out.push({
            student: s,
            problem,
            verdict: "AC",
            contest: c.key,
            at: c.start + Math.min(minute, duration - 1),
          });
        }
      }
    }
  }
  return out;
}

// Bài nộp luyện tập ngoài kỳ thi, rải trong ~6 tuần gần đây.
export function practiceSubmissions(problemKeys: string[], count: number): Sub[] {
  const rand = rng(20260202);
  const out: Sub[] = [];
  const span = 42 * 24 * 60;
  for (let i = 0; i < count; i++) {
    const student = rand() < 0.55 ? 1 : 2;
    const problem = problemKeys[Math.floor(rand() * problemKeys.length)];
    let at = -Math.floor(rand() * span) - 30;
    const failures = rand() < 0.45 ? 1 + Math.floor(rand() * 2) : 0;
    for (let f = 0; f < failures; f++) {
      out.push({ student, problem, verdict: FAILS[Math.floor(rand() * FAILS.length)], at });
      at += 3 + Math.floor(rand() * 20);
    }
    // Một số học viên bỏ dở sau khi sai.
    if (failures === 0 || rand() < 0.8) out.push({ student, problem, verdict: "AC", at });
  }
  return out;
}
