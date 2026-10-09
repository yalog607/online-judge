import { RESULT_MARKER, type LanguageHarness } from "../types";

function jsDoc(type: string): string {
  const base = type.replace(/\[\]/g, "");
  const scalar = base === "string" ? "string" : base === "bool" ? "boolean" : "number";
  return scalar + (type.match(/\[\]/g) ?? []).join("");
}

export const javascript: LanguageHarness = {
  starter: (spec) =>
    [
      "/**",
      ...spec.params.map((p) => ` * @param {${jsDoc(p.type)}} ${p.name}`),
      ` * @return {${jsDoc(spec.returns)}}`,
      " */",
      `function ${spec.name}(${spec.params.map((p) => p.name).join(", ")}) {`,
      "    ",
      "}",
      "",
    ].join("\n"),

  build: (spec, source) => ({
    "main.js": `${source}

const __itoj_lines = require("fs").readFileSync(0, "utf8").split("\\n");
const __itoj_args = [];
for (let i = 0; i < ${spec.params.length}; i++) __itoj_args.push(JSON.parse(__itoj_lines[i]));
const __itoj_res = ${spec.name}(...__itoj_args);
process.stdout.write("\\n${RESULT_MARKER}\\n" + JSON.stringify(__itoj_res) + "\\n");
`,
  }),
};
