import { MongoClientOptions, Collection } from "mongodb";

interface MongoConfig {
    uri: string;
    options?: MongoClientOptions;
    db: string;
    collection: string;
}

interface DbBuilder {
    (mongo: MongoConfig): Promise<Collection>;
}

export const buildDb: DbBuilder;