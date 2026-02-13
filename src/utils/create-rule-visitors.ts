import type { ParserServices } from "@typescript-eslint/utils";
import type {
  RuleContext,
  RuleListener,
} from "@typescript-eslint/utils/ts-eslint";

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

/**
 * Creates rule visitors that work for both Vue single-file components and
 * regular script files (e.g., React).
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

const isVueParserServices = (
  services: Partial<ParserServices> | undefined,
): services is ParserServices & VueParserServices =>
  typeof services !== "undefined" && "defineTemplateBodyVisitor" in services;
