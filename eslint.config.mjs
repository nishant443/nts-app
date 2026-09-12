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
    // Prisma writes this; it carries its own @ts-nocheck.
    "src/generated/**",
  ]),

  {
    // PDF templates use @react-pdf/renderer's <Image>, which renders into a
    // PDF rather than the DOM. The jsx-a11y rules assume HTML elements and
    // there is no alt attribute in the PDF element model.
    files: ["src/lib/pdf/**/*.tsx"],
    rules: {
      "jsx-a11y/alt-text": "off",
    },
  },
]);

export default eslintConfig;
