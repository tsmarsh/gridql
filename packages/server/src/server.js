const express = require('express') ;
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const fs = require("fs");
const {context} = require("root");
const {MongoClient} = require("mongodb");


const init = async (configFile) => {
    const {mongo, dtoConfig, schemaFile, port} = require(configFile);
    let client = new MongoClient(mongo.uri);
    await client.connect();
    let db = client.db(mongo.db).collection(mongo.collection);
    let {root} = context(db, dtoConfig);
    let buffer = fs.readFileSync(schemaFile).toString();
    const schema = buildSchema( buffer);
    return {schema, root, port}
}

const start = ({schema, root, port}) => {
    const app = express();

    app.use(
        '/graphql',
        graphqlHTTP({
            schema,
            root,
            graphiql: true,
        }),
    );

    app.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}/graphql`);
    });

    return app;
}





module.exports = {
    init, start
}