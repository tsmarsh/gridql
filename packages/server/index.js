const express = require( 'express')
const { graphqlHTTP } = require('express-graphql')
const { buildSchema } = require('graphql')
const  fs = require( "fs")
const {context} = require("@tsmarsh/root")
const {MongoClient} = require("mongodb")

async function buildDb(mongo) {
    let client = new MongoClient(mongo.uri);
    await client.connect();
    let db = client.db(mongo.db).collection(mongo.collection);
    return db;
}

const init = async (configFile) => {
    const config = require(configFile);

    const port = config.port;


    let graphlettes = await Promise.all(config.graphlettes.map(async ({mongo, dtoConfig, schema, path    }) => {
        let db = await buildDb(mongo);

        let {root} = context(db, dtoConfig);

        console.log('Current directory:', process.cwd());

        let sch = fs.readFileSync(schema).toString();
        const graphSchema = buildSchema(sch)


        return {path, graph: {schema: graphSchema, root}};
    }));

    return {port, graphlettes};
}


const start = async (port, graphlettes) => {
    const app = express();

    for(let {path, graph} of graphlettes) {
        console.log("Setting up: " + path);
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

    app.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
    });

    return app;
}

module.exports = {
    start, init
}