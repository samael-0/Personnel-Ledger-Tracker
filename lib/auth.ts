import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      currency: {
        type: "string",
        defaultValue: "USD",
        required: false,
      },
    },
  },
  // Allow connections from local network IPs (e.g. testing from mobile over Wi-Fi)
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.*:*",
    "http://192.168.*.*:*",
    "http://10.*:*",
    "http://10.*.*.*:*",
    "http://172.*:*",
    "http://172.*.*.*:*",
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
  ],
  advanced: {
    // Only use secure cookies if explicitly served over HTTPS in production
    useSecureCookies:
      process.env.NODE_ENV === "production" &&
      Boolean(process.env.BETTER_AUTH_URL?.startsWith("https://")),
  },
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "pranitpranitpranitpranitalbertalbertalbertalbert",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});
