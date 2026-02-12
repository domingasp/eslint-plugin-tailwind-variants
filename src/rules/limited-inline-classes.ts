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
     * Directory pattern to match
     * @default "/components/"
     */
    directoryPattern?: string;
    /**
     * Maximum number of inline classes allowed
     * @default 5
     */
    maxInlineClasses?: number;
  },
];

const DEFAULT_MAX_INLINE_CLASSES = 5;

const countClasses = (value: string): number =>
  value.trim().split(/\s+/).filter(Boolean).length;

/** Shared validation options for all expression validators */
interface ValidationOptions {
  node: TSESTree.Node | VueAST.VAttribute;
  context: RuleContext<MessageIds, Options>;
  maxInlineClasses: number;
}

/** Validate array expression elements */
const validateArrayExpression = (
  expr: TSESTree.ArrayExpression,
  options: ValidationOptions,
): boolean =>
  expr.elements
    .filter(
      (el): el is TSESTree.Expression =>
        el !== null && el.type !== AST_NODE_TYPES.SpreadElement,
    )
    .some((el) => validateExpression(el, options));

/** Validate binary expression (left and right operands) */
const validateBinaryExpression = (
  expr:
    | TSESTree.BinaryExpression
    | TSESTree.LogicalExpression
    | TSESTree.PrivateInExpression
    | TSESTree.SymmetricBinaryExpression
    | VueAST.ESLintBinaryExpression,
  options: ValidationOptions,
): boolean =>
  validateExpression(expr.left, options) ||
  validateExpression(expr.right, options);

/** Validate call expression and detect cn() calls */
const validateCallExpression = (
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
    .some((arg) => validateExpression(arg, options));
};

/** Validate conditional expression (ternary) */
const validateConditionalExpression = (
  expr: TSESTree.ConditionalExpression,
  options: ValidationOptions,
): boolean =>
  validateExpression(expr.consequent, options) ||
  validateExpression(expr.alternate, options);

/** Validate string literal for class count */
const validateLiteral = (
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

/** Validate object expression properties */
const validateObjectExpression = (
  expr: TSESTree.ObjectExpression,
  options: ValidationOptions,
): boolean =>
  expr.properties.some((prop) => {
    if (prop.type === AST_NODE_TYPES.Property) {
      if (
        prop.value === null ||
        prop.value.type === "ObjectPattern" ||
        prop.value.type === "ArrayPattern"
      ) {
        return false;
      }

      return validateExpression(
        prop.value as TSESTree.Expression | VueAST.ESLintExpression,
        options,
      );
    }
    return false;
  });

/** Validate template literal for class count */
const validateTemplateLiteral = (
  expr: TSESTree.TemplateLiteral,
  options: ValidationOptions,
): boolean => {
  // Static template literal
  // oxlint-disable-next-line no-magic-numbers
  if (expr.expressions.length === 0) {
    const [firstQuasi] = expr.quasis;
    const raw = firstQuasi?.value.cooked ?? "";
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
  return expr.expressions.some((el) => validateExpression(el, options));
};

/** Recursively validate classes in any expression and detect cn() calls */
// oxlint-disable-next-line max-statements max-lines-per-function
const validateExpression = (
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
      return validateArrayExpression(expr, options);
    }
    case AST_NODE_TYPES.BinaryExpression: {
      return validateBinaryExpression(expr, options);
    }
    case AST_NODE_TYPES.CallExpression: {
      return validateCallExpression(expr, options);
    }
    case AST_NODE_TYPES.ConditionalExpression: {
      return validateConditionalExpression(expr, options);
    }
    case AST_NODE_TYPES.Identifier: {
      return false;
    }
    case AST_NODE_TYPES.Literal: {
      return validateLiteral(expr as TSESTree.Literal, options);
    }
    case AST_NODE_TYPES.LogicalExpression: {
      return validateBinaryExpression(expr, options);
    }
    case AST_NODE_TYPES.ObjectExpression: {
      return validateObjectExpression(expr, options);
    }
    case AST_NODE_TYPES.TemplateLiteral: {
      return validateTemplateLiteral(expr, options);
    }
    case AST_NODE_TYPES.ThisExpression: {
      return false;
    }
    default: {
      return false;
    }
  }
};

/** Handle JSX className attribute validation */
const handleJSXClassName = (
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
      validateExpression(expr, {
        context,
        maxInlineClasses,
        node: jsxAttr,
      });
    }
  }
};

/** Handle Vue static class attribute validation */
const handleVueStaticClass = (
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
      node: vAttr as never,
    });
  }
};

/** Handle Vue dynamic class binding validation */
const handleVueDynamicClass = (
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
    validateExpression(container.expression as VueAST.ESLintExpression, {
      context,
      maxInlineClasses,
      node: vAttr,
    });
  }
};

/** Create script visitor for JSX className attributes */
const createScriptVisitor = (
  context: RuleContext<MessageIds, Options>,
  maxInlineClasses: number,
): RuleListener => ({
  JSXAttribute(node: unknown): void {
    const jsxAttr = node as TSESTree.JSXAttribute;
    if (jsxAttr.name.name !== "className") {
      return;
    }
    handleJSXClassName(jsxAttr, context, maxInlineClasses);
  },
});

/** Create template visitor for Vue class attributes */
const createTemplateVisitor = (
  context: RuleContext<MessageIds, Options>,
  maxInlineClasses: number,
): RuleListener => ({
  VAttribute(node: unknown): void {
    const vAttr = node as VueAST.VAttribute;
    handleVueStaticClass(vAttr, context, maxInlineClasses);
    handleVueDynamicClass(vAttr, context, maxInlineClasses);
  },
});

/** Check if file should be processed based on directory pattern */
const shouldProcessFile = (
  fileName: string,
  directoryPattern: string,
): boolean => fileName.replaceAll("\\", "/").includes(directoryPattern);

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
