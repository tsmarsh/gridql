import {GraphQLResolveInfo, Kind, SelectionNode, SelectionSetNode} from "graphql"

export const callSubgraph = async (url: string, query: string, queryName: string) => {
    const body = JSON.stringify({"query": query});


    console.log(`Sending: ${body} to ${url}`);

    const { default: fetch } = await import('node-fetch');

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: body
    });

    const json : any = await response.json();

    if (json.hasOwnProperty('errors')) {
        console.log(json);
    }

    return json["data"][queryName];
};

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