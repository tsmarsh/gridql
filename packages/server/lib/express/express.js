import path, { dirname } from "path";

import { fileURLToPath, URL } from "url";

import { createHandler } from "graphql-http/lib/use/express";

import { getSub } from "@gridql/auth";

import { init as crud_init } from "../rest/crud.js";

import express from "express";

import cors from "cors";

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
    console.log("Graphing up: " + path);
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
          console.log(error);
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
    console.log("ReSTing up: " + path);
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
