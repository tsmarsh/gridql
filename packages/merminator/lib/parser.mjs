import { CstParser, Lexer } from "chevrotain";
import {
  allTokens,
  Class,
  CloseArgList,
  CloseArray,
  CloseBlock,
  Colon,
  Comma,
  DoubleQuotedString,
  //SingleQuotedString,
  Number,
  ComposedOf,
  Identifier,
  OpenArgList,
  OpenArray,
  OpenBlock,
  RequiredType,
  Type,
} from "./lexer.mjs";

import Log4js from "log4js";

let logger = Log4js.getLogger("gridql/RepositoryDiagram");

export class RepositoryDiagram extends CstParser {
  constructor() {
    super(allTokens);
    this.lexer = new Lexer(allTokens);
    const $ = this;

    $.RULE("statementClause", () => {
      $.MANY(() => {
        $.OR([
          { ALT: () => $.SUBRULE($.compositionClause) },
          { ALT: () => $.SUBRULE($.classClause) },
        ]);
      });
    });

    $.RULE("compositionClause", () => {
      $.CONSUME(Type, { LABEL: "lhs" });
      $.CONSUME(ComposedOf);
      $.CONSUME2(Type, { LABEL: "rhs" });
    });

    $.RULE("classClause", () => {
      $.CONSUME(Class);
      $.CONSUME(Type);
      $.CONSUME(OpenBlock);
      $.MANY(() => {
        $.OR([
          { ALT: () => $.SUBRULE($.fieldClause) },
          { ALT: () => $.SUBRULE($.methodClause) },
        ]);
      });
      $.CONSUME(CloseBlock);
    });

    $.RULE("fieldClause", () => {
      $.CONSUME(Identifier);
      $.CONSUME(Colon);
      $.SUBRULE($.typeClause);
      $.OPTION(() => {
        $.CONSUME(OpenArray);
        $.SUBRULE($.varList);
        $.CONSUME(CloseArray);
      });
    });

    $.RULE("typeClause", () => {
      $.OR([
        { ALT: () => $.CONSUME(RequiredType) },
        { ALT: () => $.CONSUME2(Type) },
        { ALT: () => $.SUBRULE($.arrayClause) },
      ]);
    });

    $.RULE("arrayClause", () => {
      $.CONSUME(OpenArray);
      $.CONSUME(Type);
      $.CONSUME(CloseArray);
    });

    $.RULE("methodClause", () => {
      $.CONSUME(Identifier);
      $.CONSUME(OpenArgList);
      $.SUBRULE($.argList);
      $.CONSUME(CloseArgList);
      $.CONSUME(Colon);
      $.SUBRULE($.typeClause);
    });

    $.RULE("argList", () => {
      $.MANY_SEP({
        SEP: Comma,
        DEF: () => {
          this.CONSUME(Identifier);
          this.CONSUME(Colon);
          this.SUBRULE($.typeClause);
        },
      });
    });

    $.RULE("varList", () => {
      $.MANY_SEP({
        SEP: Comma,
        DEF: () => {
          this.CONSUME(Identifier);
          this.CONSUME(Colon);
          $.OR([
            { ALT: () => $.CONSUME(DoubleQuotedString) },
            //{ ALT: () => $.CONSUME(SingleQuotedString) },
            { ALT: () => $.CONSUME2(Number) },
          ]);
        },
      });
    });

    this.performSelfAnalysis();
  }

  parseInput(text) {
    let result = this.lexer.tokenize(text);

    this.input = result.tokens;
    const ctx = this.statementClause();

    if (this.errors.length > 0) {
      logger.error(JSON.stringify(this.errors, null, 2));
      throw new Error("ERRORS!\n" + this.errors[0].message);
    }

    return ctx;
  }
}

export const parser = new RepositoryDiagram();
export const BaseCstVisitor = parser.getBaseCstVisitorConstructor();
