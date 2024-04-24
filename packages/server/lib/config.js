import parser from "@pushcorn/hocon-parser";

import { buildDb } from "@gridql/mongo-connector";

import { JWTSubAuthorizer } from "@gridql/auth";

import { context } from "@gridql/graph";

import fs from "fs";

import { buildSchema } from "graphql";

import Log4js from "log4js";

let logger = Log4js.getLogger("gridql/server");

export const process_graphlettes = async (config, authorizer) => {
  return await Promise.all(
    config["graphlettes"].map(async ({ mongo, dtoConfig, schema, path }) => {
      let db = await buildDb(mongo);

      let { root } = context(db, authorizer, dtoConfig);

      let sch = fs.readFileSync(schema).toString();
      const graphSchema = buildSchema(sch);

      return { path, graph: { schema: graphSchema, root } };
    }),
  );
};

export const process_restlettes = async (config) => {
  return await Promise.all(
    config["restlettes"].map(async ({ mongo, schema, path }) => {
      let db = await buildDb(mongo);

      let sch = JSON.parse(fs.readFileSync(schema).toString());

      return { path, schema: sch, db };
    }),
  );
};
export const parse = async (configFile, authorizer = JWTSubAuthorizer) => {
  const config = await parser
    .parse({ url: configFile })
    .catch((e) =>
      logger.error(`Error parse config: ${JSON.stringify(e, null, 2)}`),
    );

  logger.info(`Config file: ${JSON.stringify(config, null, 2)}`);

  const url = config["url"];
  const port = config["port"];

  let graphlettes = [];

  let restlettes = [];

  try {
    if (config["graphlettes"] !== undefined) {
      graphlettes = await process_graphlettes(config, authorizer);
    }
  } catch (err) {
    logger.error(`Cannot process graphlette: ${err}`);
    throw err;
  }

  try {
    if (config["restlettes"] !== undefined) {
      restlettes = await process_restlettes(config);
    }
  } catch (err) {
    logger.error(`Cannot process restlette: ${err}`);
    throw err;
  }

  return { url, port, graphlettes, restlettes };
};
