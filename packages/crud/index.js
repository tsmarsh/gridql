const cors = require("cors");
const {ObjectId} = require("mongodb");
const {getSub, authorizer} = require("authoriser");

const calculateReaders = (doc, sub) => {
    const readers = new Set();

    if(sub !== null){
        readers.add(sub);
    }
    if("object_id" in doc){
        readers.add(doc.object_id);
    }

    return [... readers]
}

const create = (db, valid, context) => async (req, res) => {
    const doc = req.body;

    doc._authorized_readers = calculateReaders(doc, getSub(req.headers.authorization));

    const result = await db.insertOne(doc).catch(err => console.log(err));

    res.redirect(`/${context}/${result.insertedId}`);
};

const read = db => async (req, res) => {
    const result = await db.findOne({_id: ObjectId(req.params.id)})
    if (result !== null) {
            res.json(result);
    } else {
        res.status(404);
        res.json({})
    }
};

const update = (db, valid) => async (req, res) => {
    const doc = req.body;
    let {_id, ...mongo_body} = doc

    if (valid(doc)) {
        await db.replaceOne({_id: ObjectId(req.params.id)}, mongo_body).then(() => {
            res.json(doc)
        }).catch(err => console.log(err));
    }
};

const remove = (db, emit) => async (req, res) => {
    await db.deleteOne({_id: ObjectId(req.params.id)}).catch(err => console.log(err))

    res.json({"deleted": req.params.id})
};


const init = (context, app, db, validate, emit) => {
    app.use(cors());
    app.use(`/${context}/:id`, authorizer({collection: db, authorisers: "_authorized_readers"});

    app.post(`/${context}`, create(db, validate, emit, context));

    app.get(`/${context}/:id`, read(db));

    app.put(`/${context}/:id`, update(db, validate, emit));

    app.delete(`/${context}/:id`, remove(db, emit));

    return app;
}

module.exports = {
    init, calculateReaders
}