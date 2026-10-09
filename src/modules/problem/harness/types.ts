import type { FunctionSpec } from "../function-spec";

export const RESULT_MARKER = "@@ITOJ_RESULT@@";

export type DriverLanguage = "cpp" | "c" | "java" | "python" | "javascript" | "go" | "csharp";

export type LanguageHarness = {
  // Code shown in the editor before the student writes anything.
  starter(spec: FunctionSpec): string;
  // Files written to the judge sandbox directory: file name -> content.
  build(spec: FunctionSpec, source: string): Record<string, string>;
};
