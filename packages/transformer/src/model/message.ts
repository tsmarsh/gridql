export enum Operation {
    CREATE="CREATE", UPDATE="UPDATE", DELETE="DELETE"
}
export class Message<T>{
    constructor(id: string, operation: Operation, payload: T) {
        this.id = id
        this.operation = operation
        this.payload = payload
    }

    public id: string
    public operation: Operation
    public payload: T
}