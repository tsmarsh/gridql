import { Application } from "express";
import { Graphlette, Restlette } from "./lib/config";

declare module "express-serve-static-core" {
  interface Request {
    auth_header?: string;
  }
}

export function start(
  url: string,
  port: number,
  graphlettes: Graphlette[],
  restlettes: Restlette[],
): Application;
