import "server-only";
import JSZip from "jszip";

export type ParsedTestcase = { input: string; expectedOutput: string; isHidden: boolean };

// Convention: paired files sharing a base name, e.g. "1.in" + "1.out" (also accepts .txt/.ans).
export async function parseTestcaseZip(buffer: Buffer): Promise<ParsedTestcase[]> {
  const zip = await JSZip.loadAsync(buffer);
  const inputs = new Map<string, string>();
  const outputs = new Map<string, string>();

  for (const [path, file] of Object.entries(zip.files)) {
    if (file.dir) continue;
    const name = path.split("/").pop() ?? path;
    const match = name.match(/^(.+)\.(in|txt|out|ans)$/i);
    if (!match) continue;
    const [, base, ext] = match;
    const content = await file.async("string");
    if (/^(in|txt)$/i.test(ext)) inputs.set(base, content);
    else outputs.set(base, content);
  }

  const bases = [...inputs.keys()].filter((b) => outputs.has(b)).sort();
  if (bases.length === 0) {
    throw new Error("Không tìm thấy cặp file input/output hợp lệ trong file .zip.");
  }

  return bases.map((base) => ({
    input: inputs.get(base)!,
    expectedOutput: outputs.get(base)!,
    isHidden: true,
  }));
}
