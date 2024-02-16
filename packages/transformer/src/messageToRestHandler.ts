import {EventHandler} from "./eventhandler";
class MessageToReSTHandler<T> implements EventHandler<T>{
    constructor() {
    }
    onCreate(message: <T>): Promise<void> {
        return Promise.resolve(undefined);
    }

    onDelete(message: <T>): Promise<void> {
        return Promise.resolve(undefined);
    }

    onUpdate(message: <T>): Promise<void> {
        return Promise.resolve(undefined);
    }

}