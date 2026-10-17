export const RESULT_MARKER = "@@ITOJ_RESULT@@";

const DOUBLE_TOLERANCE = 1e-6;

export type CompareOptions = {
  // exact: element order matters; unordered: top-level array order is ignored;
  // float: every number may differ by `epsilon` (default tolerance for double results).
  mode?: "exact" | "unordered" | "float";
  epsilon?: number | null;
};

function jsonEqual(a: unknown, b: unknown, tolerance: number | null): boolean {
  if (typeof a === "number" && typeof b === "number") {
    if (a === b) return true;
    if (tolerance === null) return false;
    return Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => jsonEqual(v, b[i], tolerance));
  }
  return a === b;
}

// Multiset comparison of two arrays; falls back to a pairwise search so tolerant numbers work.
function unorderedEqual(a: unknown[], b: unknown[], tolerance: number | null): boolean {
  if (a.length !== b.length) return false;
  const rest = [...b];
  for (const item of a) {
    const at = rest.findIndex((candidate) => jsonEqual(item, candidate, tolerance));
    if (at < 0) return false;
    rest.splice(at, 1);
  }
  return true;
}

// The driver prints RESULT_MARKER on its own line followed by the
// returned value as JSON. Anything the user's code printed before the marker is ignored.
export function functionOutputsMatch(
  stdout: string,
  expected: string,
  returnType: string,
  options: CompareOptions = {},
): boolean {
  const at = stdout.lastIndexOf(RESULT_MARKER);
  if (at < 0) return false;
  try {
    const actualValue: unknown = JSON.parse(stdout.slice(at + RESULT_MARKER.length));
    const expectedValue: unknown = JSON.parse(expected);
    const mode = options.mode ?? "exact";
    const tolerance =
      mode === "float"
        ? (options.epsilon ?? DOUBLE_TOLERANCE)
        : returnType.startsWith("double")
          ? DOUBLE_TOLERANCE
          : null;
    if (mode === "unordered" && Array.isArray(actualValue) && Array.isArray(expectedValue)) {
      return unorderedEqual(actualValue, expectedValue, tolerance);
    }
    return jsonEqual(actualValue, expectedValue, tolerance);
  } catch {
    return false;
  }
}
