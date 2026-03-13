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
    // Skills and instructions are markdown/JSON — not lintable source
    ".github/**",
  ]),
  // Custom rules
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Prefer `as const` objects + derived union types over inline string literal unions.
      // Catches patterns like: useState<"foo" | "bar">  or  type X = "a" | "b"
      // Use PIPELINE_ACTIONS, PIPELINE_STATUSES, etc. instead.
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSTypeAliasDeclaration > TSUnionType > TSLiteralType > Literal[value]",
          message: "Prefer an `as const` object + derived union type over inline string literal unions. See PIPELINE_STATUSES pattern in types.ts.",
        },
        {
          selector: "TSTypeReference > TSTypeParameterInstantiation > TSUnionType > TSLiteralType > Literal[value]",
          message: "Prefer an `as const` object + derived union type over inline string literal unions (e.g. useState<PipelineAction> instead of useState<\"starting\" | \"stopping\">).",
        },
      ],
    },
  },
]);

export default eslintConfig;
