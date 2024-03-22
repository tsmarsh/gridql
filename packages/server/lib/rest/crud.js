import express from "express";

import swaggerUi from "swagger-ui-express";

import { swagger } from "../swagger.js";

import { PayloadRepository } from "./repository.js";

import { getSub, isAuthorized } from "@gridql/auth";
import Log4js from "log4js";

let logger = Log4js.getLogger("gridql/server");
export const calculateReaders = (doc, sub) => {
  const readers = new Set();

  if (sub !== null) {
    readers.add(sub);
  }

  return [...readers];
};

export const create = (repo, context) => async (req, res) => {
  const payload = req.body;

  const result = await repo.create(payload, {
    subscriber: getSub(req.headers.authorization),
  });

  if (result !== null) {
    if (req.headers.authorization !== undefined) {
      res.header("Authorization", req.headers.authorization);
    }
    logger.debug(`Created: ${result}`);
    res.redirect(303, `${context}/${result}`);
  } else {
    //should respond with diagnostics
    logger.error(`Failed to create: ${payload}`);
    res.sendStatus(400);
  }
};

export const read = (repo) => async (req, res) => {
  let id = req.params.id;

  const result = await repo.read(id, {});

  if (result !== null && result !== undefined) {
    res.header("X-Canonical-Id", result.id);
    if (isAuthorized(getSub(req.headers.authorization), result)) {
      res.json(result.payload);
    } else {
      res.status(403);
      res.json({});
    }
  } else {
    res.status(404);
    res.json({});
  }
};

export const update = (repo, context) => async (req, res) => {
  const payload = req.body;

  let subscriber = getSub(req.headers.authorization);
  let id = req.params.id;

  let current = await repo.read(id, {});

  if (current !== null && current !== undefined) {
    if (isAuthorized(subscriber, current)) {
      const result = await repo.create(payload, {
        subscriber,
        id,
      });
      if (req.headers.authorization !== undefined) {
        res.header("Authorization", req.headers.authorization);
      }
      logger.debug(`Updated: ${result}`);
      res.redirect(303, `${context}/${id}`);
    } else {
      res.status(403);
      res.json({});
    }
  } else {
    res.status(404);
    res.json({});
  }
};

export const remove = (repo) => async (req, res) => {
  let id = req.params.id;
  const result = await repo.read(id, {});

  if (result !== null && result !== undefined) {
    if (isAuthorized(getSub(req.headers.authorization), result)) {
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

export const list = (repo, context) => async (req, res) => {
  let subscriber = getSub(req.headers.authorization);

  let results = await repo.list(subscriber);

  res.json(results.map((r) => `${context}/${r}`));
};

export const bulk_create = (repo, context) => async (req, res) => {
  let docs = req.body;

  let created = await repo.createMany(docs, {
    subscriber: getSub(req.headers.authorization),
  });

  created.OK = created.OK.map((id) => `${context}/${id}`);
  res.json(created);
};

export const bulk_read = (repo) => async (req, res) => {
  let ids = req.query.ids.split(",");

  let found = await repo.readMany(ids, {
    subscriber: getSub(req.headers.authorization),
  });
  res.json(found);
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

export const init = (url, context, app, db, validate, schema) => {
  logger.info(`API Docks are available on: ${context}/api-docs`);

  let repo = new PayloadRepository(db, validate);

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

  app.post(`${context}/bulk`, bulk_create(repo));
  app.get(`${context}/bulk`, bulk_read(repo));
  app.delete(`${context}/bulk`, bulk_delete(repo));

  app.post(`${context}`, create(repo, context));

  app.get(`${context}`, list(repo, context));

  app.get(`${context}/:id`, read(repo));

  app.put(`${context}/:id`, update(repo, context));

  app.delete(`${context}/:id`, remove(repo));

  return app;
};
