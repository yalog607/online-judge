function normalize(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

export function outputsMatch(actual: string, expected: string): boolean {
  return normalize(actual) === normalize(expected);
}

export const RESULT_MARKER = "@@ITOJ_RESULT@@";

const DOUBLE_TOLERANCE = 1e-6;

function jsonEqual(a: unknown, b: unknown, tolerant: boolean): boolean {
  if (typeof a === "number" && typeof b === "number") {
    if (a === b) return true;
    if (!tolerant) return false;
    return Math.abs(a - b) <= DOUBLE_TOLERANCE * Math.max(1, Math.abs(a), Math.abs(b));
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => jsonEqual(v, b[i], tolerant));
  }
  return a === b;
}

// Function-mode comparison: the driver prints RESULT_MARKER on its own line followed by the
// returned value as JSON. Anything the user's code printed before the marker is ignored.
export function functionOutputsMatch(
  stdout: string,
  expected: string,
  returnType: string,
): boolean {
  const at = stdout.lastIndexOf(RESULT_MARKER);
  if (at < 0) return false;
  try {
    const actualValue: unknown = JSON.parse(stdout.slice(at + RESULT_MARKER.length));
    const expectedValue: unknown = JSON.parse(expected);
    return jsonEqual(actualValue, expectedValue, returnType.startsWith("double"));
  } catch {
    return false;
  }
}
