import { defineConfig } from "drizzle-kit";
import fs from "node:fs";

// drizzle-kit runs outside of Next.js, so it does not automatically load .env.local.
// Use Node's built-in process.loadEnvFile to load .env.local or .env.
if (typeof process.loadEnvFile === "function") {
  if (fs.existsSync(".env.local")) {
    process.loadEnvFile(".env.local");
  } else if (fs.existsSync(".env")) {
    process.loadEnvFile(".env");
  }
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
