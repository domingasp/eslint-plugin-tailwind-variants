import { AST } from "vue-eslint-parser";

/**
 * Return the expression container for a bound class attribute,
 * or null if not applicable
 */
export function getBindClassExpression(
  node: AST.VAttribute
): AST.VExpressionContainer | null {
  if (!node.directive) return null;
  if (!node.value) return null;

  const key = node.key as unknown as AST.VDirectiveKey;

  if (key.name.name !== "bind") return null;
  if (key.argument?.type !== "VIdentifier") return null;
  if (key.argument.name !== "class") return null;

  if (!("expression" in node.value)) return null;
  return node.value as unknown as AST.VExpressionContainer;
}
