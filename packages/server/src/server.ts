import express, {IRouter, IRouterHandler, RequestHandler} from 'express'
import { graphqlHTTP } from 'express-graphql'
import { buildSchema, GraphQLSchema } from 'graphql'
import  fs from "fs"
import {context} from "@tsmarsh/root/src"
import {Collection, MongoClient} from "mongodb"
import {ServerConfig} from "@tsmarsh/configuration/src/types/serverConfig.schema";
import {Validator} from "jsonschema";
import {MongoConfig} from "@tsmarsh/configuration/src/types/mongoConfig.schema";

const serverConfigSchema = JSON.parse(fs.readFileSync(__dirname + "/../schemas/serverConfig.schema.json").toString());

type Graphlette = {
    path: string,
    graph: {schema: GraphQLSchema, root: any}
}

type Server = {
    port: number,
    graphlettes: Graphlette[]
}
const validator = new Validator();

async function buildDb(mongo: MongoConfig) {
    let client = new MongoClient(mongo.uri);
    await client.connect();
    let db: Collection = client.db(mongo.db).collection(mongo.collection);
    return db;
}

export const init = async (configFile: string): Promise<Server> => {
    const config: ServerConfig = require(configFile);

    const port = config.port;


    let graphlettes: Graphlette[] = await Promise.all(config.graphlettes.map(async ({mongo, dtoConfig, schema, path    }) => {
        let db = await buildDb(mongo);

        let {root} = context(db, dtoConfig);

        console.log('Current directory:', process.cwd());

        let sch = fs.readFileSync(schema).toString();
        const graphSchema = buildSchema(sch)


        return {path, graph: {schema: graphSchema, root}};
    }));

    return {port, graphlettes};
}


export const start = async (port: number, graphlettes: Graphlette[]) => {
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