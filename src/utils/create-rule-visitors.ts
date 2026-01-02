import type { ParserServices } from "@typescript-eslint/utils";

import { RuleContext, RuleListener } from "@typescript-eslint/utils/ts-eslint";

/**
 * Extended parser services to add methods provided by vue-eslint-parser
 */
interface VueParserServices {
  defineDocumentVisitor?: (
    documentVisitor: RuleListener,
    options?: Record<string, unknown>
  ) => RuleListener;
  defineTemplateBodyVisitor: (
    templateVisitor: RuleListener,
    scriptVisitor?: RuleListener
  ) => RuleListener;
}

/**
 * Creates rule visitors that work for both Vue single-file components and
 * regular script files (e.g., React).
 */
export function createRuleVisitors<
  TMessageIds extends string,
  TOptions extends readonly unknown[]
>(
  context: RuleContext<TMessageIds, TOptions>,
  templateVisitor: RuleListener,
  scriptVisitor: RuleListener
) {
  const fileName = context.filename;

  if (fileName.endsWith(".vue")) {
    const sourceCode = context.sourceCode;
    const parserServices = sourceCode.parserServices;

    if (isVueParserServices(parserServices)) {
      return parserServices.defineTemplateBodyVisitor(
        templateVisitor,
        scriptVisitor
      );
    }
  }

  return scriptVisitor;
}

function isVueParserServices(
  services: Partial<ParserServices> | undefined
): services is ParserServices & VueParserServices {
  return services !== undefined && "defineTemplateBodyVisitor" in services;
}
