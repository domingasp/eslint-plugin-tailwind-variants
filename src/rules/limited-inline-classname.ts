import {
  AST_NODE_TYPES,
  ESLintUtils,
  TSESTree,
} from "@typescript-eslint/utils";
import { RuleContext } from "@typescript-eslint/utils/ts-eslint";
import { AST, AST as VueAST } from "vue-eslint-parser";
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
  node: any,
  expr: any,
  context: RuleContext<MessageIds, Options>,
  maxInlineClasses = 5
): boolean {
  if (!expr) return false;

  switch (expr.type) {
    case AST_NODE_TYPES.Literal:
      if (typeof expr.value === "string") {
        if (countClasses(expr.value) > maxInlineClasses) {
          context.report({
            node,
            messageId: MESSAGE_IDS.limitedInlineClassName,
            data: { max: maxInlineClasses.toString() },
          });
          return true;
        }
      }
      return false;

    case AST_NODE_TYPES.TemplateLiteral:
      // Static template literal
      if (expr.expressions.length === 0) {
        const raw = expr.quasis[0]?.value.cooked ?? "";
        if (countClasses(raw) > maxInlineClasses) {
          context.report({
            node,
            messageId: MESSAGE_IDS.limitedInlineClassName,
            data: { max: maxInlineClasses.toString() },
          });
          return true;
        }
      }
      // Recurse into expressions
      return expr.expressions.some((e: unknown) =>
        validateExpression(node, e, context, maxInlineClasses)
      );

    case AST_NODE_TYPES.ArrayExpression:
      return expr.elements.some((el: any) =>
        validateExpression(node, el, context, maxInlineClasses)
      );

    case AST_NODE_TYPES.ConditionalExpression:
      return (
        validateExpression(node, expr.consequent, context, maxInlineClasses) ||
        validateExpression(node, expr.alternate, context, maxInlineClasses)
      );

    case AST_NODE_TYPES.LogicalExpression:
      return (
        validateExpression(node, expr.left, context, maxInlineClasses) ||
        validateExpression(node, expr.right, context, maxInlineClasses)
      );

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
          node: expr,
          messageId: MESSAGE_IDS.noCnInClassName,
        });
        return true;
      }
      // Also recurse into arguments of cn()
      return expr.arguments.some((arg: any) =>
        validateExpression(node, arg, context, maxInlineClasses)
      );

    default:
      console.log("Unhandled expression type:", expr.type);
      return false;
  }
}

export const rule = createRule<Options, MessageIds>({
  create: (context) => {
    const options = context.options[0] || {};
    const directoryPattern = options.directoryPattern || "/components/";
    const maxInlineClasses = options.maxInlineClasses ?? 5;

    const fileName = context.filename;

    if (!fileName.replace(/\\/g, "/").includes(directoryPattern)) {
      return {};
    }

    // Script visitors (for JSX in Vue <script> or React files)
    const scriptVisitor = {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.name.name !== "className") return;

        const value = node.value;
        if (!value) return;

        // className="..."
        if (
          value.type === AST_NODE_TYPES.Literal &&
          typeof value.value === "string"
        ) {
          if (countClasses(value.value) > maxInlineClasses) {
            context.report({
              node,
              messageId: MESSAGE_IDS.limitedInlineClassName,
              data: { max: maxInlineClasses.toString() },
            });
            return;
          }
        }

        // className={`...`} / className={"..."}
        if (value.type === AST_NODE_TYPES.JSXExpressionContainer) {
          validateExpression(node, value.expression, context, maxInlineClasses);
        }
      },
    };

    // Template visitors (for Vue <template>)
    const templateVisitor = {
      VAttribute(node: VueAST.VAttribute) {
        if (!node.value) return;

        // class="..."
        if (
          !node.directive &&
          node.key.type === "VIdentifier" &&
          node.key.name === "class"
        ) {
          if (countClasses(node.value.value) > maxInlineClasses) {
            context.report({
              node: node as never,
              messageId: MESSAGE_IDS.limitedInlineClassName,
              data: { max: maxInlineClasses.toString() },
            });
          }
        }

        const container = getBindClassExpression(node);
        if (!container) return;

        // :class="..." / v-bind:class
        validateExpression(
          node,
          container.expression,
          context,
          maxInlineClasses
        );
      },
    };

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
      limitedInlineClassName: `Inline className may contain at most {{max}} class. Use tailwind-variants instead.`,
      noCnInClassName:
        "Using cn() in className is not allowed in component definition. Use tailwind-variants instead.",
    },
    schema: [
      {
        type: "object",
        properties: {
          directoryPattern: {
            type: "string",
            description: 'Directory pattern to match, e.g., "/components/".',
          },
          maxInlineClasses: {
            type: "number",
            description:
              "Maximum number of inline classes allowed (default: 5).",
            minimum: 1,
            default: 5,
          },
        },
        additionalProperties: false,
      },
    ],
    type: "problem",
  },
  name: "limited-inline-classname",
});
