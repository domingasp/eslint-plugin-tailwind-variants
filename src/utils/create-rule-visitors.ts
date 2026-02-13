import type { ParserServices } from "@typescript-eslint/utils";
import type {
  RuleContext,
  RuleListener,
} from "@typescript-eslint/utils/ts-eslint";

/**
 * Create and return rule visitors that work for both Vue single-file components
 * and regular script files.
 *
 * @param {RuleContext<TMessageIds, TOptions>} context - ESLint rule context.
 * @param {RuleListener} templateVisitor - Visitor for Vue template sections.
 * @param {RuleListener} scriptVisitor - Visitor for script sections.
 *
 * @returns {RuleListener} Appropriate visitor based on the file type.
 */
export const createRuleVisitors = <
  TMessageIds extends string,
  TOptions extends readonly unknown[],
>(
  context: RuleContext<TMessageIds, TOptions>,
  templateVisitor: RuleListener,
  scriptVisitor: RuleListener,
): RuleListener => {
  const fileName = context.filename;

  if (fileName.endsWith(".vue")) {
    const { sourceCode } = context;
    const { parserServices } = sourceCode;

    if (isVueParserServices(parserServices)) {
      return parserServices.defineTemplateBodyVisitor(
        templateVisitor,
        scriptVisitor,
      );
    }
  }

  return scriptVisitor;
};

/**
 * Extended parser services to add methods provided by vue-eslint-parser
 */
interface VueParserServices {
  defineDocumentVisitor?: (
    documentVisitor: RuleListener,
    options?: Record<string, unknown>,
  ) => RuleListener;
  defineTemplateBodyVisitor: (
    templateVisitor: RuleListener,
    scriptVisitor?: RuleListener,
  ) => RuleListener;
}

const isVueParserServices = (
  services: Partial<ParserServices> | undefined,
): services is ParserServices & VueParserServices =>
  typeof services !== "undefined" && "defineTemplateBodyVisitor" in services;
