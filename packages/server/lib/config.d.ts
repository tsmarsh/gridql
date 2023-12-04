import {GraphQLSchema} from "graphql/index";
import {Collection} from "mongodb";
import {ValidFunction} from "@gridql/payload-validator";

export interface Graphlette {
    path: string;
    graph: {
        schema: GraphQLSchema;
        root: any; // Replace 'any' with the actual type
    };
}

export interface Restlette {
    path: string;
    db: Collection;
    validator: ValidFunction;
    schema: any; // Replace 'any' with the actual JSON schema type
}

export interface AppConfig {
    url: string;
    port: number;
    graphlettes: Graphlette[];
    restlettes: Restlette[];
}

export function parse(configFile: string): Promise<AppConfig>;

export function process_graphlettes(config: any): Promise<Graphlette>;

export function process_restlettes(config: any): Promise<Restlette>;