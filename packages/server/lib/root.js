const { DTOFactory } = require("./DTOFactory");
const { isAuthorized } = require("./authorization");

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
  console.log("Q: ", queryWithId);
  return JSON.parse(queryWithId);
};

const scalar = (db, dtoFactory, i = "id", queryTemplate) => {
  return async (args, context, info) => {
    let id = args[i];
    const query = processQueryTemplate(id, queryTemplate);
    let results = await db.find(query).toArray();
    if (context !== undefined) {
      results = results.filter((r) => isAuthorized(context.subscriber, r));
    }
    return dtoFactory.fillMany(
      results.map((r) => {
        r.payload.id = r.id;
        return r.payload;
      })
    );
  };
};

const singleton = (db, dtoFactory, id = "id", queryTemplate) => {
  return async ({ id: id }, context, info) => {
    const query = processQueryTemplate(id, queryTemplate);
    const result = await db.findOne(query).catch((e) => console.log(e));
    if (result === null) {
      console.log(`Nothing found for: ${id}`);
      return result;
    } else {
      if (context === undefined || isAuthorized(context.subscriber, result)) {
        result.payload.id = id;
        return dtoFactory.fillOne(result.payload);
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
