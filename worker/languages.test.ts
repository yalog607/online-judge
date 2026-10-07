import { describe, expect, it } from "vitest";
import { submitCodeSchema } from "@/modules/problem/schema";
import { LANGUAGES } from "./languages";

describe("LANGUAGES", () => {
  it("has a runnable config for every language accepted by the submit schema", () => {
    for (const language of submitCodeSchema.shape.language.options) {
      const cfg = LANGUAGES[language];
      expect(cfg, language).toBeDefined();
      expect(cfg.image).toBe(`itoj-judge-${language}:latest`);
      expect(cfg.sourceFile).toBeTruthy();
      expect(cfg.run.length).toBeGreaterThan(0);
    }
  });
});
