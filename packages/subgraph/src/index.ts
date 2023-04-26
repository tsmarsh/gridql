import {GraphQLResolveInfo, Kind, SelectionNode, SelectionSetNode} from "graphql"

export const processSelectionSet = (selectionSet: SelectionSetNode): string => {
    return selectionSet.selections.reduce((q: string, field : SelectionNode) => q + processFieldNode(field), "");
}


export const processFieldNode = (field: SelectionNode) : string => {
    switch (field.kind){
        case Kind.FIELD:
            if(field.selectionSet !== undefined){
                return `${field.name.value} {
                    ${processSelectionSet(field.selectionSet)}
                }\n`
            }
        case Kind.FRAGMENT_SPREAD:
            return field.name.value + "\n";
        default:
            throw new Error(`Don't know how to process node: ${field}`);
    }
}

export const processContext = (id: string, context: GraphQLResolveInfo, queryName: string) : string => {

    if(context.fieldNodes.length > 0) {
        const firstNode = context.fieldNodes[0]
        if(firstNode.selectionSet !== undefined) {
            const selectionSet: SelectionSetNode = firstNode.selectionSet;
            const sss = processSelectionSet(selectionSet)
            return `{${queryName}(id: "${id}"){
                ${sss} 
               }}`
        }

    }
    throw Error("Context is malformed");
}

export {}