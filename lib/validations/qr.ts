import { z } from "zod";

export const qrCodeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required").max(100),
  category: z.enum(["payment", "person", "business"]).default("payment"),
  note: z.string().max(250).optional().nullable(),
  decodedText: z.string().optional().nullable(),
  isPinned: z.boolean().default(false),
});

export type QrCodeInput = z.infer<typeof qrCodeSchema>;

