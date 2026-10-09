import type { FunctionSpec } from "../function-spec";
import { c } from "./drivers/c";
import { cpp } from "./drivers/cpp";
import { csharp } from "./drivers/csharp";
import { go } from "./drivers/go";
import { java } from "./drivers/java";
import { javascript } from "./drivers/javascript";
import { python } from "./drivers/python";
import type { DriverLanguage, LanguageHarness } from "./types";

export { RESULT_MARKER } from "./types";
export type { DriverLanguage } from "./types";

const HARNESSES: Record<DriverLanguage, LanguageHarness> = { c, cpp, csharp, go, java, javascript, python };

export function starterCode(language: string, spec: FunctionSpec): string | null {
  const h = HARNESSES[language as DriverLanguage];
  return h ? h.starter(spec) : null;
}

// Files (name -> content) to write into the sandbox directory for a function-mode submission.
export function buildFunctionFiles(
  language: string,
  spec: FunctionSpec,
  source: string,
): Record<string, string> | null {
  const h = HARNESSES[language as DriverLanguage];
  return h ? h.build(spec, source) : null;
}
