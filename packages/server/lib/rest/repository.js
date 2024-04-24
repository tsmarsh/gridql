import { v4 as uuid } from "uuid";
import Log4js from "log4js";

let logger = Log4js.getLogger("gridql/server");
export class PayloadRepository {
  constructor(db, valid) {
    this.db = db;
    this.valid = valid;
  }

  create = async (doc) => {
    doc.createdAt = new Date();

    if(!Object.hasOwnProperty.call(doc, "id")) {
      doc.id = uuid();
    }

    if (this.valid(doc.payload)) {
      doc.authorized_readers = subscriber === null ? [] : [subscriber];

      await this.db.insertOne(doc, {
        writeConcern: { w: "majority" },
      });
      return id;
    }
  };

  createMany = async (clean_docs) => {
    let createdAt = new Date();
    let docs = clean_docs.map((payload) => ({
      payload,
      createdAt,
      id: uuid()
    }));

    let v = { OK: [], BAD_REQUEST: [] };

    let good = [];

    docs.forEach((doc) => {
      if (this.valid(doc.payload)) {
        v.OK.push(doc.id);
        good.push(doc);
      } else {
        v.BAD_REQUEST.push(doc.payload);
      }
    });

    try {
      await this.db.insertMany(good);
    } catch (e) {
      logger.error(JSON.stringify(e, null, 2));
    }

    return v;
  };

  read = async (id, isAuthorized, { createdAt = new Date() }) => {
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
      logger.error(`Can't read: ${JSON.stringify(err)}`);
    }

    return results[0];
  };

  readMany = async (ids, secureRead) => {
    let match = secureRead({
      id: { $in: ids },
      deleted: { $exists: false },
    });

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
      logger.error(`Error listing: ${JSON.stringify(err, null, 2)}`);
    }

    let authorized_results = results.filter((r) => isAuthorized(r));
    return results.map((r) => r.id);
  };
  remove = async (id) => {
    await this.db.updateMany({ id }, { $set: { deleted: true } });
  };

  removeMany = async (ids) => {
    await this.db.updateMany({ id: { $in: ids } }, { $set: { deleted: true } });
  };

  list = async (secureRead) => {
    let match = secureRead({ deleted: { $exists: false } });
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
      logger.error(`Error listing:  ${JSON.stringify(err)}`);
    }

    return results.map((r) => r.id);
  };
}
