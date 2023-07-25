const { v4: uuid } = require("uuid");

class PayloadRepository {
  constructor(db, valid) {
    this.db = db;
    this.valid = valid;
  }

  create = async (payload, { id = uuid(), subscriber = null }) => {
    let doc = {
      payload,
      createdAt: Date.now(),
      id,
    };

    if (this.valid(payload)) {
      doc.authorized_readers = subscriber === null ? [] : [subscriber];

      await this.db.insertOne(doc, {
        writeConcern: { w: "majority" },
      });
      return id;
    }
  };

  read = async (id, { createdAt = Date.now() }) => {
    let results;
    try {
      results = await this.db
        .find({
          id: id,
          createdAt: { $lt: createdAt },
          deleted: { $exists: false },
        })
        .sort({ createdAt: -1 })
        .toArray();
    } catch (err) {
      console.log("Can't read: ", err);
    }

    //console.log("Reading: " + JSON.stringify(results));
    return results[0];
  };

  remove = (id) => {
    return this.db.updateMany({ id }, { $set: { deleted: true } });
  };

  list = async (subscriber) => {
    let match = { deleted: { $exists: false } };

    if (subscriber !== undefined && subscriber !== null) {
      match.authorized_readers = { $in: [subscriber] };
    }

    let results = [];
    try {
      results = await this.db
        .aggregate([
          {
            $match: match,
          },
          {
            $sort: { createdAt: -1 },
          },
          {
            $group: {
              _id: "$id",
              doc: { $first: "$$ROOT" },
            },
          },
          {
            $replaceRoot: { newRoot: "$doc" },
          },
        ])
        .toArray();
    } catch (err) {
      console.log("Error listing: ", err);
    }

    return results.map((r) => r.id);
  };
}

module.exports = {
  PayloadRepository,
};
