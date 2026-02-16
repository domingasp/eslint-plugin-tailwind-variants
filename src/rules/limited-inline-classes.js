import { createRuleVisitors } from "../utils/create-rule-visitors";
import {
  getBindClassExpression,
  isValidDirective,
} from "../utils/get-bind-class-expression";

export const MESSAGE_IDS = {
  limitedInlineClasses: "limitedInlineClasses",
  noCnInClassName: "noCnInClassName",
};

/** @typedef {typeof MESSAGE_IDS[keyof typeof MESSAGE_IDS]} MessageIds */

/**
 * @typedef {object} RuleOptions
 * @property {string} [directoryPattern="/components/"] Directory pattern to match for processing files.
 * @property {number} [maxInlineClasses=5] Maximum number of inline classes allowed.
 */

/** @type {import("eslint").Rule.RuleModule} */
export const rule = {
  create: (context) => {
    const [options = {}] = /** @type {[RuleOptions]} */ (context.options);
    const directoryPattern = options.directoryPattern ?? "/components/";
    const DEFAULT_MAX_INLINE_CLASSES = 5;
    const maxInlineClasses =
      options.maxInlineClasses ?? DEFAULT_MAX_INLINE_CLASSES;

    if (!shouldProcessFile(context.filename, directoryPattern)) {
      return {};
    }

    const scriptVisitor = createScriptVisitor(context, maxInlineClasses);
    const templateVisitor = createTemplateVisitor(context, maxInlineClasses);

    return createRuleVisitors(context, templateVisitor, scriptVisitor);
  },
  meta: {
    defaultOptions: [
      {
        directoryPattern: "/components/",
        maxInlineClasses: 5,
      },
    ],
    docs: {
      description: `Allow a configurable number of inline class names; require use of tailwind-variants.`,
    },
    messages: {
      limitedInlineClasses: `Inline className may contain at most {{max}} classes. Use tailwind-variants instead.`,
      noCnInClassName:
        "Using cn() in className is not allowed in component definition. Use tailwind-variants instead.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          directoryPattern: {
            default: "/components/",
            description: 'Directory pattern to match, e.g., "/components/".',
            type: "string",
          },
          maxInlineClasses: {
            default: 5,
            description:
              "Maximum number of inline classes allowed (default: 5).",
            minimum: 1,
            type: "integer",
          },
        },
        type: "object",
      },
    ],
    type: "problem",
  },
};

/**
 * Count the number of non-empty class names in a string.
 * @param {string} value
 * @returns {number} Number of non-empty class names in the string.
 */
const countClasses = (value) =>
  value.trim().split(/\s+/).filter(Boolean).length;

/**
 * Shared validation options for all expression validators.
 * @typedef {object} ValidationOptions
 * @property {import("estree").Node |
 *  import("vue-eslint-parser").AST.VAttribute} node Node being validated.
 * @property {import("eslint").Rule.RuleContext} context RuleContext for reporting.
 * @property {number} maxInlineClasses Maximum number of inline classes allowed.
 */

/**
 * Detect violations in array expressions by recursively checking each element.
 * @param {import("estree").ArrayExpression |
 *  import("vue-eslint-parser").AST.ESLintArrayExpression} expr
 * @param {ValidationOptions} options
 * @returns {boolean} `true` if violation found in any array element.
 */
const detectArrayViolation = (expr, options) =>
  expr.elements
    .filter((el) => el !== null && el.type !== "SpreadElement")
    .some((el) => detectExpressionViolation(el, options));

/**
 * Detect violations in binary and logical expressions by checking both operands.
 * @param {import("estree").BinaryExpression |
 *  import("estree").LogicalExpression |
 *  import("vue-eslint-parser").AST.ESLintBinaryExpression |
 *  import("vue-eslint-parser").AST.ESLintLogicalExpression} expr
 * @param {ValidationOptions} options
 * @returns {boolean} `true` if violation found in left or right operand.
 */
const detectBinaryViolation = (expr, options) =>
  detectExpressionViolation(expr.left, options) ||
  detectExpressionViolation(expr.right, options);

/**
 * Detect violations in call expressions. Reports cn() usage and recursively
 * checks arguments for excessive inline classes.
 * @param {import("estree").CallExpression |
 *  import("vue-eslint-parser").AST.ESLintCallExpression} expr
 * @param {ValidationOptions} options
 * @returns {boolean} `true` if cn() call or argument violations found.
 */
const detectCallViolation = (expr, options) => {
  if (expr.callee.type === "Identifier" && expr.callee.name === "cn") {
    options.context.report({
      messageId: MESSAGE_IDS.noCnInClassName,
      node: options.node,
    });
    // Nested cn() calls only count as a single violation
    return true;
  }

  return expr.arguments
    .filter((arg) => arg.type !== "SpreadElement")
    .some((arg) => detectExpressionViolation(arg, options));
};

/**
 * Detect violations in conditional (ternary) expressions by checking both
 * branches.
 * @param {import("estree").ConditionalExpression |
 *  import("vue-eslint-parser").AST.ESLintConditionalExpression} expr
 * @param {ValidationOptions} options
 * @returns {boolean} `true` if any branch contains excessive inline classes.
 */
const detectConditionalViolation = (expr, options) =>
  detectExpressionViolation(expr.consequent, options) ||
  detectExpressionViolation(expr.alternate, options);

/**
 * Detect violations in string literals by checking class count against limit.
 * @param {import("estree").Literal |
 *  import("vue-eslint-parser").AST.ESLintLiteral} expr
 * @param {ValidationOptions} options
 * @returns {boolean} `true` if string literal exceeds max inline classes.
 */
const detectLiteralViolation = (expr, options) => {
  if (
    typeof expr.value === "string" &&
    countClasses(expr.value) > options.maxInlineClasses
  ) {
    options.context.report({
      data: { max: options.maxInlineClasses.toString() },
      messageId: MESSAGE_IDS.limitedInlineClasses,
      node: options.node,
    });
    return true;
  }

  return false;
};

/**
 * Detect violations in object expressions by recursively checking property
 * values.
 * @param {import("estree").ObjectExpression |
 *  import("vue-eslint-parser").AST.ESLintObjectExpression} expr
 * @param {ValidationOptions} options
 * @returns {boolean} `true` if violation found in any property value.
 */
const detectObjectViolation = (expr, options) =>
  expr.properties.some((prop) => {
    if (prop.type === "Property") {
      if (prop.value === null) {
        return false;
      }

      if (
        prop.value.type === "ArrayExpression" ||
        prop.value.type === "BinaryExpression" ||
        prop.value.type === "CallExpression" ||
        prop.value.type === "ConditionalExpression" ||
        prop.value.type === "Identifier" ||
        prop.value.type === "Literal" ||
        prop.value.type === "LogicalExpression" ||
        prop.value.type === "ObjectExpression" ||
        prop.value.type === "TemplateLiteral" ||
        prop.value.type === "ThisExpression"
      ) {
        return detectExpressionViolation(prop.value, options);
      }
    }
    return false;
  });

/**
 * Detect violations in template literals by checking static class count and
 * recursively validating embedded expressions.
 * @param {import("estree").TemplateLiteral |
 *  import("vue-eslint-parser").AST.ESLintTemplateLiteral} expr
 * @param {ValidationOptions} options
 * @returns {boolean} `true` if static part exceeds max inline classes or any embedded expressions have violations.
 */
const detectTemplateLiteralViolation = (expr, options) => {
  // Static template literal
  // oxlint-disable-next-line no-magic-numbers
  if (expr.expressions.length === 0) {
    const [firstQuasi] = expr.quasis;
    const raw = firstQuasi.value.cooked;
    if (raw === null || typeof raw === "undefined") {
      // Skip validation for malformed template literals
      return false;
    }

    if (countClasses(raw) > options.maxInlineClasses) {
      options.context.report({
        data: { max: options.maxInlineClasses.toString() },
        messageId: MESSAGE_IDS.limitedInlineClasses,
        node: options.node,
      });
      return true;
    }
  }
  // Recurse into expressions
  return expr.expressions.some((el) => detectExpressionViolation(el, options));
};

/**
 * Detect violations in any expression type by dispatching to specialized
 * handlers.
 * @param {import("estree").Expression |
 *  import("vue-eslint-parser").AST.ESLintExpression  |
 *  import("estree").PrivateIdentifier |
 *  import("vue-eslint-parser").AST.ESLintPrivateIdentifier} expr
 * @param {ValidationOptions} options
 * @returns {boolean} True if any violation found in the expression or any nested expressions.
 */
// oxlint-disable-next-line max-statements max-lines-per-function
const detectExpressionViolation = (expr, options) => {
  if (!expr || !("type" in expr)) {
    return false;
  }

  const exprType = expr.type;

  // oxlint-disable-next-line typescript/switch-exhaustiveness-check
  switch (exprType) {
    case "ArrayExpression": {
      return detectArrayViolation(expr, options);
    }
    case "BinaryExpression": {
      return detectBinaryViolation(expr, options);
    }
    case "CallExpression": {
      return detectCallViolation(expr, options);
    }
    case "ConditionalExpression": {
      return detectConditionalViolation(expr, options);
    }
    case "Identifier": {
      return false;
    }
    case "Literal": {
      return detectLiteralViolation(expr, options);
    }
    case "LogicalExpression": {
      return detectBinaryViolation(expr, options);
    }
    case "ObjectExpression": {
      return detectObjectViolation(expr, options);
    }
    case "TemplateLiteral": {
      return detectTemplateLiteralViolation(expr, options);
    }
    case "ThisExpression": {
      return false;
    }
    default: {
      return false;
    }
  }
};

/**
 * Validate JSX className attributes for violations. Handles both static string
 * literals and dynamic expressions.
 * @param {import("estree-jsx").JSXAttribute} node
 * @param {import("eslint").Rule.RuleContext} context
 * @param {number} maxInlineClasses
 */
const checkJSXClassName = (node, context, maxInlineClasses) => {
  const { value } = node;
  if (!value) {
    return;
  }

  // ClassName="..."
  if (
    value.type === "Literal" &&
    typeof value.value === "string" &&
    countClasses(value.value) > maxInlineClasses
  ) {
    context.report({
      data: { max: maxInlineClasses.toString() },
      messageId: MESSAGE_IDS.limitedInlineClasses,
      node,
    });
    return;
  }

  // ClassName={`...`} / className={"..."}
  if (value.type === "JSXExpressionContainer") {
    const expr = value.expression;
    if (expr.type !== "JSXEmptyExpression") {
      detectExpressionViolation(expr, {
        context,
        maxInlineClasses,
        node,
      });
    }
  }
};

/**
 * Check Vue static class attributes for excessive inline classes.
 *
 * @param {import("vue-eslint-parser").AST.VAttribute} node
 * @param {import("eslint").Rule.RuleContext} context
 * @param {number} maxInlineClasses
 */
const checkVueStaticClass = (node, context, maxInlineClasses) => {
  if (!node.value) {
    return;
  }

  // Class="..."
  if (
    !node.directive &&
    node.key.type === "VIdentifier" &&
    node.key.name === "class" &&
    countClasses(node.value.value) > maxInlineClasses
  ) {
    context.report({
      data: { max: maxInlineClasses.toString() },
      messageId: MESSAGE_IDS.limitedInlineClasses,
      node,
    });
  }
};

/**
 * Check Vue dynamic class bindings for violations. Handles :class and
 * v-bind:class directives by recursively validating the bound expression.
 * @param {import("vue-eslint-parser").AST.VAttribute} node
 * @param {import("eslint").Rule.RuleContext} context
 * @param {number} maxInlineClasses
 */
const checkVueDynamicClass = (node, context, maxInlineClasses) => {
  if (!isValidDirective(node)) {
    return;
  }

  const container = getBindClassExpression(
    /** @type {import("vue-eslint-parser").AST.VDirectiveKey} */ (
      /** @type{unknown} */ (node.key)
    ),
    node.value,
  );

  if (!container) {
    return;
  }
  // :class="..." / v-bind:class
  if (container.expression) {
    detectExpressionViolation(
      /** @type {import("vue-eslint-parser").AST.ESLintExpression} */ (
        container.expression
      ),
      {
        context,
        maxInlineClasses,
        node,
      },
    );
  }
};

/**
 * Create ESLint visitor for JSX className attributes in script sections.
 * @param {import("eslint").Rule.RuleContext} context
 * @param {number} maxInlineClasses
 * @returns {import("eslint").Rule.RuleListener} Visitor that checks JSX className attributes.
 */
const createScriptVisitor = (context, maxInlineClasses) => ({
  JSXAttribute(/** @type {import("estree-jsx").JSXAttribute} */ node) {
    if (node.name.name !== "className") {
      return;
    }
    checkJSXClassName(node, context, maxInlineClasses);
  },
});

/**
 * Create ESLint visitor for Vue template class attributes in template sections.
 * @param {import("eslint").Rule.RuleContext} context
 * @param {number} maxInlineClasses
 * @returns {import("eslint").Rule.RuleListener} Visitor that checks Vue class attributes.
 */
const createTemplateVisitor = (context, maxInlineClasses) => ({
  VAttribute(/** @type {unknown} */ node) {
    const vueNode = /** @type {import("vue-eslint-parser").AST.VAttribute} */ (
      node
    );
    checkVueStaticClass(vueNode, context, maxInlineClasses);
    checkVueDynamicClass(vueNode, context, maxInlineClasses);
  },
});

/**
 * Determine if a file should be processed.
 * @param {string} fileName Name of the file being linted.
 * @param {string} directoryPattern Directory pattern to match for processing.
 * @returns {boolean} `true` if file should be processed.
 */
const shouldProcessFile = (fileName, directoryPattern) =>
  fileName.replaceAll("\\", "/").includes(directoryPattern);
