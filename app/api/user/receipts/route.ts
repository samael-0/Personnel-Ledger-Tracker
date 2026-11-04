import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { receipts, transactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserReceiptStorage } from "@/lib/data/receipts";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storage = await getUserReceiptStorage(session.user.id);
    return NextResponse.json(storage);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching receipt storage";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Atomic transaction: unlink from all user transactions, then delete all user receipts
    await db.transaction(async (tx) => {
      await tx
        .update(transactions)
        .set({ receiptId: null })
        .where(eq(transactions.userId, session.user.id));

      await tx
        .delete(receipts)
        .where(eq(receipts.userId, session.user.id));
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error deleting receipts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

