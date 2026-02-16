/**
 * Return the expression container for a bound class attribute,
 * or undefined if not applicable.
 * @param {import("vue-eslint-parser").AST.VDirectiveKey} key
 * @param {import("vue-eslint-parser").AST.VLiteral | import("vue-eslint-parser").AST.VExpressionContainer | null} value
 * @returns {import("vue-eslint-parser").AST.VExpressionContainer | undefined} Expression container if valid.
 */
export const getBindClassExpression = (key, value) => {
  if (!isBindClassDirective(key)) {
    return;
  }

  if (!value || value.type !== "VExpressionContainer") {
    return;
  }

  return value;
};

/**
 * Check if node is a valid directive with an expression value.
 * @param {import("vue-eslint-parser").AST.VAttribute} node
 * @returns {boolean} `true` if node is a valid directive with an expression value.
 */
export const isValidDirective = (node) =>
  Boolean(node.directive && node.value && "expression" in node.value);

/**
 * Check if directive is a v-bind:class or :class directive.
 * @param {import("vue-eslint-parser").AST.VDirectiveKey} key
 * @returns {boolean} `true` if directive is a v-bind:class or :class directive.
 */
const isBindClassDirective = (key) =>
  key.name.name === "bind" &&
  key.argument?.type === "VIdentifier" &&
  key.argument.name === "class";
