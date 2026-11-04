import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";

function getBaseUrl(): string {
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

const resolvedBaseUrl = getBaseUrl();
const isHttps = resolvedBaseUrl.startsWith("https://") || Boolean(process.env.VERCEL);

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
  // Allow connections from localhost, local Wi-Fi, and Vercel domains
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.*:*",
    "http://192.168.*.*:*",
    "http://10.*:*",
    "http://10.*.*.*:*",
    "http://172.*:*",
    "http://172.*.*.*:*",
    "https://*.vercel.app",
    "https://*-*.vercel.app",
    resolvedBaseUrl,
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL.replace(/\/$/, "")] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
      : []),
  ],
  advanced: {
    useSecureCookies:
      process.env.NODE_ENV === "production" &&
      (isHttps || Boolean(process.env.VERCEL)),
  },
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "pranitpranitpranitpranitalbertalbertalbertalbert",
  baseURL: resolvedBaseUrl,
});
