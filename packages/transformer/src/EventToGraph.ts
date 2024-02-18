import {EventHandler} from "./eventhandler";
import { useQuery } from '@apollo/client';
import {buildSchema} from "graphql/utilities";
import {GraphQLSchema} from "graphql/type";
import {Message} from "./model/message";

export interface EventToGraphConfig {
    schema: string;
    onCreate?: string;
    onDelete?: string;
    onUpdate?: string;
}

export class EventToGraph<T> implements EventHandler<T> {
    schema: GraphQLSchema;

    constructor(public config: EventToGraphConfig) {
        this.schema = buildSchema(config.schema)
    }

    onCreate(message: Message<T>): Promise<void> {
        if("onCreate" in this.config){
            useQuery(this.config.onCreate!, {id, message.id})
        }

        return Promise.resolve(undefined);
    }

    onDelete(message: Message<T>): Promise<void> {
        if("onDelete" in this.config){

        }
        return Promise.resolve(undefined);
    }

    onUpdate(message: Message<T>): Promise<void> {
        if("onUpdate" in this.config){

        }
        return Promise.resolve(undefined);
    }

}