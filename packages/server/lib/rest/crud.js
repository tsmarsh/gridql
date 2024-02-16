const { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const { v4: uuid } = require("uuid");
const { swagger } = require("../swagger");
const { PayloadRepository } = require("./repository");
const { getSub, isAuthorized } = require("../authorization");

const calculateReaders = (doc, sub) => {
  const readers = new Set();

  if (sub !== null) {
    readers.add(sub);
  }

  return [...readers];
};

const create = (repo, context) => async (req, res) => {
  const payload = req.body;

  const result = await repo.create(payload, {
    subscriber: getSub(req.headers.authorization),
  });

  if (result !== null) {
    if (req.headers.authorization !== undefined) {
      res.header("Authorization", req.headers.authorization);
    }
    console.log("Created: ", result)
    res.redirect(303, `${context}/${result}`);
  } else {
    //should respond with diagnostics
    console.log("Failed to create: ", payload)
    res.sendStatus(400);
  }
};

const read = (repo) => async (req, res) => {
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

const update = (repo, context) => async (req, res) => {
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
      console.log("Updated: ", result)
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

const remove = (repo) => async (req, res) => {
  let id = req.params.id;
  const result = await repo.read(id, {});

  if (result !== null && result !== undefined) {
    if (isAuthorized(getSub(req.headers.authorization), result)) {
      await repo.remove(id);
      console.log("Deleted: ", id)
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

const list = (repo, context) => async (req, res) => {
  let subscriber = getSub(req.headers.authorization);

  let results = await repo.list(subscriber);

  res.json(results.map((r) => `${context}/${r}`));
};

const bulk_create = (repo, context) => async (req, res) => {

  let docs = req.body;

  let created = await repo.createMany(docs, {subscriber: getSub(req.headers.authorization)})

  created.OK = created.OK.map((id) => `${context}/${id}`)
  res.json(created);
};

const bulk_read = (repo) => async (req, res) => {
  let ids = req.query.ids.split(",");

  let found = await repo.readMany(ids, {subscriber: getSub(req.headers.authorization)});
  res.json(found);
};

const bulk_delete = (repo) => async (req, res) => {

  let ids = req.query.ids.split(",");

  let result = await repo.removeMany(ids)

  res.json({OK: ids});
};

const options = {
  swaggerOptions: {
    url: "/api-docs/swagger.json",
  },
};

const init = (url, context, app, db, validate, schema) => {
  console.log("API Docks are available on: ", `${context}/api-docs`);

  let repo = new PayloadRepository(db, validate);

  let swaggerDoc = swagger(context, schema, url);

  app.get(`${context}/api-docs/swagger.json`, (req, res) =>
    res.json(swaggerDoc)
  );

  app.use(
    `${context}/api-docs`,
    swaggerUi.serveFiles(swaggerDoc, options),
    swaggerUi.setup(swaggerDoc, options)
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

module.exports = {
  init,
  calculateReaders,
};
