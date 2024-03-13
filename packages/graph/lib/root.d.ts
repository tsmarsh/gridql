import { DTOFactory } from "./DTOFactory";

/**
 * Creates a context with a DTOFactory and root object.
 * @param db - The database object.
 * @param config - The configuration object.
 * @returns An object containing the DTOFactory and root object.
 */
export function context(
  db: any,
  config: any,
): { dtoFactory: DTOFactory; root: any };

/**
 * Creates the root object with singletons and scalars.
 * @param db - The database object.
 * @param dtoFactory - An instance of DTOFactory.
 * @param config - The configuration object containing singletons and scalars.
 * @returns The root object.
 */
export function root(db: any, dtoFactory: DTOFactory, config: any): any;

/**
 * Processes a query template and replaces placeholders.
 * @param id - The identifier to replace in the template.
 * @param queryTemplate - The query template string.
 * @returns The processed query.
 */
export function processQueryTemplate(id: string, queryTemplate: string): any;

/**
 * Creates a scalar resolver function.
 * @param db - The database object.
 * @param dtoFactory - An instance of DTOFactory.
 * @param id - The identifier key, defaulting to 'id'.
 * @param queryTemplate - The query template string.
 * @returns A scalar resolver function.
 */
export function scalar(
  db: any,
  dtoFactory: DTOFactory,
  id: string,
  queryTemplate: string,
): (args: any, context: any, info: any) => Promise<any>;

/**
 * Creates a singleton resolver function.
 * @param db - The database object.
 * @param dtoFactory - An instance of DTOFactory.
 * @param id - The identifier key, defaulting to 'id'.
 * @param queryTemplate - The query template string.
 * @returns A singleton resolver function.
 */
export function singleton(
  db: any,
  dtoFactory: DTOFactory,
  id: string,
  queryTemplate: string,
): (args: any, context: any, info: any) => Promise<any>;
