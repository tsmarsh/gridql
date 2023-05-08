import {processContext} from "@tsmarsh/subgraph/src";
import {callSubgraph} from "@tsmarsh/subgraph/src/call";

export const assignResolver = (id= "id", queryName, url) => {
    return async function(parent, args, context) {
        let foreignKey = this[id];
        const query = processContext(foreignKey, context, queryName);
        return callSubgraph(url, query, queryName);
    }
}