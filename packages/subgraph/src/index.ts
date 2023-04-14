import {GraphQLResolveInfo, Kind, SelectionNode, SelectionSetNode} from "graphql"

export const callSubgraph = async (url: string, query: string, queryName: string) => {
    const body = JSON.stringify({"query": query});
    console.log(`Sending: ${body} to ${url}`);
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: body
    });

    const json = await response.json();

    if (json.hasOwnProperty('errors')) {
        console.log(json);
    }

    return json["data"][queryName];
};

export const processSelectionSet = (selectionSet: SelectionSetNode) => {
    return selectionSet.selections.reduce((q: string, field : SelectionNode) => q + processFieldNode(field), "");
}


export const processFieldNode = (field: SelectionNode) => {
    switch (field.kind){
        case Kind.FIELD:
            return `${field.name.value} {
                    ${processSelectionSet(field.selectionSet)}
                }\n`
        case Kind.FRAGMENT_SPREAD:
            return field.name.value + "\n";
        default:
            throw new Error(`Don't know how to process node: ${field}`);
    }
}

export const processContext = (id: string, context: GraphQLResolveInfo, queryName: string) => {
    const selectionSet: SelectionSetNode = context.fieldNodes[0].selectionSet;
    const sss = processSelectionSet(selectionSet)

    return `{${queryName}(id: "${id}"){
     ${sss} 
    }}`;
}

export {}