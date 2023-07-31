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

## Components

### [Server](packages/server/README.md)

#### Restlettes

Responsible for event recording. They own the model, and are the only component allowed to write to the data store. 

The provide a simple, and consistent way to store events. Simply define the swagger that describes the payload, and point them at a datastore.

You can use them for data retrieval, but just the state that you stored. No querying, no pulling data from other services.

#### Graphlettes

Responsible for turning a rag tag collection of restlettes and turning them into a mesh. 

Each graphlette presents the world with its own view of the data starting from the data in its restlette:

`N Restlettes == N Graphlettes`

The are the primary means for extracting data from the system.

#### Microliths

[Monoliths](https://en.wikipedia.org/wiki/Monolithic_application) get a bad wrap. Given enough time they tend towards [Big Ball of Mud](https://blog.codinghorror.com/the-big-ball-of-mud-and-other-architectural-disasters/) We like to talk about [S.O.L.I.D.](https://en.wikipedia.org/wiki/SOLID) 
and [Object Orientated Programming](https://en.wikipedia.org/wiki/Object-oriented_programming) as techniques to prevent this from happening, but the reality is that they, at best, delay this inevitability. The issue is less with how we build them, and more to do with how we use them. Success breeds more users, more users have more diverse demands, eventually the model on which the monolith is built breaks and the cost to make changes increases exponentially.

[Microservices](https://en.wikipedia.org/wiki/Microservices) go in the other direction by moving objects into network. Surprisingly, its much easier to follow S.O.L.I.D. principals by building a series of black box services that agree on a common way of sharing information. But microservices push the complexity into the service and network layer.  

We're taking a middle path. Composing monoliths with microservices.

We don't know your data or usage pattern. What we do know is that bundling multiple microservices in to a single service makes a lot of things easier.

Perfectly valid microliths:

* A server per graphlette and restlette: true microservice
* A single server with all graphlettes and restlettes: microlith
* All graphlettes in one server, all restlettes in another
* Low traffic xLettes in a microlith, high traffic xLettes in their own microservices. 

We don't know what makes sense for you, but we have made it as easy as possible to change your mind.

We'd heavily recommend starting out with everything in a single microlith, then using data to figure out the best way to break it apart... and if you're wrong, merge them back together.

### [Mongo Event Builder](packages/mongo-event-builder/README.md)

Its all very well having a means for an application to get data out of the system. But how can you inform other parts of the system that your data has changed?

Kafka, you use kafka.

This component attaches to your [Mongo Replica Set](https://www.mongodb.com/docs/manual/replication/) and creates light weight events on public topics. 

Other services are encouraged to consume those topics and then call the graph api to get the data they need to update their data.

#### Example

> Applications are only allowed to present data that is owner by the user they represent.

In a simple case, the `authorized_users` is simply the user that created the event, but its not unusual for resources to be access by groups of users of certain roles.

So if we have a `User` service an `Account` service and a `Group` service that describes the `Role` and a list of `User` in that `Group`.

All services maintain a list of `authorized_users` but how users get into that list is an exercise for the system. 

In this example, lets assume that we want all of the users in a group to be in the list of `authorized_users`.

To achieve this we create a consumer that listens to `Group`s topic, call the groups graph to figure out the current list of users, then modify the `Account`s `authorized_user` list. Of course we may choose to listen to multiple groups, or even multiple services.



### [Kafka Event Consumer](packages/kafka-event-consumer/README.md)

If an application needs to create an event, calling the restlettes makes the most sense. But what if the data is coming from inside of the enterprise?

In that instance we'd recommend creating an 'input topic' that keeps the data in same format as the restlette is expecting then using a `Kafka Event Consumer` to call the restlettes (single writer).

Only this component should read from the topic (it is private).

We don't know or care how events get into this topic, but we'd recommend something like:

```
System of Record => Change Data Capture => public topic => ksql => private topic => event consumer
```

### Utilities

#### [Payload Generator](packages/payload-generator/README.md)

You went to the effort of creating json schema to describe your payloads... might as well use it to generate you test data.

#### [Payload Validator](packages/payload-generator/README.md)

Simple wrapper around json-schema to validate payloads. 

**You're probably better off using your own module.**

#### [Mongo Connector](packages/mongo-connector/README.md)

Mongo does an excellent job of retrying if a connection is lost, but out of the box it won't retry an initial connection. 

This is not a hard problem to solve, this is how we solved.

**You're probably better off using your own module.**

## Example App

[MicroBlog](https://github.com/tsmarsh/microblog) is a very quick an dirty 'Twitter Clone' to demonstrate how you can use this library for rapid role out of a data layer.

## To Do

* [X] Graph Nodes
* [X] ReST Server
* [X] Mongo Listener that publishes to kafka
* [X] Bulk ReST API
* [X] Time aware GraphAPI
* [X] Auth
  * [X] ReST
  * [X] Graph
* [x] Kafka Listener that pushes to ReST

## Coverage

![coverage](https://codecov.io/gh/tsmarsh/gridql/branch/main/graphs/sunburst.svg?token=b9wLrKB3dU)
