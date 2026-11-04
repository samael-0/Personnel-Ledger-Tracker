import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "";

// Neon HTTP client does not establish a persistent connection on import.
// It executes HTTP queries on-demand when called.
const sql = neon(connectionString);

export const db = drizzle(sql, { schema });

