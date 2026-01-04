import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator((name) => name);

export const MESSAGE_IDS = {
  requireVariantsCallStylesName: "requireVariantsCallStylesName",
} as const;

type MessageIds = (typeof MESSAGE_IDS)[keyof typeof MESSAGE_IDS];
type Options = [
  {
    /**
     * Name required for variables assigned from tv()
     * @default "styles"
     */
    name?: string;
  }
];

export const rule = createRule<Options, MessageIds>({
  name: "require-variants-call-styles-name",
  meta: {
    docs: {
      description: "Require variables assigned from tv() to be named {{name}}.",
    },
    fixable: "code",
    messages: {
      requireVariantsCallStylesName:
        "Variable assigned from tv() must be named '{{name}}'.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          name: {
            default: "styles",
            description: "Name required for variables assigned from tv().",
            type: "string",
          },
        },
        type: "object",
      },
    ],
    type: "suggestion",
  },
  defaultOptions: [
    {
      name: "styles",
    },
  ],
  create: (context) => {
    const options = context.options[0] || {};
    const requiredName = options.name || "styles";

    const variantFunctions = new Set<string>();

    return {
      VariableDeclarator(node) {
        const init = node.init;
        const id = node.id;

        if (!init) return;
        if (init.type !== "CallExpression") return;
        if (init.callee.type !== "Identifier") return;
        if (id.type !== "Identifier") return;

        // Track variant functions created by tv()
        if (init.callee.name === "tv") {
          variantFunctions.add(id.name);
          return;
        }

        if (variantFunctions.has(init.callee.name)) {
          const variableName = id.name;
          const functionName = init.callee.name;

          if (variableName === requiredName) return;

          context.report({
            data: {
              functionName,
              name: requiredName,
            },
            fix: (fixer) => fixer.replaceText(id, requiredName),
            messageId: MESSAGE_IDS.requireVariantsCallStylesName,
            node: id,
          });
        }
      },
    };
  },
});
