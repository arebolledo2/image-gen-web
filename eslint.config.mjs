import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Routes that still import the db directly. Migrate them to lib/services and remove them from this list.
const LEGACY_DB_ROUTES = [
  "app/api/agents/adjust-batch-prompts/route.ts",
  "app/api/agents/adjust-prompt/route.ts",
  "app/api/agents/compose-prompt/route.ts",
  "app/api/agents/create-prompt/route.ts",
  "app/api/audio-batch-prompts/[[]id[]]/route.ts",
  "app/api/batch-prompts/[[]id[]]/route.ts",
  "app/api/image-edits/[[]id[]]/file/route.ts",
  "app/api/images/[[]id[]]/ai-animation/route.ts",
  "app/api/images/[[]id[]]/ai-edit/route.ts",
  "app/api/images/[[]id[]]/edits/route.ts",
  "app/api/images/[[]id[]]/file/route.ts",
  "app/api/images/[[]id[]]/route.ts",
  "app/api/images/[[]id[]]/suggest-animation/route.ts",
  "app/api/images/route.ts",
  "app/api/prompts/[[]id[]]/route.ts",
  "app/api/prompts/route.ts",
  "app/api/squish-animations/[[]id[]]/file/route.ts",
  "app/api/subjects/[[]id[]]/version/route.ts",
];

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
    // Vendored from Vercel AI SDK — not project code, do not lint or refactor
    "components/ai-elements/**",
  ]),
  // Enforce no explicit any types
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  // Route handlers must go through lib/services, not the db directly.
  {
    files: ["app/api/**/*.ts"],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/db",
              message: "Route handlers must use lib/services instead of importing the db directly.",
            },
          ],
        },
      ],
    },
  },
  // Legacy routes not yet migrated to services. Remove entries as they are migrated.
  {
    files: LEGACY_DB_ROUTES,
    rules: { "no-restricted-imports": "off" },
  },
  // Allow 'as any' in test files for mocking
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
