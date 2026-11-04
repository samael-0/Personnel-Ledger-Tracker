import { z } from "zod";

export const transactionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["income", "expense"]),
  amountMinor: z.number().int().positive("Amount must be greater than zero"),
  currency: z.string().min(1).default("USD"),
  categoryId: z.string().min(1, "Category is required"),
  walletId: z.string().min(1, "Wallet is required"),
  merchant: z.string().min(1, "Merchant or source is required").max(100),
  note: z.string().max(250).optional().nullable(),
  occurredAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  source: z.enum(["manual", "receipt"]).default("manual"),
  receiptId: z.string().optional().nullable(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(60),
  kind: z.enum(["income", "expense"]),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const walletSchema = z.object({
  name: z.string().min(1, "Wallet name is required").max(60),
  type: z.enum(["cash", "bank", "mobile_wallet", "other"]),
  currency: z.string().min(1).default("USD"),
});

export type WalletInput = z.infer<typeof walletSchema>;

