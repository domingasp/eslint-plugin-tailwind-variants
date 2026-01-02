import {
  AST_NODE_TYPES,
  ESLintUtils,
  TSESTree,
} from "@typescript-eslint/utils";
import { RuleContext, RuleListener } from "@typescript-eslint/utils/ts-eslint";
import { AST as VueAST } from "vue-eslint-parser";

import { createRuleVisitors } from "../utils/create-rule-visitors";
import { getBindClassExpression } from "../utils/get-bind-class-expression";

const createRule = ESLintUtils.RuleCreator((name) => name);

export const MESSAGE_IDS = {
  limitedInlineClassName: "limitedInlineClassName",
  noCnInClassName: "noCnInClassName",
} as const;

type MessageIds = (typeof MESSAGE_IDS)[keyof typeof MESSAGE_IDS];
type Options = [
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
  }
];

function countClasses(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

/** Recursively validate classes in any expression and detect cn() calls */
function validateExpression(
  node: TSESTree.Node | VueAST.VAttribute,
  expr:
    | null
    | TSESTree.Node
    | TSESTree.PrivateIdentifier
    | VueAST.ESLintExpression
    | VueAST.ESLintPrivateIdentifier
    | VueAST.VAttribute,
  context: RuleContext<MessageIds, Options>,
  maxInlineClasses = 5
): boolean {
  if (!expr) return false;

  switch (expr.type) {
    case AST_NODE_TYPES.ArrayExpression:
      return expr.elements
        .filter((el): el is TSESTree.Expression => {
          return el !== null && el.type !== AST_NODE_TYPES.SpreadElement;
        })
        .some((el) => validateExpression(node, el, context, maxInlineClasses));

    case AST_NODE_TYPES.BinaryExpression:
      return (
        validateExpression(node, expr.left, context, maxInlineClasses) ||
        validateExpression(node, expr.right, context, maxInlineClasses)
      );

    case AST_NODE_TYPES.CallExpression:
      if (
        expr.callee.type === AST_NODE_TYPES.Identifier &&
        expr.callee.name === "cn"
      ) {
        context.report({
          messageId: MESSAGE_IDS.noCnInClassName,
          node: node as TSESTree.Node,
        });
        return true;
      }

      return expr.arguments
        .filter((arg): arg is TSESTree.Expression => {
          return arg.type !== AST_NODE_TYPES.SpreadElement;
        })
        .some((arg) =>
          validateExpression(node, arg, context, maxInlineClasses)
        );

    case AST_NODE_TYPES.ConditionalExpression:
      return (
        validateExpression(node, expr.consequent, context, maxInlineClasses) ||
        validateExpression(node, expr.alternate, context, maxInlineClasses)
      );

    case AST_NODE_TYPES.Identifier:
      return false;

    case AST_NODE_TYPES.Literal:
      if (typeof expr.value === "string") {
        if (countClasses(expr.value) > maxInlineClasses) {
          context.report({
            data: { max: maxInlineClasses.toString() },
            messageId: MESSAGE_IDS.limitedInlineClassName,
            node: node as TSESTree.Node,
          });
          return true;
        }
      }
      return false;

    case AST_NODE_TYPES.LogicalExpression:
      return (
        validateExpression(node, expr.left, context, maxInlineClasses) ||
        validateExpression(node, expr.right, context, maxInlineClasses)
      );

    case AST_NODE_TYPES.ObjectExpression:
      return expr.properties.some((prop) => {
        if (prop.type === AST_NODE_TYPES.Property) {
          return validateExpression(
            node,
            prop.value &&
              prop.value.type !== "ObjectPattern" &&
              prop.value.type !== "ArrayPattern"
              ? (prop.value as TSESTree.Expression | VueAST.ESLintExpression)
              : null,
            context,
            maxInlineClasses
          );
        }
        // Ignore SpreadElement and other non-Property types
        return false;
      });

    case AST_NODE_TYPES.TemplateLiteral:
      // Static template literal
      if (expr.expressions.length === 0) {
        const raw = expr.quasis[0]?.value.cooked ?? "";
        if (countClasses(raw) > maxInlineClasses) {
          context.report({
            data: { max: maxInlineClasses.toString() },
            messageId: MESSAGE_IDS.limitedInlineClassName,
            node: node as TSESTree.Node,
          });
          return true;
        }
      }
      // Recurse into expressions
      return expr.expressions.some((el) =>
        validateExpression(node, el, context, maxInlineClasses)
      );

    case AST_NODE_TYPES.ThisExpression:
      return false;

    default:
      console.log("Unhandled expression type:", expr.type);
      return false;
  }
}

export const rule = createRule<Options, MessageIds>({
  name: "limited-inline-classname",
  meta: {
    docs: {
      description: `Allow a configurable number of inline class names; require use of tailwind-variants.`,
    },
    messages: {
      limitedInlineClassName: `Inline className may contain at most {{max}} class. Use tailwind-variants instead.`,
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
  defaultOptions: [
    {
      directoryPattern: "/components/",
      maxInlineClasses: 5,
    },
  ],
  create: (context) => {
    const options = context.options[0] || {};
    const directoryPattern = options.directoryPattern || "/components/";
    const maxInlineClasses = options.maxInlineClasses ?? 5;

    const fileName = context.filename;

    if (!fileName.replace(/\\/g, "/").includes(directoryPattern)) {
      return {};
    }

    // Script visitors (for JSX in Vue <script> or React files)
    const scriptVisitor: RuleListener = {
      JSXAttribute(node: unknown) {
        const jsxAttr = node as TSESTree.JSXAttribute;
        if (jsxAttr.name.name !== "className") return;

        const value = jsxAttr.value;
        if (!value) return;

        // className="..."
        if (
          value.type === AST_NODE_TYPES.Literal &&
          typeof value.value === "string"
        ) {
          if (countClasses(value.value) > maxInlineClasses) {
            context.report({
              data: { max: maxInlineClasses.toString() },
              messageId: MESSAGE_IDS.limitedInlineClassName,
              node: jsxAttr,
            });
            return;
          }
        }

        // className={`...`} / className={"..."}
        if (value.type === AST_NODE_TYPES.JSXExpressionContainer) {
          const expr = value.expression;
          if (expr.type !== AST_NODE_TYPES.JSXEmptyExpression) {
            validateExpression(jsxAttr, expr, context, maxInlineClasses);
          }
        }
      },
    };

    // Template visitors (for Vue <template>)
    const templateVisitor: RuleListener = {
      VAttribute(node: unknown) {
        const vAttr = node as VueAST.VAttribute;
        if (!vAttr.value) return;

        // class="..."
        if (
          !vAttr.directive &&
          vAttr.key.type === "VIdentifier" &&
          vAttr.key.name === "class"
        ) {
          if (countClasses(vAttr.value.value) > maxInlineClasses) {
            context.report({
              data: { max: maxInlineClasses.toString() },
              messageId: MESSAGE_IDS.limitedInlineClassName,
              node: vAttr as never,
            });
          }
        }

        const container = getBindClassExpression(vAttr);
        if (!container) return;

        // :class="..." / v-bind:class
        if (container.expression) {
          validateExpression(
            vAttr,
            container.expression as VueAST.ESLintExpression,
            context,
            maxInlineClasses
          );
        }
      },
    };

    return createRuleVisitors(context, templateVisitor, scriptVisitor);
  },
});
