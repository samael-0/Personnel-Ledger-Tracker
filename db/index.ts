import { Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "./schema.ts";

declare global {
  // eslint-disable-next-line no-var
  var __neonPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __drizzleDb: NeonDatabase<typeof schema> | undefined;
}

function getPool(): Pool {
  if (!globalThis.__neonPool) {
    const connectionString = process.env.DATABASE_URL || "";
    globalThis.__neonPool = new Pool({ connectionString });
  }
  return globalThis.__neonPool;
}

export function getDb(): NeonDatabase<typeof schema> {
  if (!globalThis.__drizzleDb) {
    const pool = getPool();
    globalThis.__drizzleDb = drizzle(pool, { schema });
  }
  return globalThis.__drizzleDb;
}

export const db = new Proxy({} as NeonDatabase<typeof schema>, {
  get(_target, prop) {
    const client = getDb();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
  has(_target, prop) {
    return Reflect.has(getDb(), prop);
  },
  getPrototypeOf(_target) {
    return Reflect.getPrototypeOf(getDb());
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(getDb(), prop);
  },
  ownKeys(_target) {
    return Reflect.ownKeys(getDb());
  },
});
