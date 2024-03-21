import path, { dirname } from "path";

import { fileURLToPath, URL } from "url";

import { createHandler } from "graphql-http/lib/use/express";

import { getSub } from "@gridql/auth";

import { init as crud_init } from "../rest/crud.js";

import express from "express";

import cors from "cors";

import Log4js from "log4js";

let logger = Log4js.getLogger("gridql/server");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const add_network_front = (app, url, graphlettes, restlettes) => {
  app.set("view engine", "pug");
  app.set("views", path.join(__dirname, "../../views"));

  app.get("/", function (req, res) {
    res.render("index.pug", {
      url: new URL(url).origin,
      graphlettes,
      restlettes,
    });
  });
};

export const add_graphlettes = (graphlettes, app) => {
  for (let { path, graph } of graphlettes) {
    logger.info("Graphing up: " + path);
    app.get(path, (req, res) => {
      res.render("graphiql", {
        path,
      });
    });
    app.post(
      path,
      createHandler({
        schema: graph.schema,
        rootValue: graph.root,
        formatError: (error) => {
          logger.error(JSON.stringify(error, null, 2));
          return error;
        },
        context: async (req) => {
          return {
            auth_header: req.headers.authorization,
            subscriber: getSub(req.headers.authorization),
          };
        },
      }),
    );
  }
};

export const add_restlettes = (restlettes, url, app) => {
  for (let { path, db, validator, schema } of restlettes) {
    logger.info("ReSTing up: " + path);
    crud_init(url, path, app, db, validator, schema);
  }
};

export const build_app = async ({ url, graphlettes, restlettes }) => {
  const app = express();
  app.use(cors());
  add_network_front(app, url, graphlettes, restlettes);
  add_graphlettes(graphlettes, app);
  add_restlettes(restlettes, url, app);

  return app;
};
