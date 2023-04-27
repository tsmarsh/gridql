const { expect } = require('chai');
const { graphql } = require('graphql');

const { schema, rootValue } = require('../src/server');

describe('GraphQL Server', () => {
  it('returns "Hello, world!" for the hello query', async () => {
    const query = `
      query {
        hello
      }
    `;

    const response = await graphql({ schema, source: query, rootValue });
    expect(response.data).to.deep.equal({
      hello: 'Hello, world!',
    });
  });
});

