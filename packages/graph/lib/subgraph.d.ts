// YourModuleName.d.ts

import { GraphQLSchema, ASTNode, FieldNode, SelectionSetNode } from "graphql";

/**
 * Process a GraphQL SelectionSet.
 * @param selectionSet - The GraphQL SelectionSet to process.
 * @returns A string representation of the processed SelectionSet.
 */
export function processSelectionSet(selectionSet: SelectionSetNode): string;

/**
 * Process a GraphQL FieldNode.
 * @param field - The GraphQL FieldNode to process.
 * @returns A string representation of the processed FieldNode.
 */
export function processFieldNode(field: FieldNode): string;

/**
 * Adds a timestamp to a GraphQL query.
 * @param query - The GraphQL query string.
 * @param schema - The GraphQL schema.
 * @param queryName - The name of the query.
 * @param timestamp - The timestamp to add.
 * @returns The modified query string.
 */
export function addTimestampToQuery(
  query: string,
  schema: GraphQLSchema,
  queryName: string,
  timestamp: number,
): string;

/**
 * Processes the GraphQL context to construct a query.
 * @param id - The identifier used in the query.
 * @param context - The GraphQL context.
 * @param queryName - The name of the query.
 * @param timestamp - The timestamp to add.
 * @returns The constructed GraphQL query.
 */
export function processContext(
  id: string,
  context: any,
  queryName: string,
  timestamp: number,
): string;
