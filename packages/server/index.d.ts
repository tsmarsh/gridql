import express from 'express';
import { GraphQLSchema } from 'graphql';
import { ValidFunction } from '@gridql/payload-validator';
import {Collection} from "mongodb"; // Assuming this is the correct import for Validator

declare module 'express-serve-static-core' {
    interface Request {
        auth_header?: string;
    }
}

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

export function start(
    url: string,
    port: number,
    graphlettes: Graphlette[],
    restlettes: Restlette[]
): express.Application;

export function init(configFile: string): Promise<AppConfig>;
