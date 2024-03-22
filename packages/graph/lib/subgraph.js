import { parse, print, TypeInfo, visitWithTypeInfo, visit } from "graphql";

export const processSelectionSet = (selectionSet) => {
  return selectionSet.selections.reduce(
    (q, field) => q + processFieldNode(field),
    "",
  );
};

export const processFieldNode = (field) => {
  if (field.selectionSet !== undefined) {
    return `${field.name.value} {
                ${processSelectionSet(field.selectionSet)}
            }\n`;
  } else {
    return field.name.value + "\n";
  }
};

export const addTimestampToQuery = (query, schema, queryName, timestamp) => {
  let ast = parse(query);
  const typeInfo = new TypeInfo(schema);
  ast = visit(
    ast,
    visitWithTypeInfo(typeInfo, {
      Field(node) {
        if (node.name.value === queryName) {
          if (!node.arguments.some((arg) => arg.name.value === "at")) {
            return {
              ...node,
              arguments: [
                ...node.arguments,
                {
                  kind: "Argument",
                  name: { kind: "Name", value: "at" },
                  value: { kind: "IntValue", value: timestamp },
                },
              ],
            };
          }
        }
      },
    }),
  );

  return print(ast);
};

export const processContext = (id, context, queryName, timestamp) => {
  if (context.fieldNodes.length > 0) {
    const firstNode = context.fieldNodes[0];
    if (firstNode.selectionSet !== undefined) {
      const selectionSet = firstNode.selectionSet;
      const sss = processSelectionSet(selectionSet);
      let query = `{${queryName}(id: "${id}"){
                ${sss} 
               }}`;
      return addTimestampToQuery(query, context.schema, queryName, timestamp);
    }
  }
  throw Error("Context is malformed");
};
