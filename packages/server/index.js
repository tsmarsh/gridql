const express = require( 'express')
const { graphqlHTTP } = require('express-graphql')
const { buildSchema } = require('graphql')
const  fs = require( "fs")
const {context} = require("./lib/root")
const {MongoClient} = require("mongodb")
const {init: crud_init} = require("./lib/crud")
const cors = require("cors");
const {valid} = require("@tsmarsh/payload-validator")

async function buildDb(mongo) {
    let client = await new MongoClient(mongo.uri);
    await client.connect().catch((reason) => console.log(reason));
    let db = client.db(mongo.db).collection(mongo.collection);
    return db;
}

const process_graphlettes = async (config) => {
    return await Promise.all(config.graphlettes.map(async ({mongo, dtoConfig, schema, path    }) => {
        let db = await buildDb(mongo);

        let {root} = context(db, dtoConfig);

        let sch = fs.readFileSync(schema).toString();
        const graphSchema = buildSchema(sch)

        return {path, graph: {schema: graphSchema, root}};
    }))
}

const process_restlettes = async (config) => {
    return await Promise.all(config.restlettes.map(async ({mongo, schema, path }) => {
        let db = await buildDb(mongo);

        let sch = JSON.parse(fs.readFileSync(schema).toString());

        return {path, validator: valid(sch), db};
    }))
}

const init = async (configFile) => {
    const config = JSON.parse(fs.readFileSync(configFile).toString());

    const url = config.url;
    const port = config.port;

    let graphlettes = [];

    let restlettes = [];

    for (chr)
    try {
        if (config.graphlettes !== undefined){
            graphlettes = await process_graphlettes(config)
        }
    } catch (err) {
        console.log(err);
    }


    try {
        if (config.restlettes !== undefined){
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