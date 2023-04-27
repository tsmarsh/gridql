const express = require('express') ;
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');

const schema = buildSchema(`
  type Query {
    hello: String
  }
`);

const rootValue = {
    hello: () => 'Hello, world!',
};

const app = express();

app.use(
    '/graphql',
    graphqlHTTP({
        schema,
        rootValue,
        graphiql: true,
    }),
);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}/graphql`);
});

module.exports = {
    schema, rootValue
}