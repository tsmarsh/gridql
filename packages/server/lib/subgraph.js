const processSelectionSet = (selectionSet) => {
    return selectionSet.selections.reduce((q, field) => q + processFieldNode(field), "");
}


const processFieldNode = (field) => {
    if (field.selectionSet !== undefined) {
        return `${field.name.value} {
                ${processSelectionSet(field.selectionSet)}
            }\n`
    } else {
        return field.name.value + "\n";
    }
}

const processContext = (id, context, queryName) => {

    if (context.fieldNodes.length > 0) {
        const firstNode = context.fieldNodes[0]
        if (firstNode.selectionSet !== undefined) {
            const selectionSet = firstNode.selectionSet;
            const sss = processSelectionSet(selectionSet)
            return `{${queryName}(id: "${id}"){
                ${sss} 
               }}`
        }

    }
    throw Error("Context is malformed");
}

module.exports = {
    processFieldNode,
    processSelectionSet,
    processContext
}