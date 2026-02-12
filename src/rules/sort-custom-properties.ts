import { type TSESTree, ESLintUtils } from "@typescript-eslint/utils";
import type {
  ReportDescriptor,
  RuleContext,
  RuleFix,
  RuleFixer,
  SourceCode,
} from "@typescript-eslint/utils/ts-eslint";

interface CustomProperty {
  node: TSESTree.Node;
  orderIndex: number;
  property: string;
}

const createRule = ESLintUtils.RuleCreator((name) => name);

const BLOCK_SELECTOR =
  "Rule > Block, AtRule[name='theme'] > Block, AtRule[name='utility'] > Block";

const DEFAULT_ORDER = [
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
  invalidPattern: "invalidPattern",
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
  },
];

const MATCHES_NOTHING = /(?!)/;

type NodeWithOffset = TSESTree.Node & {
  loc: TSESTree.SourceLocation & {
    end: TSESTree.Position & { offset: number };
    start: TSESTree.Position & { offset: number };
  };
};

/** Check if node has offset information */
const isNodeWithOffset = (node: TSESTree.Node): node is NodeWithOffset =>
  node.loc !== null &&
  typeof (node.loc.start as NodeWithOffset["loc"]["start"]).offset ===
    "number" &&
  typeof (node.loc.end as NodeWithOffset["loc"]["end"]).offset === "number";

/** Validate and compile a regular expression pattern */
const compilePattern = (
  pattern: string,
  context: RuleContext<MessageIds, Options>,
): RegExp => {
  const MAX_PATTERN_LENGTH = 100;
  if (pattern.length > MAX_PATTERN_LENGTH) {
    context.report({
      data: { pattern },
      loc: { column: 1, line: 1 },
      messageId: MESSAGE_IDS.patternTooLong,
    });

    return MATCHES_NOTHING;
  }

  try {
    return new RegExp(pattern);
  } catch {
    context.report({
      data: { pattern },
      loc: { column: 1, line: 1 },
      messageId: MESSAGE_IDS.invalidPattern,
    });
    // Fallback: escape special chars and treat as a prefix match
    return MATCHES_NOTHING;
  }
};

/** Compile an array of order patterns into regular expressions */
const compileOrderPatterns = (
  order: string[],
  context: RuleContext<MessageIds, Options>,
): RegExp[] => order.map((pattern) => compilePattern(pattern, context));

/** Return a function to get the order index of a property */
const createOrderIndexGetter =
  (compiledOrder: RegExp[]) =>
  (propName: string): number => {
    for (let i = 0; i < compiledOrder.length; i += 1) {
      if (compiledOrder[i].test(propName)) {
        return i;
      }
    }
    return compiledOrder.length;
  };

/** Return if properties are sorted based on order index and alphabetically */
const checkIfSorted = (properties: CustomProperty[]): boolean => {
  for (let i = 1; i < properties.length; i += 1) {
    const prev = properties[i - 1];
    const curr = properties[i];

    if (prev.orderIndex > curr.orderIndex) {
      return false;
    }

    if (prev.orderIndex === curr.orderIndex && prev.property > curr.property) {
      return false;
    }
  }
  return true;
};

/** Return if there are empty lines between groups of properties */
const needsEmptyLinesBetweenGroups = (
  properties: CustomProperty[],
): boolean => {
  // Minimum lines between groups to be considered as having empty lines
  const SPACING_THRESHOLD = 2;
  for (let i = 1; i < properties.length; i += 1) {
    const prev = properties[i - 1];
    const curr = properties[i];

    if (prev.orderIndex !== curr.orderIndex) {
      const linesBetween = curr.node.loc.start.line - prev.node.loc.end.line;
      if (linesBetween < SPACING_THRESHOLD) {
        // Needs empty lines
        return true;
      }
    }
  }
  return false;
};

/** Sort properties based on order index and alphabetically */
const sortProperties = (properties: CustomProperty[]): CustomProperty[] =>
  [...properties].sort((a, b) => {
    if (a.orderIndex !== b.orderIndex) {
      return a.orderIndex - b.orderIndex;
    }

    return a.property.localeCompare(b.property);
  });

/** Get the full declaration text for a node, including semicolon */
const getFullDeclaration = (
  node: NodeWithOffset,
  sourceCode: Readonly<SourceCode>,
): string => {
  const lineStartIndex = sourceCode.getIndexFromLoc({
    column: 1,
    line: node.loc.start.line,
  });
  // Include semicolon
  const endIndex = node.loc.end.offset + 1;
  return sourceCode.text.slice(lineStartIndex, endIndex);
};

/** Calculate the end line for a property declaration */
const calculateEndLine = (
  prop: CustomProperty,
  nextProp: CustomProperty | undefined,
): number => {
  if (typeof nextProp !== "undefined") {
    return nextProp.node.loc.start.line;
  }

  return prop.node.loc.end.line + 1;
};

/** Create a report descriptor for a block violation */
interface ReplacementConfig {
  sortedDeclaration: string;
  index: number;
  sorted: CustomProperty[];
  emptyLineBetweenGroups: boolean;
}

/** Build the replace text for a property, including empty lines if needed */
const buildReplacement = (config: ReplacementConfig): string => {
  let replacement = "";

  if (config.emptyLineBetweenGroups && config.index > 0) {
    const prevOrderIndex = config.sorted[config.index - 1].orderIndex;
    const currOrderIndex = config.sorted[config.index].orderIndex;

    if (prevOrderIndex !== currOrderIndex) {
      replacement = "\n";
    }
  }

  replacement += `${config.sortedDeclaration}\n`;
  return replacement;
};

interface FixerConfig {
  currentBlockProperties: CustomProperty[];
  sorted: CustomProperty[];
  emptyLineBetweenGroups: boolean;
  sourceCode: Readonly<SourceCode>;
}

interface SingleFixConfig {
  prop: CustomProperty;
  index: number;
  config: FixerConfig;
  fixer: RuleFixer;
}

/** Create a single fix for reordering a property */
const createSingleFix = ({
  prop,
  index,
  config,
  fixer,
}: SingleFixConfig): RuleFix => {
  const { sorted, currentBlockProperties, emptyLineBetweenGroups, sourceCode } =
    config;

  const sortedNode = sorted[index].node;
  const sortedDeclaration = getFullDeclaration(
    sortedNode as NodeWithOffset,
    sourceCode,
  );

  const currentLineStart = sourceCode.getIndexFromLoc({
    column: 1,
    line: prop.node.loc.start.line,
  });

  const endLine = calculateEndLine(prop, currentBlockProperties[index + 1]);
  const currentLineEnd = sourceCode.getIndexFromLoc({
    column: 1,
    line: endLine,
  });

  const replacement = buildReplacement({
    emptyLineBetweenGroups,
    index,
    sorted,
    sortedDeclaration,
  });

  return fixer.replaceTextRange(
    [currentLineStart, currentLineEnd],
    replacement,
  );
};

/** Create a fixer function to reorder properties in the source code */
const createFixer =
  (config: FixerConfig) =>
  (fixer: RuleFixer): RuleFix[] | null => {
    const { sorted, currentBlockProperties } = config;

    const allNodesHaveOffsets = sorted.every((item) =>
      isNodeWithOffset(item.node),
    );
    if (!allNodesHaveOffsets) {
      // oxlint-disable-next-line unicorn/no-null
      return null;
    }

    const fixes = currentBlockProperties.map(
      (prop, index): RuleFix => createSingleFix({ config, fixer, index, prop }),
    );

    return fixes;
  };

/** Check if block should be processed */
const shouldProcessBlock = (
  currentBlockProperties: CustomProperty[] | undefined,
): currentBlockProperties is CustomProperty[] => {
  const MIN_PROPERTIES_TO_CHECK = 2;
  return (
    typeof currentBlockProperties !== "undefined" &&
    currentBlockProperties.length >= MIN_PROPERTIES_TO_CHECK
  );
};

/** Check if empty lines are needed between groups */
const checkEmptyLinesIfRequired = (
  emptyLineBetweenGroups: boolean,
  currentBlockProperties: CustomProperty[],
): boolean => {
  if (!emptyLineBetweenGroups) {
    return false;
  }

  return needsEmptyLinesBetweenGroups(currentBlockProperties);
};

/** Process and report block violations */
const processBlockViolations = (
  currentBlockProperties: CustomProperty[],
  config: BlockHandlerConfig,
): void => {
  const isSorted = checkIfSorted(currentBlockProperties);
  const needsEmptyLines = checkEmptyLinesIfRequired(
    config.emptyLineBetweenGroups,
    currentBlockProperties,
  );

  const messageId = getViolationMessageId(isSorted, needsEmptyLines);
  if (!messageId) {
    return;
  }

  const sorted = sortProperties(currentBlockProperties);
  const report = createReportDescriptor({
    currentBlockProperties,
    emptyLineBetweenGroups: config.emptyLineBetweenGroups,
    messageId,
    order: config.order,
    sorted,
    sourceCode: config.sourceCode,
  });

  config.context.report(report);
};

/** Determine the appropriate message ID based on sorting and spacing */
const getViolationMessageId = (
  isSorted: boolean,
  needsEmptyLines: boolean,
): MessageIds | undefined => {
  if (isSorted && !needsEmptyLines) {
    return;
  }

  if (isSorted) {
    return MESSAGE_IDS.missingEmptyLineBetweenGroups;
  }

  return MESSAGE_IDS.unsortedCustomProperties;
};

/** Configuration for creating report descriptor */
interface ReportConfig {
  currentBlockProperties: CustomProperty[];
  sorted: CustomProperty[];
  emptyLineBetweenGroups: boolean;
  sourceCode: Readonly<SourceCode>;
  messageId: MessageIds;
  order: string[];
}

/** Create a report descriptor for given configuration */
const createReportDescriptor = (
  config: ReportConfig,
): ReportDescriptor<MessageIds> => ({
  fix: createFixer(config),
  messageId: config.messageId,
  node: config.currentBlockProperties[0].node,
  // oxlint-disable-next-line oxc/no-rest-spread-properties data is readonly
  ...(config.messageId === MESSAGE_IDS.unsortedCustomProperties && {
    data: {
      order: config.order.join(", "),
    },
  }),
});

/** Configuration object for block handling */
interface BlockHandlerConfig {
  blockStack: CustomProperty[][];
  emptyLineBetweenGroups: boolean;
  order: string[];
  sourceCode: Readonly<SourceCode>;
  context: RuleContext<MessageIds, Options>;
}

/** Handle properties in a block when exiting */
const handleBlockExit = (config: BlockHandlerConfig) => (): void => {
  const currentBlockProperties = config.blockStack.pop();

  if (!shouldProcessBlock(currentBlockProperties)) {
    return;
  }

  processBlockViolations(currentBlockProperties, config);
};

/** Handle declaration nodes to collect custom properties */
const handleDeclaration =
  (
    blockStack: CustomProperty[][],
    getMatchingOrderIndex: (propName: string) => number,
  ) =>
  (node: TSESTree.Node & { property: string }): void => {
    if (!node.property.startsWith("--")) {
      return;
    }

    const orderIndex = getMatchingOrderIndex(node.property);
    const currentBlock = blockStack.at(-1);

    if (!currentBlock) {
      return;
    }

    currentBlock.push({
      node,
      orderIndex,
      property: node.property,
    });
  };

export const rule = createRule<Options, MessageIds>({
  create: (context) => {
    const [options = {}] = context.options;
    const order = options.order ?? DEFAULT_ORDER;
    const emptyLineBetweenGroups = options.emptyLineBetweenGroups ?? false;
    const { sourceCode } = context;

    const compiledOrder = compileOrderPatterns(order, context);
    const getMatchingOrderIndex = createOrderIndexGetter(compiledOrder);
    const blockStack: CustomProperty[][] = [];

    return {
      [`${BLOCK_SELECTOR}:exit`]: handleBlockExit({
        blockStack,
        context,
        emptyLineBetweenGroups,
        order,
        sourceCode,
      }),
      [`:matches(${BLOCK_SELECTOR}) > Declaration`]: handleDeclaration(
        blockStack,
        getMatchingOrderIndex,
      ),
      [BLOCK_SELECTOR](): void {
        blockStack.push([]);
      },
    };
  },
  defaultOptions: [
    {
      emptyLineBetweenGroups: false,
      order: DEFAULT_ORDER,
    },
  ],
  meta: {
    docs: {
      description:
        "Enforce sorting of CSS custom properties based on RegEx patterns within declaration blocks.",
    },
    fixable: "code",
    messages: {
      invalidPattern:
        "The pattern '{{pattern}}' is not a valid regular expression",
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
            default: DEFAULT_ORDER,
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
  name: "sort-custom-properties",
});
