import { CstParser} from "chevrotain";
import {
    allTokens,
    Class, CloseArgList,
    CloseArray,
    CloseBlock,
    Colon,
    ComposedOf,
    Identifier, OpenArgList,
    OpenArray,
    OpenBlock,
    Type
} from "./lexer.mjs";

export class RepositoryDiagram extends CstParser {
    constructor() {
        super(allTokens);

        const $ = this;

        $.RULE("statementClause", () => {
            $.MANY(() => {
                $.OR([{ALT: () => $.SUBRULE($.compositionClause)}, {ALT: () => $.SUBRULE($.classClause)}])
            })
        })

        $.RULE("compositionClause", () => {
            $.CONSUME(Type, {LABEL: "lhs"})
            $.CONSUME(ComposedOf)
            $.CONSUME2(Type, {LABEL: "rhs"})
        })

        $.RULE("classClause", () => {
            $.CONSUME(Class)
            $.CONSUME(Type)
            $.CONSUME(OpenBlock)
            $.MANY(() => {
                $.OR([{ALT: () => $.SUBRULE($.fieldClause)}, {ALT: () => $.SUBRULE($.methodClause)}])
            })
            $.CONSUME(CloseBlock)
        })

        $.RULE("fieldClause", () => {
            $.CONSUME(Identifier)
            $.CONSUME(Colon)
            $.SUBRULE($.typeClause)
        })

        $.RULE("typeClause", () => {
            $.OR([{ALT: () => $.CONSUME(Type)}, {ALT: () => $.SUBRULE($.arrayClause)}])
        })

        $.RULE("arrayClause", () => {
            $.CONSUME(OpenArray)
            $.CONSUME(Type)
            $.CONSUME(CloseArray)
        })

        $.RULE("methodClause", () => {
            $.CONSUME(Identifier)
            $.CONSUME(OpenArgList)
            $.SUBRULE($.argList)
            $.CONSUME(CloseArgList)
            $.CONSUME(Colon)
            $.SUBRULE($.typeClause)
        })

        $.RULE("argList", () => {
            $.CONSUME(Identifier)
            $.CONSUME(Colon)
            $.SUBRULE($.typeClause)
        })

        this.performSelfAnalysis()
    }
}