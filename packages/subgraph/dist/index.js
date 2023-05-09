"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processContext = exports.processFieldNode = exports.processSelectionSet = void 0;
const graphql_1 = require("graphql");
const processSelectionSet = (selectionSet) => {
    return selectionSet.selections.reduce((q, field) => q + (0, exports.processFieldNode)(field), "");
};
exports.processSelectionSet = processSelectionSet;
const processFieldNode = (field) => {
    switch (field.kind) {
        case graphql_1.Kind.FIELD:
            if (field.selectionSet !== undefined) {
                return `${field.name.value} {
                    ${(0, exports.processSelectionSet)(field.selectionSet)}
                }\n`;
            }
        case graphql_1.Kind.FRAGMENT_SPREAD:
            return field.name.value + "\n";
        default:
            throw new Error(`Don't know how to process node: ${field}`);
    }
};
exports.processFieldNode = processFieldNode;
const processContext = (id, context, queryName) => {
    if (context.fieldNodes.length > 0) {
        const firstNode = context.fieldNodes[0];
        if (firstNode.selectionSet !== undefined) {
            const selectionSet = firstNode.selectionSet;
            const sss = (0, exports.processSelectionSet)(selectionSet);
            return `{${queryName}(id: "${id}"){
                ${sss} 
               }}`;
        }
    }
    throw Error("Context is malformed");
};
exports.processContext = processContext;
