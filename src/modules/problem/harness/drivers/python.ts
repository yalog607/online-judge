import { splitType } from "../../function-spec";
import { RESULT_MARKER, type LanguageHarness } from "../types";

function pyType(type: string): string {
  const { base, dims } = splitType(type);
  let out = { int: "int", long: "int", double: "float", bool: "bool", string: "str" }[base];
  for (let i = 0; i < dims; i++) out = `list[${out}]`;
  return out;
}

export const python: LanguageHarness = {
  starter: (spec) =>
    [
      "class Solution:",
      `    def ${spec.name}(self, ${spec.params.map((p) => `${p.name}: ${pyType(p.type)}`).join(", ")}) -> ${pyType(spec.returns)}:`,
      "        pass",
      "",
    ].join("\n"),

  build: (spec, source) => ({
    "main.py": `${source}

import sys as __itoj_sys, json as __itoj_json

__itoj_lines = __itoj_sys.stdin.read().split("\\n")
__itoj_args = [__itoj_json.loads(__itoj_lines[i]) for i in range(${spec.params.length})]
__itoj_res = Solution().${spec.name}(*__itoj_args)
__itoj_sys.stdout.write("\\n${RESULT_MARKER}\\n" + __itoj_json.dumps(__itoj_res) + "\\n")
`,
  }),
};
