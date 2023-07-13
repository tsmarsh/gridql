# Kafka Event Consumer

The grid is made up of multiple event stores. We have two primary ways of those events being generated:
* user action
  - HTTP Request via the REST API
* system reaction
  - Taking events from a queue

This modules focuses on the latter.

In principle _all_ we have to do is:
* Take event from queue
* Discriminate based on operation type
* Forward to RestAPI

## TODO

### Features

* [x] Basic happy path
  * [x] CREATE
  * [x] DELETE
  * [x] UPDATE
* [ ] Work with any field as "ID"
* [ ] Split message out of envelope
* [ ] Bulk changes
* [ ] Default to picking up where the group left off
* [ ] Sad path
  * [ ] Dead letter queue
  * [ ] Validation of message
  * [ ] Handling network outages

### NFRs
* [ ] Performance tests
* [ ] Integration test