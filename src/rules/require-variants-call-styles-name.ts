import { type TSESTree, ESLintUtils } from "@typescript-eslint/utils";
import type { RuleContext } from "@typescript-eslint/utils/ts-eslint";

const createRule = ESLintUtils.RuleCreator((name) => name);

export const MESSAGE_IDS = {
  requireVariantsCallStylesName: "requireVariantsCallStylesName",
} as const;

export type MessageIds = (typeof MESSAGE_IDS)[keyof typeof MESSAGE_IDS];
export type Options = [
  {
    /**
     * Name required for variables assigned from tv()
     * @default "styles"
     */
    name?: string;
  },
];

type Context = Readonly<RuleContext<MessageIds, Options>>;

const isCallExpression = (
  init: TSESTree.Expression | null,
): init is TSESTree.CallExpression => init?.type === "CallExpression";

const isIdentifier = (
  node: TSESTree.Node | null,
): node is TSESTree.Identifier => node?.type === "Identifier";

const reportIncorrectName = (options: {
  context: Context;
  id: TSESTree.Identifier;
  functionName: string;
  requiredName: string;
}): void => {
  options.context.report({
    data: {
      functionName: options.functionName,
      name: options.requiredName,
    },
    fix: (fixer) => fixer.replaceText(options.id, options.requiredName),
    messageId: MESSAGE_IDS.requireVariantsCallStylesName,
    node: options.id,
  });
};

const handleVariantFunctionCall = (options: {
  context: Context;
  callee: TSESTree.Identifier;
  id: TSESTree.Identifier;
  requiredName: string;
}): void => {
  const variableName = options.id.name;
  const functionName = options.callee.name;

  if (variableName !== options.requiredName) {
    reportIncorrectName({
      context: options.context,
      functionName,
      id: options.id,
      requiredName: options.requiredName,
    });
  }
};

export const rule = createRule<Options, MessageIds>({
  create: (context) => {
    const [options = {}] = context.options;
    const requiredName = options.name ?? "styles";
    const variantFunctions = new Set<string>();

    const trackVariantFunction = (
      init: TSESTree.CallExpression,
      id: TSESTree.Identifier,
    ): boolean => {
      if (isIdentifier(init.callee) && init.callee.name === "tv") {
        variantFunctions.add(id.name);
        return true;
      }
      return false;
    };

    return {
      VariableDeclarator(node): void {
        const { init, id } = node;

        if (
          !init ||
          !isCallExpression(init) ||
          !isIdentifier(init.callee) ||
          !isIdentifier(id)
        ) {
          return;
        }

        if (trackVariantFunction(init, id)) {
          return;
        }

        if (variantFunctions.has(init.callee.name)) {
          handleVariantFunctionCall({
            context,
            id,
            callee: init.callee,
            requiredName,
          });
        }
      },
    };
  },
  defaultOptions: [
    {
      name: "styles",
    },
  ],
  meta: {
    docs: {
      description:
        "Require variables assigned from calling a function returned by tv() to be named {{name}}.",
    },
    fixable: "code",
    messages: {
      requireVariantsCallStylesName:
        "Require variables assigned from calling a function returned by tv() to be named {{name}}.",
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
  name: "require-variants-call-styles-name",
});
