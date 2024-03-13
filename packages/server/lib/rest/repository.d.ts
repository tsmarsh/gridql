import { Collection } from "mongodb";
import { ValidFunction } from "@gridql/payload-validator";

type Subscriber = string | null;
type Payload = any;

interface CreateOptions {
  id?: string;
  subscriber?: Subscriber;
}

interface ReadOptions {
  createdAt?: Date;
}

interface ReadManyOptions extends ReadOptions {
  subscriber?: Subscriber;
}

interface CreateManyOptions {
  subscriber?: Subscriber;
}

interface ValidationResult {
  OK: string[];
  BAD_REQUEST: any[];
}

declare class PayloadRepository {
  constructor(db: Collection, valid: ValidFunction);

  create(payload: Payload, options: CreateOptions): Promise<string | undefined>;
  createMany(
    payloads: Payload[],
    options: CreateManyOptions,
  ): Promise<ValidationResult>;
  read(id: string, options: ReadOptions): Promise<Payload | undefined>;
  readMany(ids: string[], options: ReadManyOptions): Promise<string[]>;
  remove(id: string): Promise<void>;
  removeMany(ids: string[]): Promise<void>;
  list(subscriber: Subscriber): Promise<string[]>;
}

export { PayloadRepository };
