import type { ContestDef } from "./types";

const DAY = 24 * 60;

// Kỳ thi bổ sung: 4 kỳ đã kết thúc (D-G) và 1 kỳ sắp diễn ra (H).
// Cùng với A (đã kết thúc), B (đang diễn ra), C (sắp diễn ra) trong db-seed-sample.ts là 8 kỳ thi.
export const extraContests: ContestDef[] = [
  {
    key: "D",
    name: "Kỳ thi khởi động học kỳ",
    description: "Kỳ thi đầu học kỳ cho lớp Tin học cơ bản.",
    start: -12 * DAY,
    end: -12 * DAY + 90,
    password: null,
    classCode: "THCB2026",
    creator: "teacher",
    problems: [
      ["sum", 100],
      ["evensum", 100],
      ["maxel", 100],
    ],
    participants: [1, 2],
  },
  {
    key: "E",
    name: "Kỳ thi Python tuần 3",
    description: "Kỳ thi thực hành Python cho lớp Lập trình hướng đối tượng.",
    start: -19 * DAY,
    end: -19 * DAY + 120,
    password: null,
    classCode: "LTHDT2026",
    creator: "teacher2",
    problems: [
      ["palin", 100],
      ["gcd", 100],
      ["vowels", 150],
      ["anagram", 150],
    ],
    participants: [1, 2],
  },
  {
    key: "F",
    name: "Kỳ thi mở rộng tháng 9",
    description: "Kỳ thi mở cho mọi học viên, không cần mật khẩu.",
    start: -27 * DAY,
    end: -27 * DAY + 150,
    password: null,
    classCode: null,
    creator: "teacher2",
    problems: [
      ["fizz", 100],
      ["bsearch", 150],
      ["merge", 200],
    ],
    participants: [1, 2],
  },
  {
    key: "G",
    name: "Tuyển chọn đội tuyển Olympic",
    description: "Vòng tuyển chọn đội tuyển, dành cho lớp Đội tuyển Olympic Tin học.",
    start: -41 * DAY,
    end: -41 * DAY + 180,
    password: null,
    classCode: "OLPTIN2026",
    creator: "teacher",
    problems: [
      ["stairs", 100],
      ["coin", 200],
      ["lis", 300],
    ],
    participants: [2],
  },
  {
    key: "H",
    name: "Kỳ thi giữa học kỳ II",
    description: "Kỳ thi sắp diễn ra dành cho lớp Python cho người mới.",
    start: 9 * DAY,
    end: 9 * DAY + 120,
    password: null,
    classCode: "PYTHON2026",
    creator: "teacher2",
    problems: [
      ["revarr", 100],
      ["average", 100],
      ["perm", 200],
    ],
    participants: [],
  },
];
