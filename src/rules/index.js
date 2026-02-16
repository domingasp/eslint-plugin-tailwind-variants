import { rule as limitedInlineClasses } from "./limited-inline-classes.js";
import { rule as requireVariantsCallStylesName } from "./require-variants-call-styles-name.js";
import { rule as requireVariantsSuffix } from "./require-variants-suffix.js";
import { rule as sortCustomProperties } from "./sort-custom-properties.js";

export const rules = {
  "limited-inline-classes": limitedInlineClasses,
  "require-variants-call-styles-name": requireVariantsCallStylesName,
  "require-variants-suffix": requireVariantsSuffix,
  "sort-custom-properties": sortCustomProperties,
};
