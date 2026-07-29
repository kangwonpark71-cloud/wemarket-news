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
    "coverage/**",
    // Jest config uses require() - standard for Jest
    "jest.config.js",
    "jest.config.ts",
  ]),
  {
    rules: {
      // Disable set-state-in-effect rule - it's too strict for async data fetching patterns
      // This is a valid pattern: useEffect(() => { void fetchData(); }, [fetchData])
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
