import {MongoMemoryServer} from "mongodb-memory-server";

import { expect } from 'chai';

import { init, start} from '../src/server';
import {MongoClient, Collection} from "mongodb";
import {callSubgraph} from "subgraph/src/call"


describe('GraphQL Server', () => {
  let mongod: MongoMemoryServer;
  let uri: string;
  let config;
  let server;
  let db: Collection;

  before(async function () {
    mongod = await MongoMemoryServer.create({instance: {port: 60219}});
    let client = new MongoClient(mongod.getUri());
    await client.connect();
    db = client.db("test").collection("test");
    config = await init(__dirname + "/simple.json");

    server = start(config.port, config.graphlettes);

    uri = mongod.getUri();
  });

  after(async function() {
    mongod.stop();
  });

  it('should build a simple server', async () => {
    const result = await db.insertOne({foo: "bar", eggs: 11});

    const query = `{
         getById(id: "${result?.insertedId}") {
               eggs
            }
        }`;

    const json = await callSubgraph("http://localhost:40000/test", query, "getById");

    expect(json.eggs).to.equal(11);
  });
});

