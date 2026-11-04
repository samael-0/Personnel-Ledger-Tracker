import { z } from "zod";

export const transactionSchema = z
  .object({
    id: z.string().optional(),
    type: z.enum(["income", "expense", "transfer"]),
    amountMinor: z.number().int().positive("Amount must be greater than zero"),
    currency: z.string().min(1).default("USD"),
    categoryId: z.string().optional().nullable(),
    walletId: z.string().min(1, "Account is required"),
    toWalletId: z.string().optional().nullable(),
    toAmountMinor: z.number().int().positive().optional().nullable(),
    transferFeeMinor: z.number().int().min(0).default(0),
    merchant: z.string().min(1, "Merchant or title is required").max(100),
    note: z.string().max(250).optional().nullable(),
    occurredAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
    source: z.enum(["manual", "receipt"]).default("manual"),
    receiptId: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "transfer") {
      if (!data.toWalletId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Destination account is required for transfers",
          path: ["toWalletId"],
        });
      } else if (data.walletId === data.toWalletId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Transfer from and to account cannot be the same",
          path: ["toWalletId"],
        });
      }
    } else {
      if (!data.categoryId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Category is required",
          path: ["categoryId"],
        });
      }
    }
  });

export type TransactionInput = z.infer<typeof transactionSchema>;

export const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Category name is required").max(60),
  kind: z.enum(["income", "expense"]),
  icon: z.string().max(30).optional().nullable(),
  isArchived: z.boolean().default(false),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const mergeCategorySchema = z.object({
  fromCategoryId: z.string().min(1, "Source category is required"),
  toCategoryId: z.string().min(1, "Destination category is required"),
});

export type MergeCategoryInput = z.infer<typeof mergeCategorySchema>;

export const walletSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Account name is required").max(60),
  type: z.enum(["bank", "cash", "mobile_wallet", "card", "other"]),
  currency: z.string().min(1).max(5).default("USD"),
  openingBalanceMinor: z.number().int().default(0),
  isDefault: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  accountNumberLast4: z
    .string()
    .regex(/^\d{1,4}$/, "Must be up to 4 digits")
    .optional()
    .nullable()
    .or(z.literal("")),
  note: z.string().max(250).optional().nullable(),
});

export type WalletInput = z.infer<typeof walletSchema>;
export type AccountInput = WalletInput;
