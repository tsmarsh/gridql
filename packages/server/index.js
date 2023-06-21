const express = require( 'express')
const { graphqlHTTP } = require('express-graphql')
const { buildSchema } = require('graphql')
const  fs = require( "fs")
const {context} = require("./lib/root")
const {MongoClient} = require("mongodb")
const {init: crud_init} = require("./lib/crud")
const cors = require("cors");
const {valid} = require("@gridql/payload-validator")
const parser = require ("@pushcorn/hocon-parser");
const promiseRetry = require('promise-retry')

const options = {
    directConnection: true
}

const promiseRetryOptions = {
    retries: options.reconnectTries,
    factor: 1.5,
    minTimeout: options.reconnectInterval,
    maxTimeout: 5000
}

const connect = (url) => {
    let client = new MongoClient(url, options)
    promiseRetry((retry, number) => {
        console.log(`MongoClient connecting to ${url} - retry number: ${number}`)
        return client.connect().catch(retry)
    }, promiseRetryOptions)
    return client;
}

async function buildDb(mongo) {
    // let client = await connect(mongo["uri"]);
    // await client.connect().catch((reason) => console.log(reason));
    let client = connect(mongo["uri"]);
    return client.db(mongo["db"]).collection(mongo["collection"]);
}

const process_graphlettes = async (config) => {
    return await Promise.all(config["graphlettes"].map(async ({mongo, dtoConfig, schema, path    }) => {
        let db = await buildDb(mongo);

        let {root} = context(db, dtoConfig);

        let sch = fs.readFileSync(schema).toString();
        const graphSchema = buildSchema(sch)

        return {path, graph: {schema: graphSchema, root}};
    }))
}

const process_restlettes = async (config) => {
    return await Promise.all(config["restlettes"].map(async ({mongo, schema, path }) => {
        let db = await buildDb(mongo);

        let sch = JSON.parse(fs.readFileSync(schema).toString());

        return {path, validator: valid(sch), db};
    }))
}

const init = async (configFile) => {
    const config = await parser.parse({ url: configFile })
        .catch(e => console.log("Error parse config: ", e));

    console.log("Config file: ", config)

    const url = config["url"];
    const port = config["port"];

    let graphlettes = [];

    let restlettes = [];

    try {
        if (config["graphlettes"] !== undefined){
            graphlettes = await process_graphlettes(config)
        }
    } catch (err) {
        console.log(err);
    }


    try {
        if (config["restlettes"] !== undefined){
            restlettes = await process_restlettes(config)
        }
    }catch (err) {
        console.log(err);
    }


    return {url, port, graphlettes, restlettes};
}


const start = async (url, port, graphlettes, restlettes) => {
    const app = express();
    app.use(cors());

    for(let {path, graph} of graphlettes) {
        console.log("Graphing up: " + path);
        let route = await graphqlHTTP({
            schema: graph.schema,
            rootValue: graph.root,
            graphiql: true,
            customFormatErrorFn: (error) => {
                console.log(error);
                return error;
            }
        });
        app.use(path, route)
    }

    for(let {path, db, validator} of restlettes) {
        console.log("ReSTing up: " + path);
        crud_init(url, path, app, db, validator)
    }

    return app.listen(port);
}

module.exports = {
    start, init
}