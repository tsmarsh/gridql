import { Schema } from 'jsonschema';

export type ValidFunction = (payload: any) => boolean;

export function valid(schema: Schema): ValidFunction;