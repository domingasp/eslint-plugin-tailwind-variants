import { type TSESTree, ESLintUtils } from "@typescript-eslint/utils";
import type { RuleContext } from "@typescript-eslint/utils/ts-eslint";

const createRule = ESLintUtils.RuleCreator((name) => name);

export const MESSAGE_IDS = {
  requireVariantsSuffix: "requireVariantsSuffix",
} as const;

export type MessageIds = (typeof MESSAGE_IDS)[keyof typeof MESSAGE_IDS];
export type Options = [
  {
    /**
     * Suffix required for variables assigned from tv()
     * @default "Variants"
     */
    suffix?: string;
  },
];

/** Check if node is a valid tv() call expression */
const isTvCallExpression = (init: TSESTree.Expression): boolean =>
  init.type === "CallExpression" &&
  init.callee.type === "Identifier" &&
  init.callee.name === "tv";

/** Check if identifier already has the correct suffix */
const hasSuffix = (id: TSESTree.BindingName, suffix: string): boolean =>
  id.type === "Identifier" && id.name.endsWith(suffix);

/** Validate and report tv() variable naming */
const validateTvVariableName = (
  node: TSESTree.VariableDeclarator,
  context: RuleContext<MessageIds, Options>,
  suffix: string,
): void => {
  const { init, id } = node;

  if (!init || !isTvCallExpression(init)) {
    return;
  }

  if (id.type !== "Identifier" || hasSuffix(id, suffix)) {
    return;
  }

  context.report({
    data: { suffix },
    fix: (fixer) => fixer.insertTextAfter(id, suffix),
    messageId: MESSAGE_IDS.requireVariantsSuffix,
    node: id,
  });
};

export const rule = createRule<Options, MessageIds>({
  create: (context) => {
    const [options = {}] = context.options;
    const suffix = options.suffix ?? "Variants";

    return {
      VariableDeclarator(node): void {
        validateTvVariableName(node, context, suffix);
      },
    };
  },
  defaultOptions: [
    {
      suffix: "Variants",
    },
  ],
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
  name: "require-variants-suffix",
});
