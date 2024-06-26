import { DTOFactory } from "./DTOFactory.js";
import Handlebars from "handlebars";

import Log4js from "log4js";

let logger = Log4js.getLogger("gridql/root");

export const context = (db, authorizer, config) => {
  let dtoF = new DTOFactory(config.resolvers);
  let rt = root(db, dtoF, authorizer, config);

  return {
    dtoFactory: dtoF,
    root: rt,
  };
};

export const root = (db, dtoFactory, authorizer, { singletons, vectors }) => {
  let base = {};

  if (singletons !== undefined) {
    for (const s of singletons) {
      base[s.name] = singleton(db, dtoFactory, authorizer, s.query);
    }
  }

  if (vectors !== undefined) {
    for (const s of vectors) {
      base[s.name] = vector(db, dtoFactory, authorizer, s.query);
    }
  }

  return base;
};

export const processQueryTemplate = (parameters, queryTemplate) => {
  let query = queryTemplate(parameters);
  let json;

  try {
    json = JSON.parse(query);
  } catch (e) {
    logger.error(
      `Failed to create query:
      Query Template: ${queryTemplate}
      parameters: ${parameters}
      Updated Query: ${query}
    `,
    );
    throw e;
  }
  return json;
};

export const vector = (db, dtoFactory, authorizer, queryTemplate) => {
  const template = Handlebars.compile(queryTemplate);
  return async function (args, context) {
    let timestamp = getTimestamp(args);
    let time_filter = {
      $lt: new Date(timestamp),
    };

    let query = processQueryTemplate(args, template);

    query.createdAt = time_filter;

    let results = await db
      .aggregate([
        {
          $match: query,
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $group: {
            _id: "$id",
            doc: { $first: "$$ROOT" },
          },
        },
        {
          $replaceRoot: { newRoot: "$doc" },
        },
      ])
      .toArray();

    if (context !== undefined) {
      results = results.filter((r) => authorizer.isAuthorized(context.req, r));
    }
    return dtoFactory.fillMany(
      results.map((r) => {
        r.payload.id = r.id;
        return r.payload;
      }),
      context === undefined ? null : context.req,
      timestamp,
    );
  };
};

export function getTimestamp(args) {
  let atArg = "at";
  let at;
  if (Object.hasOwnProperty.call(args, atArg)) {
    at = args["at"];
  } else {
    at = Date.now();
  }

  return at;
}

export const singleton = (db, dtoFactory, authorizer, queryTemplate) => {
  const template = Handlebars.compile(queryTemplate);
  return async function (args, context) {
    const query = processQueryTemplate(args, template);

    let timestamp = getTimestamp(args);

    query.createdAt = {
      $lt: new Date(timestamp),
    };

    const results = await db.find(query).sort({ createdAt: -1 }).toArray();
    let result = results[0];

    if (result === null || result === undefined) {
      logger.debug(`Nothing found for: ${args}`);
      return result;
    } else {
      if (
        context === undefined ||
        authorizer.isAuthorized(context.req, result)
      ) {
        result.payload.id = result.id;
        return dtoFactory.fillOne(
          result.payload,
          context === undefined ? null : context.req,
          timestamp,
        );
      } else {
        return null;
      }
    }
  };
};
