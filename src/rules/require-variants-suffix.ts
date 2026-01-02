import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator((name) => name);

export const MESSAGE_IDS = {
  requireVariantsSuffix: "requireVariantsSuffix",
} as const;

type MessageIds = (typeof MESSAGE_IDS)[keyof typeof MESSAGE_IDS];
type Options = [
  {
    /**
     * Suffix required for variables assigned from tv()
     * @default "Variants"
     */
    suffix?: string;
  }
];

export const rule = createRule<Options, MessageIds>({
  name: "require-variants-suffix",
  meta: {
    docs: {
      description:
        "Require variables assigned from tv() to end with {{suffix}}.",
    },
    fixable: "code",
    messages: {
      requireVariantsSuffix:
        "Variable assigned from tv() must end with '{{suffix}}'.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          suffix: {
            default: "Variants",
            description: "Suffix required for variables assigned from tv().",
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
      suffix: "Variants",
    },
  ],
  create: (context) => {
    const options = context.options[0] || {};
    const suffix = options.suffix || "Variants";

    return {
      VariableDeclarator(node) {
        const init = node.init;

        if (!init) return;
        if (init.type !== "CallExpression") return;
        if (init.callee.type !== "Identifier") return;
        if (init.callee.name !== "tv") return;

        const { id } = node;
        if (id.type !== "Identifier") return;
        if (id.name.endsWith(suffix)) return;

        context.report({
          data: { suffix },
          fix: (fixer) => {
            return fixer.insertTextAfter(id, suffix);
          },
          messageId: MESSAGE_IDS.requireVariantsSuffix,
          node: id,
        });
      },
    };
  },
});
