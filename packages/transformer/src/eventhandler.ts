import {Message} from "./model/message";

export interface EventHandler<T> {
    onCreate(message: Message<T>): Promise<void>;
    onUpdate(message: Message<T>): Promise<void>;
    onDelete(message: Message<T>): Promise<void>;
}