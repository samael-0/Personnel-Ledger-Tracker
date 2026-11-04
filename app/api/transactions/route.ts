import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { transactions, categories, wallets } from "@/db/schema";
import { eq, and, desc, gte, lte, ilike, or } from "drizzle-orm";
import { transactionSchema } from "@/lib/validations/transactions";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const type = searchParams.get("type");
    const categoryId = searchParams.get("categoryId");
    const walletId = searchParams.get("walletId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const conditions = [eq(transactions.userId, session.user.id)];

    if (type && (type === "income" || type === "expense")) {
      conditions.push(eq(transactions.type, type));
    }

    if (categoryId) {
      conditions.push(eq(transactions.categoryId, categoryId));
    }

    if (walletId) {
      conditions.push(eq(transactions.walletId, walletId));
    }

    if (startDate) {
      conditions.push(gte(transactions.occurredAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(transactions.occurredAt, new Date(endDate)));
    }

    if (search) {
      conditions.push(
        or(
          ilike(transactions.merchant, `%${search}%`),
          ilike(transactions.note, `%${search}%`)
        )!
      );
    }

    const results = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        type: transactions.type,
        amountMinor: transactions.amountMinor,
        currency: transactions.currency,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        walletId: transactions.walletId,
        walletName: wallets.name,
        merchant: transactions.merchant,
        note: transactions.note,
        occurredAt: transactions.occurredAt,
        source: transactions.source,
        receiptId: transactions.receiptId,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(wallets, eq(transactions.walletId, wallets.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.occurredAt))
      .limit(limit);

    return NextResponse.json({ transactions: results });
  } catch (err: unknown) {
    console.warn("Transactions query failed, returning empty list:", err);
    return NextResponse.json({ transactions: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newTx = {
      id: txId,
      userId: session.user.id,
      type: parsed.data.type,
      amountMinor: parsed.data.amountMinor,
      currency: parsed.data.currency,
      categoryId: parsed.data.categoryId,
      walletId: parsed.data.walletId,
      merchant: parsed.data.merchant,
      note: parsed.data.note || null,
      occurredAt: new Date(parsed.data.occurredAt),
      source: parsed.data.source,
      receiptId: parsed.data.receiptId || null,
      createdAt: new Date(),
    };

    await db.insert(transactions).values(newTx);

    return NextResponse.json({ success: true, transaction: newTx });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record transaction";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success || !parsed.data.id) {
      return NextResponse.json(
        { error: "Invalid transaction data or missing ID" },
        { status: 400 }
      );
    }

    await db
      .update(transactions)
      .set({
        type: parsed.data.type,
        amountMinor: parsed.data.amountMinor,
        currency: parsed.data.currency,
        categoryId: parsed.data.categoryId,
        walletId: parsed.data.walletId,
        merchant: parsed.data.merchant,
        note: parsed.data.note || null,
        occurredAt: new Date(parsed.data.occurredAt),
      })
      .where(
        and(
          eq(transactions.id, parsed.data.id),
          eq(transactions.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update transaction";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await db
      .delete(transactions)
      .where(
        and(eq(transactions.id, id), eq(transactions.userId, session.user.id))
      );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete transaction";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

