import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // A leading underscore is the standard convention for "this
      // binding is intentionally unused" -- an unused route handler
      // parameter Next.js requires be present, or a destructure-to-
      // exclude-a-field pattern. Flagging those as errors just
      // encourages deleting the underscore to silence the warning,
      // which is worse than leaving the convention alone.
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Claude Code's own tooling scripts -- not part of the deployed
    // app, run standalone under plain Node (hence require()), not
    // worth holding to the app's TypeScript/React lint rules.
    ".claude/**",
  ]),
]);

export default eslintConfig;
