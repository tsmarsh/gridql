import {processContext} from "subgraph/src";
import {callSubgraph} from "subgraph/src/call";

export const assignResolver = (id= "id", queryName, url) => {
    return async function(parent, args, context) {
        let foreignKey = this[id];
        const query = processContext(foreignKey, context, queryName);
        return callSubgraph(url, query, queryName);
    }
}