import express from "express";

import swaggerUi from "swagger-ui-express";

import { swagger } from "../swagger.js";

import { PayloadRepository } from "./repository.js";

import Log4js from "log4js";

let logger = Log4js.getLogger("gridql/server");
export const calculateReaders = (doc, sub) => {
  const readers = new Set();

  if (sub !== null) {
    readers.add(sub);
  }

  return [...readers];
};

export const create = (repo, context, authorizer) => async (req, res) => {
  const payload = req.body;

  const secure_payload = authorizer.secureData(req, payload);

  const result = await repo.create(secure_payload);

  if (result !== null) {
    let auth_response = authorizer.authorizeResponse(req, res);

    logger.debug(`Created: ${result}`);
    auth_response.redirect(303, `${context}/${result}`);
  } else {
    //should respond with diagnostics
    logger.error(`Failed to create: ${payload}`);
    res.sendStatus(400);
  }
};

export const read = (repo, authorizer) => async (req, res) => {
  let id = req.params.id;

  const result = await repo.read(id, {});

  if (result !== null && result !== undefined) {
    res.header("X-Canonical-Id", result.id);
    if (authorizer.isAuthorized(req, result)) {
      authorizer.authorizeResponse(req, res).json(result.payload);
    } else {
      res.status(403);
      res.json({});
    }
  } else {
    res.status(404);
    res.json({});
  }
};

export const update = (repo, context, authorizer) => async (req, res) => {
  const payload = req.body;

  let id = req.params.id;

  let current = await repo.read(id, {});

  if (current !== null && current !== undefined) {
    if (authorizer.isAuthorized(req, current)) {
      let secured_update = authorizer.secureData(req, {
        payload,
        id
      });

      const result = await repo.create(secured_update);

      let secured_response = authorizer.authorizeResponse(req, res);

      logger.debug(`Updated: ${result}`);
      secured_response.redirect(303, `${context}/${id}`);
    } else {
      res.status(403);
      res.json({});
    }
  } else {
    res.status(404);
    res.json({});
  }
};

export const remove = (repo, authorizer) => async (req, res) => {
  let id = req.params.id;
  const result = await repo.read(id, {});

  if (result !== null && result !== undefined) {

    if (authorizer.isAuthorized(req, result)) {
      await repo.remove(id);
      logger.debug(`Deleted: ${id}`);
      res.json({ deleted: id });
    } else {
      res.status(403);
      res.json({});
    }
  } else {
    res.status(404);
    res.json({});
  }
};

export const list = (repo, context, authorizer) => async (req, res) => {
  let results = await repo.list((query) => authorizer.secureRead(req, query));

  res.json(results.map((r) => `${context}/${r}`));
};

export const bulk_create = (repo, context, authorizer) => async (req, res) => {
  let docs = req.body;

  let secured_docs = docs.map((payload) => authorizer.secureData(req, {payload}))
  let created = await repo.createMany(secured_docs);

  created.OK = created.OK.map((id) => `${context}/${id}`);
  res.json(created);
};

export const bulk_read = (repo, authorizer) => async (req, res) => {
  let ids = req.query.ids.split(",");

  let found = await repo.readMany(ids, (d) => authorizer.secureData(req, d));

  let authorized_docs = found.filter((r) => authorizer.isAuthorized(req, r));
  res.json(authorized_docs);
};

export const bulk_delete = (repo) => async (req, res) => {
  let ids = req.query.ids.split(",");

  await repo.removeMany(ids);

  res.json({ OK: ids });
};

const options = {
  swaggerOptions: {
    url: "/api-docs/swagger.json",
  },
};

export const init = (url, context, app, schema, authorizer, repo) => {
  logger.info(`API Docks are available on: ${context}/api-docs`);

  let swaggerDoc = swagger(context, schema, url);

  app.get(`${context}/api-docs/swagger.json`, (req, res) =>
    res.json(swaggerDoc),
  );

  app.use(
    `${context}/api-docs`,
    swaggerUi.serveFiles(swaggerDoc, options),
    swaggerUi.setup(swaggerDoc, options),
  );

  app.use(express.json());

  app.post(`${context}/bulk`, bulk_create(repo, context, authorizer));
  app.get(`${context}/bulk`, bulk_read(repo, authorizer));
  app.delete(`${context}/bulk`, bulk_delete(repo));

  app.post(`${context}`, create(repo, context, authorizer));

  app.get(`${context}`, list(repo, context, authorizer));

  app.get(`${context}/:id`, read(repo, authorizer));

  app.put(`${context}/:id`, update(repo, context, authorizer));

  app.delete(`${context}/:id`, remove(repo, authorizer));

  return app;
};
