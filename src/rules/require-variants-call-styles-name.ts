import { type TSESTree, ESLintUtils } from "@typescript-eslint/utils";
import type {
  RuleContext,
  RuleFix,
  SourceCode,
} from "@typescript-eslint/utils/ts-eslint";

const createRule = ESLintUtils.RuleCreator((name) => name);

export const MESSAGE_IDS = {
  renameAllOccurrences: "renameAllOccurrences",
  requireVariantsCallStylesName: "requireVariantsCallStylesName",
} as const;
export type MessageIds = (typeof MESSAGE_IDS)[keyof typeof MESSAGE_IDS];

export type Options = [
  {
    /**
     * Name required for variables assigned from tv().
     * @default "styles"
     */
    name?: string;
  },
];

export const rule = createRule<Options, MessageIds>({
  create: (context) => {
    const [options = {}] = context.options;
    const requiredName = options.name ?? "styles";

    // Tracks by name, not scope—shadowed identifiers may cause false positives
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
        const { id, init } = node;

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
          detectVariantVariableNameViolation({
            context,
            declaratorNode: node,
            id,
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
    hasSuggestions: true,
    messages: {
      renameAllOccurrences: "Rename all occurrences to {{name}}",
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

type Context = Readonly<RuleContext<MessageIds, Options>>;

const isCallExpression = (
  init: TSESTree.Expression | null,
): init is TSESTree.CallExpression => init?.type === "CallExpression";

const isIdentifier = (
  node: TSESTree.Node | null,
): node is TSESTree.Identifier => node?.type === "Identifier";

/**
 * Collect all references to a variable declaration, excluding the initial
 * declaration.
 *
 * @param {object} options - Collection options.
 *
 * @returns {TSESTree.Identifier[]} Array of identifier nodes referencing the variable.
 */
const collectReferences = (options: {
  sourceCode: Readonly<SourceCode>;
  declaratorNode: TSESTree.VariableDeclarator;
  id: TSESTree.Identifier;
}): TSESTree.Identifier[] => {
  const declaredVariables = options.sourceCode.getDeclaredVariables(
    options.declaratorNode,
  );
  const references: TSESTree.Identifier[] = [];

  for (const variable of declaredVariables) {
    if (variable.name === options.id.name) {
      for (const reference of variable.references) {
        if (
          reference.identifier !== options.id &&
          reference.identifier.type === "Identifier"
        ) {
          references.push(reference.identifier);
        }
      }
      break;
    }
  }

  return references;
};

/**
 * Report incorrect variable name with autofix suggestion to rename all
 * occurrences.
 *
 * @param {object} options - Reporting options.
 */
const reportIncorrectName = (options: {
  context: Context;
  id: TSESTree.Identifier;
  requiredName: string;
  declaratorNode: TSESTree.VariableDeclarator;
}): void => {
  const { sourceCode } = options.context;
  const references = collectReferences({
    declaratorNode: options.declaratorNode,
    id: options.id,
    sourceCode,
  });

  options.context.report({
    data: {
      name: options.requiredName,
    },
    messageId: MESSAGE_IDS.requireVariantsCallStylesName,
    node: options.id,
    suggest: [
      {
        data: {
          name: options.requiredName,
        },
        fix: (fixer): RuleFix[] => {
          const fixes = [fixer.replaceText(options.id, options.requiredName)];

          for (const reference of references) {
            fixes.push(fixer.replaceText(reference, options.requiredName));
          }

          return fixes;
        },
        messageId: MESSAGE_IDS.renameAllOccurrences,
      },
    ],
  });
};

/**
 * Detect variant variable name violations and report if found.
 *
 * @param {object} options - Validation options.
 */
const detectVariantVariableNameViolation = (options: {
  context: Context;
  id: TSESTree.Identifier;
  requiredName: string;
  declaratorNode: TSESTree.VariableDeclarator;
}): void => {
  const variableName = options.id.name;

  if (variableName !== options.requiredName) {
    reportIncorrectName({
      context: options.context,
      declaratorNode: options.declaratorNode,
      id: options.id,
      requiredName: options.requiredName,
    });
  }
};
