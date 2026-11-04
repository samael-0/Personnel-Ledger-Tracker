import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z.string().min(16, "BETTER_AUTH_SECRET must be at least 16 chars"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  GEMINI_FALLBACK_MODEL: z.string().optional(),
  SKIP_ENV_VALIDATION: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const raw = {
    DATABASE_URL: process.env.DATABASE_URL || "",
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "pranitpranitpranitpranitalbertalbertalbertalbert",
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    GEMINI_FALLBACK_MODEL: process.env.GEMINI_FALLBACK_MODEL,
    SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION,
  };

  if (process.env.SKIP_ENV_VALIDATION === "1") {
    cachedEnv = raw as Env;
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("Environment warning: placeholder or missing values detected.", parsed.error.format());
    // Fall back without throwing build errors
    cachedEnv = raw as Env;
    return cachedEnv;
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function isGeminiAvailable(): boolean {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return false;
  if (key === "your_gemini_api_key_here" || key.startsWith("placeholder")) return false;
  return key.trim().length > 10;
}
