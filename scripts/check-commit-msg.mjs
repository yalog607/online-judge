import fs from "node:fs";

const file = process.argv[2];
const raw = fs.readFileSync(file, "utf8");
const lines = raw.split("\n").filter((l) => !l.startsWith("#"));
const subject = lines[0]?.trim() ?? "";
const rest = lines.slice(1).join("").trim();

if (!subject) {
  console.error("Commit message rong.");
  process.exit(1);
}
if (rest) {
  console.error("Commit message phai la 1 dong duy nhat, khong co body.");
  process.exit(1);
}
if (subject.length > 100) {
  console.error("Commit message qua dai (toi da 100 ky tu).");
  process.exit(1);
}
if (/co-authored-by/i.test(subject)) {
  console.error("Khong duoc them dong Co-Authored-By.");
  process.exit(1);
}
