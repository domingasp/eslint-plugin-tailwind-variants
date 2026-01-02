import type { ParserServices } from "@typescript-eslint/utils";
import { RuleContext } from "@typescript-eslint/utils/ts-eslint";

type NodeVisitor = Record<string, (node: any) => void>;

/**
 * Extended parser services to add methods provided by vue-eslint-parser
 */
interface VueParserServices {
  defineTemplateBodyVisitor: (
    templateVisitor: NodeVisitor,
    scriptVisitor?: NodeVisitor
  ) => NodeVisitor;
  defineDocumentVisitor?: (
    documentVisitor: NodeVisitor,
    options?: Record<string, any>
  ) => NodeVisitor;
}

function isVueParserServices(
  services: Partial<ParserServices> | undefined
): services is ParserServices & VueParserServices {
  return services !== undefined && "defineTemplateBodyVisitor" in services;
}

/**
 * Creates rule visitors that work for both Vue single-file components and
 * regular script files (e.g., React).
 */
export function createRuleVisitors(
  context: RuleContext<any, any>,
  templateVisitor: NodeVisitor,
  scriptVisitor: NodeVisitor
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
