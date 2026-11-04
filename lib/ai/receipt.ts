import { z } from "zod";
import { isGeminiAvailable } from "@/lib/env";
import { GoogleGenAI } from "@google/genai";

export const receiptExtractSchema = z.object({
  type: z.enum(["expense", "income"]).default("expense"),
  merchant: z.string().default("Unknown Merchant"),
  total: z.number().default(0),
  currency: z.string().default("USD"),
  date: z.string().default(() => new Date().toISOString().split("T")[0]),
  category_suggestion: z.string().default("Groceries"),
  line_items: z
    .array(
      z.object({
        name: z.string(),
        qty: z.number().default(1),
        price: z.number().default(0),
      })
    )
    .default([]),
  confidence: z.number().min(0).max(1).default(0.5),
  is_blurry: z.boolean().default(false),
  is_receipt: z.boolean().default(true),
  missing_date: z.boolean().default(false),
  multiple_currencies: z.boolean().default(false),
  notes: z.string().optional(),
});

export type ReceiptExtractResult = z.infer<typeof receiptExtractSchema>;

export interface ExtractReceiptResult {
  data: ReceiptExtractResult;
  fallbackUsed: boolean;
  allModelsFailed?: boolean;
  message?: string;
}

const EXTRACTION_PROMPT = `
You are a precision optical receipt parser. Examine this image carefully.
Extract the transaction details and return ONLY a valid JSON object with these keys:
{
  "type": "expense",
  "merchant": "Exact business/store name",
  "total": numeric total paid (e.g. 24.50),
  "currency": "USD" or detected 3-letter currency code,
  "date": "YYYY-MM-DD" (if missing or unreadable, set today's date and set missing_date: true),
  "category_suggestion": "Food & Dining" | "Groceries" | "Transportation & Fuel" | "Utilities & Bills" | "Entertainment & Leisure" | "Healthcare & Medical" | "Shopping & Supplies" | "Other Expense",
  "line_items": [
    { "name": "item description", "qty": 1, "price": 4.50 }
  ],
  "confidence": float between 0.0 and 1.0 (overall confidence in accuracy),
  "is_blurry": boolean (true if image is out of focus or degraded),
  "is_receipt": boolean (true if this is a receipt or invoice, false if unrelated photo),
  "missing_date": boolean,
  "multiple_currencies": boolean
}
Return ONLY pure JSON. Do not wrap in markdown quotes if possible, or use standard json formatting.
`;

function extractStatusCode(err: unknown): number | null {
  if (!err || typeof err !== "object") return null;
  const anyErr = err as Record<string, any>;
  if (typeof anyErr.status === "number") return anyErr.status;
  if (typeof anyErr.statusCode === "number") return anyErr.statusCode;
  if (typeof anyErr.code === "number") return anyErr.code;
  if (typeof anyErr.message === "string") {
    try {
      const parsed = JSON.parse(anyErr.message);
      if (parsed?.error?.code && typeof parsed.error.code === "number") {
        return parsed.error.code;
      }
    } catch {
      const match =
        anyErr.message.match(/"code":\s*(\d{3})/) ||
        anyErr.message.match(/\b(400|401|404|429|500|502|503|504)\b/);
      if (match) return parseInt(match[1], 10);
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBackoffDelayMs(attempt: number): number {
  // Exponential backoff: ~1s on attempt 1, ~2s on attempt 2, ~4s on attempt 3, plus jitter
  const base = 1000 * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 400;
  return base + jitter;
}

function getDefaultReceiptData(notes?: string): ReceiptExtractResult {
  return {
    type: "expense",
    merchant: "",
    total: 0,
    currency: "USD",
    date: new Date().toISOString().split("T")[0],
    category_suggestion: "Shopping & Supplies",
    line_items: [],
    confidence: 0,
    is_blurry: false,
    is_receipt: true,
    missing_date: true,
    multiple_currencies: false,
    notes: notes || "",
  };
}

export async function extractReceiptFromImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ExtractReceiptResult> {
  // Graceful fallback if Gemini API key is missing or placeholder
  if (!isGeminiAvailable()) {
    return {
      data: getDefaultReceiptData(
        "Gemini API key is not configured. Please fill in fields manually."
      ),
      fallbackUsed: true,
      allModelsFailed: true,
      message:
        "Gemini API key is not configured or is a placeholder. Please verify receipt details manually.",
    };
  }

  const primaryModel = process.env.GEMINI_MODEL?.trim();
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL?.trim();

  if (!primaryModel) {
    console.error(
      "[AI Receipt Extraction] Model: none, Status: 400 - Update GEMINI_MODEL in env"
    );
    throw new Error(
      "GEMINI_MODEL environment variable is not configured. Update GEMINI_MODEL in env."
    );
  }

  const modelsToTry: Array<{ name: string; isPrimary: boolean }> = [
    { name: primaryModel, isPrimary: true },
  ];

  if (fallbackModel && fallbackModel !== primaryModel) {
    modelsToTry.push({ name: fallbackModel, isPrimary: false });
  }

  const apiKey = process.env.GEMINI_API_KEY!;
  const ai = new GoogleGenAI({ apiKey });
  const base64Data = imageBuffer.toString("base64");

  for (const currentModel of modelsToTry) {
    const modelName = currentModel.name;

    // Retry loop for the current model: handles 503 and 429 with backoff (up to 3 attempts)
    let callAttempt = 0;
    let modelExhausted = false;

    while (callAttempt < 3 && !modelExhausted) {
      callAttempt++;

      // Parsing retry loop: single parse-failure retry (attempt 1, then retry once if invalid JSON)
      let parseAttempt = 0;
      let modelReturnedValidResponse = false;

      while (parseAttempt < 2) {
        parseAttempt++;
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: "user",
                parts: [
                  { text: EXTRACTION_PROMPT },
                  {
                    inlineData: {
                      mimeType: mimeType || "image/jpeg",
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
          });

          const text = response.text || "";
          const cleaned = text
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();
          const parsedJson = JSON.parse(cleaned);
          const validated = receiptExtractSchema.parse(parsedJson);

          return {
            data: validated,
            fallbackUsed: !currentModel.isPrimary,
          };
        } catch (err: unknown) {
          const statusCode = extractStatusCode(err);

          // If error is from model API call (has status code or HTTP failure)
          if (statusCode !== null) {
            // Log failure with model name and status code only (never image or API key)
            console.error(
              `[AI Receipt Extraction] Model: ${modelName}, Status: ${statusCode}`
            );

            // Rule: 400 and 401 - do not retry, do not fall back. Return clear error.
            if (statusCode === 400 || statusCode === 401) {
              const errMsg =
                statusCode === 401
                  ? "Gemini authentication failed (401 Unauthorized). Please check your GEMINI_API_KEY."
                  : `Gemini API rejected request (400 Bad Request): ${
                      err instanceof Error ? err.message : "Invalid parameters"
                    }`;
              const terminalError = new Error(errMsg);
              (terminalError as any).statusCode = statusCode;
              throw terminalError;
            }

            // Rule: 404 (model retired or not found) - do not retry. Move to fallback immediately and log.
            if (statusCode === 404) {
              console.warn(
                `[AI Receipt Extraction] Model: ${modelName}, Status: 404 - Update GEMINI_MODEL in env`
              );
              modelExhausted = true;
              break; // exit retry loop for this model
            }

            // Rule: 503 and 429 - retry with exponential backoff and jitter up to 3 attempts
            if (statusCode === 503 || statusCode === 429) {
              if (callAttempt < 3) {
                const delayMs = getBackoffDelayMs(callAttempt);
                console.warn(
                  `[AI Receipt Extraction] Model: ${modelName}, Status: ${statusCode}. Retrying in ${Math.round(
                    delayMs
                  )}ms (attempt ${callAttempt}/3)...`
                );
                await sleep(delayMs);
                break; // break parse loop and execute next callAttempt
              } else {
                console.warn(
                  `[AI Receipt Extraction] Model: ${modelName}, Status: ${statusCode}. Attempts exhausted.`
                );
                modelExhausted = true;
                break;
              }
            }

            // Other HTTP/network error: log and move to fallback
            console.error(
              `[AI Receipt Extraction] Model: ${modelName}, Status: ${statusCode}. Moving to next model.`
            );
            modelExhausted = true;
            break;
          }

          // Non-HTTP error: JSON parsing or Zod schema validation error
          console.warn(
            `[AI Receipt Extraction] Model: ${modelName}, Status: parse_error (parse attempt ${parseAttempt}/2)`
          );

          if (parseAttempt < 2) {
            // Single parse-failure retry: loop again to re-call model
            continue;
          } else {
            // Parse retry exhausted for this model
            modelExhausted = true;
            break;
          }
        }
      }

      if (modelReturnedValidResponse) {
        break;
      }
    }
  }

  // All models failed
  console.error(
    `[AI Receipt Extraction] All models failed. Falling back to manual entry.`
  );

  return {
    data: getDefaultReceiptData(
      "Scanning is busy right now. Enter it manually or try again."
    ),
    fallbackUsed: true,
    allModelsFailed: true,
    message: "Scanning is busy right now. Enter it manually or try again",
  };
}
