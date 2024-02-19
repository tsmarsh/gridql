const { DTOFactory } = require("./DTOFactory");
const { isAuthorized } = require("@gridql/auth");

const context = (db, config) => {
  let dtoF = new DTOFactory(config.resolvers);
  let rt = root(db, dtoF, config);

  return {
    dtoFactory: dtoF,
    root: rt,
  };
};

const root = (db, dtoFactory, { singletons, scalars }) => {
  let base = {};

  if (singletons !== undefined) {
    for (const s of singletons) {
      base[s.name] = singleton(db, dtoFactory, s.id, s.query);
    }
  }

  if (scalars !== undefined) {
    for (const s of scalars) {
      base[s.name] = scalar(db, dtoFactory, s.id, s.query);
    }
  }

  return base;
};

const processQueryTemplate = (id, queryTemplate) => {
  const queryWithId = queryTemplate.replace("${id}", id);
  let json;

  try {
    json = JSON.parse(queryWithId);
  } catch (e) {
    console.error(
        `Failed to create query:
      Query Template: ${queryTemplate}
      id: ${id}
      Updated Query: ${queryWithId}
    `)
  throw e;
  }
  return json;
};

const scalar = (db, dtoFactory, i, queryTemplate) => {
  return async function (args, context, info) {
    let id = args[i];
    let timestamp = getTimestamp(args);
    let time_filter = {
      $lt: new Date(timestamp),
    };

    let query = processQueryTemplate(id, queryTemplate);

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
      results = results.filter((r) => isAuthorized(context.subscriber, r));
    }
    return dtoFactory.fillMany(
      results.map(
        (r) => {
          r.payload.id = r.id;
          return r.payload;
        }),
        context === undefined ? null : context.auth_header,
        timestamp
    );
  };
};

function getTimestamp(args) {
  let atArg = "at"
  let at;
  if(args.hasOwnProperty(atArg)){
    at = args["at"];
  } else{
    at = Date.now();
  }

  return at;
}

const singleton = (db, dtoFactory, id, queryTemplate) => {
  return async function (args, context, info) {
    let i = args[id];
    const query = processQueryTemplate(i, queryTemplate);

    let timestamp = getTimestamp(args);

    query.createdAt = {
      $lt: new Date(timestamp),
    };

    //console.log("Q: ", query);

    const results = await db.find(query).sort({ createdAt: -1 }).toArray();
    let result = results[0];

    if (result === null) {
      console.log(`Nothing found for: ${i}`);
      return result;
    } else {
      if (context === undefined || isAuthorized(context.subscriber, result)) {
        result.payload.id = i;
        return dtoFactory.fillOne(
          result.payload,
          context === undefined ? null : context.auth_header,
          timestamp
        );
      } else {
        return null;
      }
    }
  };
};

module.exports = {
  singleton,
  scalar,
  root,
  context,
};
