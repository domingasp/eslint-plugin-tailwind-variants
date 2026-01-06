import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import { RuleFix } from "@typescript-eslint/utils/ts-eslint";

interface CustomProperty {
  node: TSESTree.Node;
  orderIndex: number;
  property: string;
}

const createRule = ESLintUtils.RuleCreator((name) => name);

const BLOCK_SELECTOR =
  "Rule > Block, AtRule[name='theme'] > Block, AtRule[name='utility'] > Block";

const defaultOrder = [
  "^--spacing-",
  "^--size-",
  "^--font-",
  "^--weight-",
  "^--leading-",
  "^--tracking-",
  "^--radius-",
  "^--shadow-",
  "^--animate-",
  "^--transition-",
  "^--color-",
];

export const MESSAGE_IDS = {
  missingEmptyLineBetweenGroups: "missingEmptyLineBetweenGroups",
  patternTooLong: "patternTooLong",
  unsortedCustomProperties: "unsortedCustomProperties",
} as const;

export type MessageIds = (typeof MESSAGE_IDS)[keyof typeof MESSAGE_IDS];
export type Options = [
  {
    /**
     * Add empty line between different prefix groups
     * @default false
     */
    emptyLineBetweenGroups?: boolean;
    /**
     * Order of patterns (RegExp strings) for custom properties.
     * Properties matching the first pattern appear first.
     * @default [
     * 	"^--spacing-",
     * 	"^--size-",
     * 	"^--font-",
     * 	"^--weight-",
     * 	"^--leading-",
     * 	"^--tracking-",
     * 	"^--radius-",
     * 	"^--shadow-",
     * 	"^--animate-",
     * 	"^--transition-",
     * 	"^--color-",
     * ]
     */
    order?: string[];
  }
];

type NodeWithOffset = TSESTree.Node & {
  loc: TSESTree.SourceLocation & {
    end: TSESTree.Position & { offset: number };
    start: TSESTree.Position & { offset: number };
  };
};

function isNodeWithOffset(node: TSESTree.Node): node is NodeWithOffset {
  return (
    node.loc != null &&
    typeof (node.loc.start as NodeWithOffset["loc"]["start"]).offset ===
      "number" &&
    typeof (node.loc.end as NodeWithOffset["loc"]["end"]).offset === "number"
  );
}

export const rule = createRule<Options, MessageIds>({
  name: "sort-custom-properties",
  meta: {
    docs: {
      description:
        "Enforce sorting of CSS custom properties based on RegEx patterns within declaration blocks.",
    },
    fixable: "code",
    messages: {
      missingEmptyLineBetweenGroups:
        "Expected empty line between different custom property prefix groups",
      patternTooLong:
        "The pattern '{{pattern}}' is too long and may cause performance issues",
      unsortedCustomProperties:
        "Custom properties should be sorted by the defined order: {{order}}",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          emptyLineBetweenGroups: {
            default: false,
            description: "Add empty line between different prefix groups",
            type: "boolean",
          },
          order: {
            default: defaultOrder,
            description: "Array of RegEx patterns defining the sort order",
            items: {
              type: "string",
            },
            type: "array",
          },
        },
        type: "object",
      },
    ],
    type: "layout",
  },
  defaultOptions: [
    {
      emptyLineBetweenGroups: false,
      order: defaultOrder,
    },
  ],
  create: (context) => {
    const options = context.options[0] || {};
    const order = options.order || defaultOrder;
    const emptyLineBetweenGroups = options.emptyLineBetweenGroups || false;

    const { sourceCode } = context;

    const compiledOrder = order.map((pattern) => {
      if (pattern.length > 100) {
        context.report({
          data: { pattern },
          loc: { column: 1, line: 1 },
          messageId: MESSAGE_IDS.patternTooLong,
        });

        return /(?!)/; // Matches nothing
      }

      try {
        return new RegExp(pattern);
      } catch {
        // Fallback: escape special chars and treat as a prefix match
        return new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
      }
    });

    const getMatchingOrderIndex = (propName: string): number => {
      for (let i = 0; i < compiledOrder.length; i++) {
        if (compiledOrder[i].test(propName)) {
          return i;
        }
      }
      return compiledOrder.length; // Unmatched properties go to the end
    };

    const blockStack: CustomProperty[][] = [];

    return {
      [`${BLOCK_SELECTOR}:exit`]() {
        const currentBlockProperties = blockStack.pop();
        if (!currentBlockProperties || currentBlockProperties.length < 2) {
          return;
        }

        let isSorted = true;
        let needsEmptyLines = false;
        for (let i = 1; i < currentBlockProperties.length; i++) {
          const prev = currentBlockProperties[i - 1];
          const curr = currentBlockProperties[i];

          if (prev.orderIndex > curr.orderIndex) {
            isSorted = false;
            break;
          } else if (
            prev.orderIndex === curr.orderIndex &&
            prev.property > curr.property
          ) {
            isSorted = false;
            break;
          }

          if (emptyLineBetweenGroups && prev.orderIndex !== curr.orderIndex) {
            const prevNode = prev.node;
            const currNode = curr.node;

            const linesBetween =
              currNode.loc.start.line - prevNode.loc.end.line;

            if (linesBetween < 2) {
              needsEmptyLines = true;
            }
          }
        }

        if (isSorted && !needsEmptyLines) return;

        const messageId = !isSorted
          ? MESSAGE_IDS.unsortedCustomProperties
          : MESSAGE_IDS.missingEmptyLineBetweenGroups;

        context.report({
          ...(messageId === MESSAGE_IDS.unsortedCustomProperties && {
            data: {
              order: order.join(", "),
            },
          }),
          fix: (fixer) => {
            const sorted = [...currentBlockProperties].sort((a, b) => {
              if (a.orderIndex !== b.orderIndex) {
                return a.orderIndex - b.orderIndex;
              }
              return a.property.localeCompare(b.property);
            });

            const allNodesHaveOffsets = sorted.every((item) =>
              isNodeWithOffset(item.node)
            );
            if (!allNodesHaveOffsets) return null;

            const getFullDeclaration = (node: NodeWithOffset) => {
              const lineStartIndex = sourceCode.getIndexFromLoc({
                column: 1,
                line: node.loc.start.line,
              });
              const endIndex = node.loc.end.offset + 1; // Include semicolon
              return sourceCode.text.slice(lineStartIndex, endIndex);
            };

            const fixes = currentBlockProperties
              .map((prop, index) => {
                const sortedNode = sorted[index].node;
                const sortedDeclaration = getFullDeclaration(
                  sortedNode as NodeWithOffset
                );

                // Column is 1-based in ESLint loc
                const currentLineStart = sourceCode.getIndexFromLoc({
                  column: 1,
                  line: prop.node.loc.start.line,
                });
                const currentLineEnd = sourceCode.getIndexFromLoc({
                  column: 1,
                  line: prop.node.loc.end.line + 1,
                });

                let replacement = "";

                if (emptyLineBetweenGroups && index > 0) {
                  const prevOrderIndex = sorted[index - 1].orderIndex;
                  const currOrderIndex = sorted[index].orderIndex;

                  if (prevOrderIndex !== currOrderIndex) {
                    replacement = "\n";
                  }
                }

                replacement += sortedDeclaration + "\n";

                return fixer.replaceTextRange(
                  [currentLineStart, currentLineEnd],
                  replacement
                );
              })
              .filter((fix): fix is RuleFix => fix !== null);

            return fixes;
          },
          messageId: messageId,
          node: currentBlockProperties[0].node,
        });
      },
      [`:matches(${BLOCK_SELECTOR}) > Declaration`](
        node: TSESTree.Node & { property: string }
      ) {
        if (!node.property.startsWith("--")) return;

        const orderIndex = getMatchingOrderIndex(node.property);

        const currentBlock = blockStack[blockStack.length - 1];
        if (!currentBlock) return;

        currentBlock.push({
          node,
          orderIndex,
          property: node.property,
        });
      },
      [BLOCK_SELECTOR]() {
        blockStack.push([]);
      },
    };
  },
});
