import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}", "worker/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/^\\s*(SELECT|INSERT|UPDATE|DELETE|MERGE|EXEC(UTE)?)\\s/i]",
          message: "Inline SQL is forbidden; call a stored procedure via execProc.",
        },
        {
          selector:
            "TemplateElement[value.raw=/^\\s*(SELECT|INSERT|UPDATE|DELETE|MERGE|EXEC(UTE)?)\\s/i]",
          message: "Inline SQL is forbidden; call a stored procedure via execProc.",
        },
      ],
    },
  },
]);

export default eslintConfig;
