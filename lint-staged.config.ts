import type { Configuration } from "lint-staged";

const config: Configuration = {
  "*.{js,jsx,ts,tsx,mjs,cjs}": "pnpm lint",
};

export default config;
