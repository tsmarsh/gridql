import {
    ChangeStream,
    ChangeStreamDeleteDocument,
    ChangeStreamDocument,
    ChangeStreamInsertDocument,
    ChangeStreamReplaceDocument, ChangeStreamUpdateDocument,
    Collection,
    Document
} from "mongodb";
import {Producer, ProducerRecord, Message as KafkaMessage} from "kafkajs";

let payloads: KafkaMessage[] = [];

type Verb = 'CREATE' | 'DELETE' | 'UPDATE';

const toCRUD = (change: ChangeStreamDocument): Verb => {
    switch (change.operationType){
        case "insert":
            return 'CREATE'
        case "update":
            return 'UPDATE'
        case "delete":
            return 'DELETE';
        default:
            throw new Error("Unexpected Operation")
    }
};

interface Message {
    id: string;
    operation: Verb;
}

const hasFullDocument = (change: ChangeStreamDocument): change is ChangeStreamInsertDocument | ChangeStreamReplaceDocument => 'fullDocument' in change

const hasDocumentKey = (change: ChangeStreamDocument): change is ChangeStreamDeleteDocument | ChangeStreamUpdateDocument => 'documentKey' in change;

const getDocumentId = (change: ChangeStreamDocument, id: keyof Document) : string =>  {
    if (hasFullDocument(change)) {
        return change.fullDocument[id];
    } else if (hasDocumentKey(change)) {
        return change.documentKey[id];
    } else {
        throw Error("Cannot find ID of document")
    }
}


const toPayload = (id: string) => (change: ChangeStreamDocument) => {
    const operationType = toCRUD(change);
    if (operationType === undefined) {
        return null;
    }

    const documentId = getDocumentId(change, id)

    const message: Message = {
        id: documentId.toString(),
        operation: operationType
    };

    return { key: message.id, value: JSON.stringify(message) };
};

interface StartOptions {
    collection: Collection,
    kafkaProducer: Producer,
    topic: string,
    id: string
}
export const start = async (options: StartOptions): Promise<void> => {
    console.log("Starting builder: ", options.collection, options.kafkaProducer, options.topic, options.id)

    const changeStream: ChangeStream = options.collection.watch();

    const processChange = toPayload(options.id);

    changeStream.on("change", async (change: ChangeStreamDocument): Promise<void> => {
        console.log("Change detected:", change);
        let payload = processChange(change);
        if (payload !== null) {
            payloads.push(payload);
        }
        if (payloads.length > 0) {
            let message:ProducerRecord = { topic: options.topic, messages: payloads };
            console.log("Sending: ", JSON.stringify(message));

            await options.kafkaProducer
                .send(message)
                .then(() => console.log("Sent: ", JSON.stringify(message)))
                .catch((reason) => console.log("Can't send: ", reason));
            payloads = [];
        }
    });
};
