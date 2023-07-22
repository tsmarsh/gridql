const { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const { v4: uuid } = require("uuid");
const { swagger } = require("./swagger");
const { PayloadRepository } = require("./repository");
const { getSub, isAuthorized } = require("./authorization");

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
    res.redirect(303, `${context}/${result}`);
  } else {
    //should respond with diagnostics
    res.sendStatus(400);
  }
};

const read = (repo) => async (req, res) => {
  let id = req.params.id;

  const result = await repo.read(id, {});

  if (result !== null && result !== undefined) {
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
      await repo.create(payload, {
        subscriber,
        id,
      });
      if (req.headers.authorization !== undefined) {
        res.header("Authorization", req.headers.authorization);
      }
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

const bulk_create = (url) => async (req, res) => {
  const init = {
    method: "POST",
    redirect: "follow",
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (req.headers.authorization !== undefined) {
    init.header["Authorization"] = req.headers.authorization;
  }

  let responses = await Promise.all(
    req.body.map((doc) => {
      init["body"] = JSON.stringify(doc);
      return fetch(url, init);
    })
  );

  const res_body = await extracted(responses);

  console.log(res_body);
  res.json(res_body);
};

const bulk_read = (url) => async (req, res) => {
  const init = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (req.headers.authorization !== undefined) {
    init.header["Authorization"] = req.headers.authorization;
  }

  let ids = req.query.ids.split(",");

  let responses = await Promise.all(
    ids.map((id) => {
      let location = `${url}/${id}`;
      return fetch(location, init);
    })
  );

  const res_body = await extracted(responses);

  res.json(res_body);
};

const bulk_delete = (url) => async (req, res) => {
  const init = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (req.headers.authorization !== undefined) {
    init.header["Authorization"] = req.headers.authorization;
  }

  let ids = req.query.ids.split(",");

  let responses = await Promise.all(
    ids.map((id) => {
      let location = `${url}/${id}`;
      return fetch(location, init);
    })
  );

  const res_body = await extracted(responses);

  res.json(res_body);
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

  app.post(`${context}/bulk`, bulk_create(url));
  app.get(`${context}/bulk`, bulk_read(url));
  app.delete(`${context}/bulk`, bulk_delete(url));

  app.post(`${context}`, create(repo, context));

  app.get(`${context}`, list(repo, context));

  app.get(`${context}/:id`, read(repo));

  app.put(`${context}/:id`, update(repo, context));

  app.delete(`${context}/:id`, remove(repo));

  return app;
};

async function extracted(responses) {
  const res_body = {};

  for (let response of responses) {
    let collection = res_body[response.statusText] || [];

    let good =
      response.status >= 200 &&
      response.status < 300 &&
      !Object.keys(response.body).length;
    let value;

    if (good) {
      try {
        value = await response.json().catch((err) => console.log(err));
      } catch (err) {
        console.log(err);
      }
    } else {
      value = response.url;
    }

    collection.push(value);

    res_body[response.statusText] = collection;
  }
  return res_body;
}

module.exports = {
  init,
  calculateReaders,
};
