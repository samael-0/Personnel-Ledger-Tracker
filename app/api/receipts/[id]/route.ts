import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { receipts, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const record = await db
      .select()
      .from(receipts)
      .where(and(eq(receipts.id, id), eq(receipts.userId, session.user.id)))
      .limit(1);

    if (record.length === 0) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    const receipt = record[0];
    const buffer = Buffer.isBuffer(receipt.data)
      ? receipt.data
      : Buffer.from(receipt.data);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": receipt.mimeType || "image/jpeg",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error serving receipt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [existing] = await db
      .select({ id: receipts.id })
      .from(receipts)
      .where(and(eq(receipts.id, id), eq(receipts.userId, session.user.id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    // Atomic transaction: unlink from any transactions, then delete receipt image
    await db.transaction(async (tx) => {
      await tx
        .update(transactions)
        .set({ receiptId: null })
        .where(
          and(
            eq(transactions.receiptId, id),
            eq(transactions.userId, session.user.id)
          )
        );

      await tx
        .delete(receipts)
        .where(
          and(
            eq(receipts.id, id),
            eq(receipts.userId, session.user.id)
          )
        );
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error deleting receipt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
