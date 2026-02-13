import type { AST } from "vue-eslint-parser";

/**
 * Return the expression container for a bound class attribute,
 * or undefined if not applicable.
 *
 * @param {AST.VAttribute} node - AST node to check.
 *
 * @returns {AST.VExpressionContainer | undefined} Expression container if valid.
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

const isBindClassDirective = (key: AST.VDirectiveKey): boolean =>
  key.name.name === "bind" &&
  key.argument?.type === "VIdentifier" &&
  key.argument.name === "class";

const isValidDirective = (node: AST.VAttribute): boolean =>
  Boolean(node.directive && node.value && "expression" in node.value);
