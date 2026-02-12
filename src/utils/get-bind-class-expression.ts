import type { AST } from "vue-eslint-parser";

/**
 * Check if the directive key is a bound class attribute.
 */
const isBindClassDirective = (key: AST.VDirectiveKey): boolean =>
  key.name.name === "bind" &&
  key.argument?.type === "VIdentifier" &&
  key.argument.name === "class";

/**
 * Check if the attribute is a valid directive with a value.
 */
const isValidDirective = (node: AST.VAttribute): boolean =>
  Boolean(node.directive && node.value && "expression" in node.value);

/**
 * Return the expression container for a bound class attribute,
 * Or undefined if not applicable.
 */
export const getBindClassExpression = (
  node: AST.VAttribute,
): AST.VExpressionContainer | undefined => {
  if (!isValidDirective(node)) {
    return;
  }

  const key = node.key as unknown as AST.VDirectiveKey;
  if (!isBindClassDirective(key)) {
    return;
  }

  return node.value as unknown as AST.VExpressionContainer;
};
