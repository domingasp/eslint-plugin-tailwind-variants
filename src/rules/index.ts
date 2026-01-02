import { TSESLint } from "@typescript-eslint/utils";

import { rule as limitedInlineClassName } from "./limited-inline-classname.js";
import { rule as requireVariantsCallStylesName } from "./require-variants-call-styles-name.js";
import { rule as requireVariantsSuffix } from "./require-variants-suffix.js";

export const rules = {
  "limited-inline-classname": limitedInlineClassName,
  "require-variants-call-styles-name": requireVariantsCallStylesName,
  "require-variants-suffix": requireVariantsSuffix,
} satisfies TSESLint.FlatConfig.Plugin["rules"];
