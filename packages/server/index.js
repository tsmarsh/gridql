const express = require("express");
const {buildSchema} = require('graphql');
const { createHandler } = require('graphql-http/lib/use/express');

const fs = require("fs");
const { context } = require("./lib/root");
const { MongoClient } = require("mongodb");
const { init: crud_init } = require("./lib/crud");
const cors = require("cors");
const { valid } = require("@gridql/payload-validator");
const parser = require("@pushcorn/hocon-parser");
const promiseRetry = require("promise-retry");
const { URL } = require("url");
const { buildDb } = require("@gridql/mongo-connector");


const process_graphlettes = async (config) => {
  return await Promise.all(
    config["graphlettes"].map(async ({ mongo, dtoConfig, schema, path }) => {
      let db = await buildDb(mongo);

      let { root } = context(db, dtoConfig);

      let sch = fs.readFileSync(schema).toString();
      const graphSchema = buildSchema(sch);

      return { path, graph: { schema: graphSchema, root } };
    })
  );
};

const process_restlettes = async (config) => {
  return await Promise.all(
    config["restlettes"].map(async ({ mongo, schema, path }) => {
      let db = await buildDb(mongo);

      let sch = JSON.parse(fs.readFileSync(schema).toString());

      return { path, schema: sch, validator: valid(sch), db };
    })
  );
};

const init = async (configFile) => {
  const config = await parser
    .parse({ url: configFile })
    .catch((e) => console.log("Error parse config: ", e));

  console.log("Config file: ", config);

  const url = config["url"];
  const port = config["port"];

  let graphlettes = [];

  let restlettes = [];

  try {
    if (config["graphlettes"] !== undefined) {
      graphlettes = await process_graphlettes(config);
    }
  } catch (err) {
    console.log(err);
  }

  try {
    if (config["restlettes"] !== undefined) {
      restlettes = await process_restlettes(config);
    }
  } catch (err) {
    console.log(err);
  }

  return { url, port, graphlettes, restlettes };
};

const start = async (url, port, graphlettes, restlettes) => {
  const app = express();
  app.use(cors());

  app.set("view engine", "pug");

  app.get("/", function (req, res) {
    res.render("index.pug", {
      url: new URL(url).origin,
      graphlettes,
      restlettes,
    });
  });

  for (let { path, graph } of graphlettes) {
    console.log("Graphing up: " + path);
    app.all(path, createHandler({
      schema: graph.schema,
      rootValue: graph.root,
      graphiql: true,
      formatError: (error) => {
        console.log(error);
        return error;
      },
    }))
  }

  for (let { path, db, validator, schema } of restlettes) {
    console.log("ReSTing up: " + path);
    crud_init(url, path, app, db, validator, schema);
  }

  return app.listen(port);
};

module.exports = {
  start,
  init,
};
