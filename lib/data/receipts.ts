import { db } from "@/db";
import { receipts, transactions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Returns receipt storage stats (count and total bytes) for a given user.
 */
export async function getUserReceiptStorage(userId: string): Promise<{
  count: number;
  totalBytes: number;
}> {
  try {
    const result = await db
      .select({
        count: sql<number>`count(*)::int`,
        totalBytes: sql<number>`coalesce(sum(${receipts.fileSize}), 0)::int`,
      })
      .from(receipts)
      .where(eq(receipts.userId, userId));

    return {
      count: result[0]?.count || 0,
      totalBytes: result[0]?.totalBytes || 0,
    };
  } catch (e) {
    console.warn("Error getting receipt storage:", e);
    return { count: 0, totalBytes: 0 };
  }
}

/**
 * Safely cleans up orphaned receipts (receipts not referenced by any transaction)
 * that are older than the specified hours threshold (default 24h).
 * This ensures pending uploads or active scans are never touched.
 */
export async function cleanupOrphanedReceipts(olderThanHours = 24): Promise<{
  deletedCount: number;
}> {
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

  const result = await db.execute(sql`
    DELETE FROM receipts
    WHERE created_at < ${cutoff}
      AND id NOT IN (
        SELECT receipt_id FROM transactions WHERE receipt_id IS NOT NULL
      )
  `);

  const deletedCount = (result as any)?.rowCount || 0;
  return { deletedCount };
}

