// YourModuleName.d.ts

/**
 * Calls a subgraph with the given parameters.
 * @param url - The URL of the subgraph to call.
 * @param query - The GraphQL query string.
 * @param queryName - The name of the query.
 * @param authHeader - The authorization header, if any.
 * @returns The data returned from the subgraph query.
 */
export function callSubgraph(
  url: string,
  query: string,
  queryName: string,
  authHeader?: string | null,
): Promise<any>;
