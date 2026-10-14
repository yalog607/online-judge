import fs from "node:fs";

const file = process.argv[2];
const raw = fs.readFileSync(file, "utf8");
const lines = raw.split("\n").filter((l) => !l.startsWith("#"));
const subject = lines[0]?.trim() ?? "";
const rest = lines.slice(1).join("").trim();

if (!subject) {
  console.error("Commit message rỗng.");
  process.exit(1);
}
if (rest) {
  console.error("Commit message phải là 1 dòng duy nhất, không có body.");
  process.exit(1);
}
if (subject.length > 100) {
  console.error("Commit message quá dài (tối đa 100 ký tự).");
  process.exit(1);
}
if (/co-authored-by/i.test(subject)) {
  console.error("Không được thêm dòng Co-Authored-By.");
  process.exit(1);
}
