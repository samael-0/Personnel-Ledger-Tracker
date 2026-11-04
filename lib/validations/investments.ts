import { z } from "zod";

export const investmentTypeEnum = z.enum([
  "stock",
  "gold",
  "property",
  "business",
  "other",
]);

export const investmentSchema = z.object({
  id: z.string().optional(),
  type: investmentTypeEnum,
  name: z.string().min(1, "Asset name is required").max(100),
  quantity: z.string().min(1, "Quantity is required"),
  unit: z.string().optional().nullable(),
  purchasePriceMinor: z
    .number()
    .int()
    .nonnegative("Purchase price must be positive or zero"),
  purchaseDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  currentValueMinor: z
    .number()
    .int()
    .nonnegative("Current valuation must be positive or zero"),
  currency: z.string().min(1).default("USD"),
  notes: z.string().max(300).optional().nullable(),
  // Type-specific fields
  ticker: z.string().optional().nullable(),
  shares: z.string().optional().nullable(),
  weight: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  area: z.string().optional().nullable(),
  ownershipPercentage: z.string().optional().nullable(),
});

export type InvestmentInput = z.infer<typeof investmentSchema>;

export const valuationUpdateSchema = z.object({
  investmentId: z.string().min(1),
  newCurrentValueMinor: z.number().int().nonnegative(),
  note: z.string().optional().nullable(),
  occurredAt: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
    .optional(),
});

export type ValuationUpdateInput = z.infer<typeof valuationUpdateSchema>;

