import {
  type TSESTree,
  AST_NODE_TYPES,
  ESLintUtils,
} from "@typescript-eslint/utils";
import type {
  RuleContext,
  RuleListener,
} from "@typescript-eslint/utils/ts-eslint";
import type { AST as VueAST } from "vue-eslint-parser";

import { createRuleVisitors } from "../utils/create-rule-visitors";
import { getBindClassExpression } from "../utils/get-bind-class-expression";

const createRule = ESLintUtils.RuleCreator((name) => name);

export const MESSAGE_IDS = {
  limitedInlineClasses: "limitedInlineClasses",
  noCnInClassName: "noCnInClassName",
} as const;
export type MessageIds = (typeof MESSAGE_IDS)[keyof typeof MESSAGE_IDS];

export type Options = [
  {
    /**
     * Directory pattern to match.
     *
     * @default "/components/"
     */
    directoryPattern?: string;
    /**
     * Maximum number of inline classes allowed.
     *
     * @default 5
     */
    maxInlineClasses?: number;
  },
];

export const rule = createRule<Options, MessageIds>({
  create: (context) => {
    const [options = {}] = context.options;
    const directoryPattern = options.directoryPattern ?? "/components/";
    const maxInlineClasses =
      options.maxInlineClasses ?? DEFAULT_MAX_INLINE_CLASSES;

    if (!shouldProcessFile(context.filename, directoryPattern)) {
      return {};
    }

    const scriptVisitor = createScriptVisitor(context, maxInlineClasses);
    const templateVisitor = createTemplateVisitor(context, maxInlineClasses);

    return createRuleVisitors(context, templateVisitor, scriptVisitor);
  },
  defaultOptions: [
    {
      directoryPattern: "/components/",
      maxInlineClasses: 5,
    },
  ],
  meta: {
    docs: {
      description: `Allow a configurable number of inline class names; require use of tailwind-variants.`,
    },
    messages: {
      limitedInlineClasses: `Inline className may contain at most {{max}} class. Use tailwind-variants instead.`,
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
            type: "number",
          },
        },
        type: "object",
      },
    ],
    type: "problem",
  },
  name: "limited-inline-classes",
});

const DEFAULT_MAX_INLINE_CLASSES = 5;

const countClasses = (value: string): number =>
  value.trim().split(/\s+/).filter(Boolean).length;

/** Shared validation options for all expression validators. */
interface ValidationOptions {
  node: TSESTree.Node | VueAST.VAttribute;
  context: RuleContext<MessageIds, Options>;
  maxInlineClasses: number;
}

/**
 * Detect violations in array expressions by recursively checking each element.
 *
 * @param {TSESTree.ArrayExpression} expr - Array expression to check.
 * @param {ValidationOptions} options - Validation options.
 *
 * @returns {boolean} True if violation found in any array element.
 */
const detectArrayViolation = (
  expr: TSESTree.ArrayExpression,
  options: ValidationOptions,
): boolean =>
  expr.elements
    .filter(
      (el): el is TSESTree.Expression =>
        el !== null && el.type !== AST_NODE_TYPES.SpreadElement,
    )
    .some((el) => detectExpressionViolation(el, options));

/**
 * Detect violations in binary and logical expressions by checking both operands.
 *
 * @param {TSESTree.BinaryExpression | TSESTree.LogicalExpression} expr - Expression to check.
 * @param {ValidationOptions} options - Validation options.
 *
 * @returns {boolean} True if violation found in left or right operand.
 */
const detectBinaryViolation = (
  expr:
    | TSESTree.BinaryExpression
    | TSESTree.LogicalExpression
    | TSESTree.PrivateInExpression
    | TSESTree.SymmetricBinaryExpression
    | VueAST.ESLintBinaryExpression,
  options: ValidationOptions,
): boolean =>
  detectExpressionViolation(expr.left, options) ||
  detectExpressionViolation(expr.right, options);

/**
 * Detect violations in call expressions.
 *
 * Reports cn() usage and recursively checks arguments for excessive inline
 * classes.
 *
 * @param {TSESTree.CallExpression} expr - Call expression to check.
 * @param {ValidationOptions} options - Validation options.
 *
 * @returns {boolean} True if cn() call or argument violations found.
 */
const detectCallViolation = (
  expr: TSESTree.CallExpression,
  options: ValidationOptions,
): boolean => {
  if (
    expr.callee.type === AST_NODE_TYPES.Identifier &&
    expr.callee.name === "cn"
  ) {
    options.context.report({
      messageId: MESSAGE_IDS.noCnInClassName,
      node: options.node as TSESTree.Node,
    });
    return true;
  }

  return expr.arguments
    .filter(
      (arg): arg is TSESTree.Expression =>
        arg.type !== AST_NODE_TYPES.SpreadElement,
    )
    .some((arg) => detectExpressionViolation(arg, options));
};

/**
 * Detect violations in conditional (ternary) expressions by checking both
 * branches.
 *
 * @param {TSESTree.ConditionalExpression} expr - Conditional expression to check.
 * @param {ValidationOptions} options - Validation options.
 *
 * @returns {boolean} True if any branch contains excessive inline classes.
 */
const detectConditionalViolation = (
  expr: TSESTree.ConditionalExpression,
  options: ValidationOptions,
): boolean =>
  detectExpressionViolation(expr.consequent, options) ||
  detectExpressionViolation(expr.alternate, options);

/**
 * Detect violations in string literals by checking class count against limit.
 *
 * @param {TSESTree.Literal} expr - Literal expression to check.
 * @param {ValidationOptions} options - Validation options.
 *
 * @returns {boolean} True if string literal exceeds max inline classes.
 */
const detectLiteralViolation = (
  expr: TSESTree.Literal,
  options: ValidationOptions,
): boolean => {
  if (
    typeof expr.value === "string" &&
    countClasses(expr.value) > options.maxInlineClasses
  ) {
    options.context.report({
      data: { max: options.maxInlineClasses.toString() },
      messageId: MESSAGE_IDS.limitedInlineClasses,
      node: options.node as TSESTree.Node,
    });
    return true;
  }

  return false;
};

/**
 * Detect violations in object expressions by recursively checking property
 * values.
 *
 * @param {TSESTree.ObjectExpression} expr - Object expression to check.
 * @param {ValidationOptions} options - Validation options.
 *
 * @returns {boolean} True if violation found in any property value.
 */
const detectObjectViolation = (
  expr: TSESTree.ObjectExpression,
  options: ValidationOptions,
): boolean =>
  expr.properties.some((prop) => {
    if (prop.type === AST_NODE_TYPES.Property) {
      if (
        prop.value === null ||
        prop.value.type === AST_NODE_TYPES.ObjectPattern ||
        prop.value.type === AST_NODE_TYPES.ArrayPattern
      ) {
        return false;
      }

      return detectExpressionViolation(
        prop.value as TSESTree.Expression | VueAST.ESLintExpression,
        options,
      );
    }
    return false;
  });

/**
 * Detect violations in template literals by checking static class count and
 * recursively validating embedded expressions.
 *
 * @param {TSESTree.TemplateLiteral} expr - Template literal to check.
 * @param {ValidationOptions} options - Validation options.
 *
 * @returns {boolean} True if static part exceeds max inline classes or any embedded expressions have violations.
 */
const detectTemplateLiteralViolation = (
  expr: TSESTree.TemplateLiteral,
  options: ValidationOptions,
): boolean => {
  // Static template literal
  // oxlint-disable-next-line no-magic-numbers
  if (expr.expressions.length === 0) {
    const [firstQuasi] = expr.quasis;
    const raw = firstQuasi.value.cooked;
    if (raw === null) {
      // Skip validation for malformed template literals
      return false;
    }

    if (countClasses(raw) > options.maxInlineClasses) {
      options.context.report({
        data: { max: options.maxInlineClasses.toString() },
        messageId: MESSAGE_IDS.limitedInlineClasses,
        node: options.node as TSESTree.Node,
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
 *
 * @param {TSESTree.Node | VueAST.ESLintExpression} expr - Expression to check.
 * @param {ValidationOptions} options - Validation options.
 *
 * @returns {boolean} True if any violation found in the expression or any nested expressions.
 */
// oxlint-disable-next-line max-statements max-lines-per-function
const detectExpressionViolation = (
  expr:
    | undefined
    | TSESTree.Node
    | TSESTree.PrivateIdentifier
    | VueAST.ESLintExpression
    | VueAST.ESLintPrivateIdentifier
    | VueAST.VAttribute,
  options: ValidationOptions,
): boolean => {
  if (!expr || !("type" in expr)) {
    return false;
  }

  const exprType = expr.type;

  // oxlint-disable-next-line typescript/switch-exhaustiveness-check
  switch (exprType) {
    case AST_NODE_TYPES.ArrayExpression: {
      return detectArrayViolation(expr, options);
    }
    case AST_NODE_TYPES.BinaryExpression: {
      return detectBinaryViolation(expr, options);
    }
    case AST_NODE_TYPES.CallExpression: {
      return detectCallViolation(expr, options);
    }
    case AST_NODE_TYPES.ConditionalExpression: {
      return detectConditionalViolation(expr, options);
    }
    case AST_NODE_TYPES.Identifier: {
      return false;
    }
    case AST_NODE_TYPES.Literal: {
      return detectLiteralViolation(expr as TSESTree.Literal, options);
    }
    case AST_NODE_TYPES.LogicalExpression: {
      return detectBinaryViolation(expr, options);
    }
    case AST_NODE_TYPES.ObjectExpression: {
      return detectObjectViolation(expr, options);
    }
    case AST_NODE_TYPES.TemplateLiteral: {
      return detectTemplateLiteralViolation(expr, options);
    }
    case AST_NODE_TYPES.ThisExpression: {
      return false;
    }
    default: {
      return false;
    }
  }
};

/**
 * Validate JSX className attributes for violations.
 *
 * Handles both static string literals and dynamic expressions.
 *
 * @param {TSESTree.JSXAttribute} jsxAttr - JSX className attribute to validate.
 * @param {RuleContext<MessageIds, Options>} context - ESLint rule context.
 * @param {number} maxInlineClasses - Maximum allowed inline classes.
 */
const checkJSXClassName = (
  jsxAttr: TSESTree.JSXAttribute,
  context: RuleContext<MessageIds, Options>,
  maxInlineClasses: number,
): void => {
  const { value } = jsxAttr;
  if (!value) {
    return;
  }

  // ClassName="..."
  if (
    value.type === AST_NODE_TYPES.Literal &&
    typeof value.value === "string" &&
    countClasses(value.value) > maxInlineClasses
  ) {
    context.report({
      data: { max: maxInlineClasses.toString() },
      messageId: MESSAGE_IDS.limitedInlineClasses,
      node: jsxAttr,
    });
    return;
  }

  // ClassName={`...`} / className={"..."}
  if (value.type === AST_NODE_TYPES.JSXExpressionContainer) {
    const expr = value.expression;
    if (expr.type !== AST_NODE_TYPES.JSXEmptyExpression) {
      detectExpressionViolation(expr, {
        context,
        maxInlineClasses,
        node: jsxAttr,
      });
    }
  }
};

/**
 * Check Vue static class attributes for excessive inline classes.
 *
 * @param {VueAST.VAttribute} vAttr - Vue attribute to check.
 * @param {RuleContext<MessageIds, Options>} context - ESLint rule context.
 * @param {number} maxInlineClasses - Maximum allowed inline classes.
 */
const checkVueStaticClass = (
  vAttr: VueAST.VAttribute,
  context: RuleContext<MessageIds, Options>,
  maxInlineClasses: number,
): void => {
  if (!vAttr.value) {
    return;
  }

  // Class="..."
  if (
    !vAttr.directive &&
    vAttr.key.type === "VIdentifier" &&
    vAttr.key.name === "class" &&
    countClasses(vAttr.value.value) > maxInlineClasses
  ) {
    context.report({
      data: { max: maxInlineClasses.toString() },
      messageId: MESSAGE_IDS.limitedInlineClasses,
      // Cast to TSESTree.Node since VAttribute is not directly compatible
      node: vAttr as unknown as TSESTree.Node,
    });
  }
};

/**
 * Check Vue dynamic class bindings for violations.
 *
 * Handles :class and v-bind:class directives by recursively validating the
 * bound expression.
 *
 * @param {VueAST.VAttribute} vAttr - Vue attribute to check.
 * @param {RuleContext<MessageIds, Options>} context - ESLint rule context.
 * @param {number} maxInlineClasses - Maximum allowed inline classes.
 */
const checkVueDynamicClass = (
  vAttr: VueAST.VAttribute,
  context: RuleContext<MessageIds, Options>,
  maxInlineClasses: number,
): void => {
  const container = getBindClassExpression(vAttr);
  if (!container) {
    return;
  }
  // :class="..." / v-bind:class
  if (container.expression) {
    detectExpressionViolation(container.expression as VueAST.ESLintExpression, {
      context,
      maxInlineClasses,
      node: vAttr,
    });
  }
};

/**
 * Create ESLint visitor for JSX className attributes in script sections.
 *
 * @param {RuleContext<MessageIds, Options>} context - ESLint rule context.
 * @param {number} maxInlineClasses - Maximum allowed inline classes.
 *
 * @returns {RuleListener} Visitor that checks JSX className attributes.
 */
const createScriptVisitor = (
  context: RuleContext<MessageIds, Options>,
  maxInlineClasses: number,
): RuleListener => ({
  JSXAttribute(node: unknown): void {
    const jsxAttr = node as TSESTree.JSXAttribute;
    if (jsxAttr.name.name !== "className") {
      return;
    }
    checkJSXClassName(jsxAttr, context, maxInlineClasses);
  },
});

/**
 * Create ESLint visitor for Vue template class attributes in template sections.
 *
 * @param {RuleContext<MessageIds, Options>} context - ESLint rule context.
 * @param {number} maxInlineClasses - Maximum allowed inline classes.
 *
 * @returns {RuleListener} Visitor that checks both static and dynamic class attributes.
 */
const createTemplateVisitor = (
  context: RuleContext<MessageIds, Options>,
  maxInlineClasses: number,
): RuleListener => ({
  VAttribute(node: unknown): void {
    const vAttr = node as VueAST.VAttribute;
    checkVueStaticClass(vAttr, context, maxInlineClasses);
    checkVueDynamicClass(vAttr, context, maxInlineClasses);
  },
});

const shouldProcessFile = (
  fileName: string,
  directoryPattern: string,
): boolean => fileName.replaceAll("\\", "/").includes(directoryPattern);
