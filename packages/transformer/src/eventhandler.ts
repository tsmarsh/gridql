import {Message} from "./model/payload";

export interface EventHandler<T> {
    onCreate(message: Message<T>): Promise<void>;
    onUpdate(message: Message<T>): Promise<void>;
    onDelete(message: Message<T>): Promise<void>;
}