import { splitType } from "../../function-spec";
import { RESULT_MARKER, type LanguageHarness } from "../types";

function goType(type: string): string {
  const { base, dims } = splitType(type);
  const scalar = { int: "int", long: "int64", double: "float64", bool: "bool", string: "string" }[base];
  return "[]".repeat(dims) + scalar;
}

export const go: LanguageHarness = {
  starter: (spec) =>
    [
      "package main",
      "",
      `func ${spec.name}(${spec.params.map((p) => `${p.name} ${goType(p.type)}`).join(", ")}) ${goType(spec.returns)} {`,
      "\t",
      "}",
      "",
    ].join("\n"),

  // The driver lives in its own file so its imports never clash with the student's imports.
  build: (spec, source) => ({
    "main.go": source,
    "driver.go": `package main

import (
	"encoding/json"
	"io"
	"os"
	"strings"
)

func main() {
	data, _ := io.ReadAll(os.Stdin)
	lines := strings.Split(string(data), "\\n")
${spec.params
  .map(
    (p, i) => `	var a${i} ${goType(p.type)}
	if err := json.Unmarshal([]byte(lines[${i}]), &a${i}); err != nil {
		os.Exit(2)
	}`,
  )
  .join("\n")}
	res := ${spec.name}(${spec.params.map((_, i) => `a${i}`).join(", ")})
	out, err := json.Marshal(res)
	if err != nil {
		os.Exit(3)
	}
	os.Stdout.WriteString("\\n${RESULT_MARKER}\\n")
	os.Stdout.Write(out)
	os.Stdout.WriteString("\\n")
}
`,
  }),
};
