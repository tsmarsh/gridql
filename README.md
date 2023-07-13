[![CI](https://github.com/tsmarsh/gridql/actions/workflows/node.js.yml/badge.svg)](https://github.com/tsmarsh/gridql/actions/workflows/node.js.yml)
[![codecov](https://codecov.io/gh/tsmarsh/gridql/branch/main/graph/badge.svg?token=b9wLrKB3dU)](https://codecov.io/gh/tsmarsh/gridql)

# gridql
Scaffolding for converting event documents into a mesh

GraphQL has a [Conway's Law](https://en.wikipedia.org/wiki/Conway%27s_law) problem: its built by a company that has lots of smaller business units that are controlled, synchronised and presetend by a single umbrella company [Meta](https://about.meta.com). So they solved the distributed nature of GraphQL with a single point of failure [Apollo](https://www.apollographql.com/). 

Apollo has lots of advantages if you didn't start with GraphQL in mind. It does an excellent job presenting ReST and RPC API as GraphQL. So you can quickly experiement with graph design if you're new to the concept. It also 'enhances' your graph with conventional queiry tools that make the api look more like SQL giving your filters and pagination out of the box. But if you've ever built a distributed system you're probably asking questions like:

* How well does this perform?
* What happens when the gateway fails?
* How do the filters work?
* How does it handle dependent system failures?

And of course, it handles them as well as it can, given this architecture: poorly. 

Apollo is a developer tool that gets a poor-to-mid solution to market quickly. Because of that, its very attractive organisations that value time to market over performance. This trade off is nearly always the right solution.

But that's not why we're here. We want to do a native GraphQL solution. An actual GraphQL solution that is genuinely distributed, performant and fast to market. 

This is how you do it.

## To Do

* [X] Graph Nodes
* [X] ReST Server
* [X] Mongo Listener that publishes to kafka
* [X] Bulk ReST API
* [ ] Configurable ID on rest
* [ ] Time aware GraphAPI
* [x] Kafka Listener that pushes to ReST

## Coverage

![coverage](https://codecov.io/gh/tsmarsh/gridql/branch/main/graphs/sunburst.svg?token=b9wLrKB3dU)
