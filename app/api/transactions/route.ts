import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { transactions, categories, wallets } from "@/db/schema";
import { eq, and, desc, gte, lte, ilike, or, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { transactionSchema } from "@/lib/validations/transactions";
import { DEFAULT_CATEGORIES } from "@/lib/data/defaults";

const toWallets = alias(wallets, "to_wallets");

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

    if (type && (type === "income" || type === "expense" || type === "transfer")) {
      conditions.push(eq(transactions.type, type));
    }

    if (categoryId) {
      conditions.push(eq(transactions.categoryId, categoryId));
    }

    if (walletId) {
      // Account filter matches if the account was the source or destination
      conditions.push(
        or(
          eq(transactions.walletId, walletId),
          eq(transactions.toWalletId, walletId)
        )!
      );
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
        categoryIcon: categories.icon,
        walletId: transactions.walletId,
        walletName: wallets.name,
        toWalletId: transactions.toWalletId,
        toWalletName: toWallets.name,
        toAmountMinor: transactions.toAmountMinor,
        transferFeeMinor: transactions.transferFeeMinor,
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
      .leftJoin(toWallets, eq(transactions.toWalletId, toWallets.id))
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

    const {
      type,
      amountMinor,
      currency,
      categoryId,
      walletId,
      toWalletId,
      toAmountMinor,
      transferFeeMinor,
      merchant,
      note,
      occurredAt,
      source,
      receiptId,
    } = parsed.data;

    // Verify source account belongs to authenticated user
    const [sourceAccount] = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.id, walletId), eq(wallets.userId, session.user.id)));

    if (!sourceAccount) {
      return NextResponse.json(
        { error: "Selected source account not found or access denied" },
        { status: 400 }
      );
    }

    let toAccountName = "";
    if (type === "transfer") {
      if (!toWalletId || toWalletId === walletId) {
        return NextResponse.json(
          { error: "Transfer must have distinct source and destination accounts" },
          { status: 400 }
        );
      }

      // Verify destination account belongs to user
      const [destAccount] = await db
        .select()
        .from(wallets)
        .where(and(eq(wallets.id, toWalletId), eq(wallets.userId, session.user.id)));

      if (!destAccount) {
        return NextResponse.json(
          { error: "Destination account not found or access denied" },
          { status: 400 }
        );
      }
      toAccountName = destAccount.name;

      // If currencies differ, require toAmountMinor
      if (sourceAccount.currency !== destAccount.currency && !toAmountMinor) {
        return NextResponse.json(
          {
            error: `Transfer between different currencies (${sourceAccount.currency} to ${destAccount.currency}) requires destination amount.`,
          },
          { status: 400 }
        );
      }
    } else {
      // For income or expense, verify category belongs to user or is shared default
      if (categoryId) {
        let [cat] = await db
          .select()
          .from(categories)
          .where(
            and(
              eq(categories.id, categoryId),
              or(eq(categories.userId, session.user.id), isNull(categories.userId))
            )
          );

        if (!cat) {
          const defaultCat = DEFAULT_CATEGORIES.find((c) => c.id === categoryId);
          if (defaultCat) {
            try {
              await db
                .insert(categories)
                .values({
                  id: defaultCat.id,
                  userId: null,
                  name: defaultCat.name,
                  kind: defaultCat.kind,
                  icon: defaultCat.icon,
                  isArchived: false,
                  createdAt: new Date(),
                })
                .onConflictDoNothing();

              [cat] = await db
                .select()
                .from(categories)
                .where(eq(categories.id, categoryId));
            } catch (seedErr) {
              console.warn("Auto-seed category error:", seedErr);
            }
          }
        }

        if (!cat) {
          return NextResponse.json(
            { error: "Selected category not found or access denied" },
            { status: 400 }
          );
        }
      }
    }

    const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newTx = {
      id: txId,
      userId: session.user.id,
      type,
      amountMinor,
      currency: sourceAccount.currency || currency,
      categoryId: type === "transfer" ? null : categoryId || null,
      walletId,
      toWalletId: type === "transfer" ? toWalletId || null : null,
      toAmountMinor: type === "transfer" ? toAmountMinor || null : null,
      transferFeeMinor: type === "transfer" ? transferFeeMinor || 0 : 0,
      merchant:
        type === "transfer" && merchant === "Transfer"
          ? `Transfer to ${toAccountName || "Account"}`
          : merchant,
      note: note || null,
      occurredAt: new Date(occurredAt),
      source,
      receiptId: receiptId || null,
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

    const {
      id,
      type,
      amountMinor,
      currency,
      categoryId,
      walletId,
      toWalletId,
      toAmountMinor,
      transferFeeMinor,
      merchant,
      note,
      occurredAt,
    } = parsed.data;

    // Verify existing transaction belongs to user
    const [existing] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, session.user.id)));

    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Verify source account belongs to user
    const [sourceAccount] = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.id, walletId), eq(wallets.userId, session.user.id)));

    if (!sourceAccount) {
      return NextResponse.json({ error: "Source account not found" }, { status: 400 });
    }

    if (type === "transfer") {
      if (!toWalletId || toWalletId === walletId) {
        return NextResponse.json(
          { error: "Transfer must have distinct source and destination accounts" },
          { status: 400 }
        );
      }

      const [destAccount] = await db
        .select()
        .from(wallets)
        .where(and(eq(wallets.id, toWalletId), eq(wallets.userId, session.user.id)));

      if (!destAccount) {
        return NextResponse.json(
          { error: "Destination account not found" },
          { status: 400 }
        );
      }

      if (sourceAccount.currency !== destAccount.currency && !toAmountMinor) {
        return NextResponse.json(
          {
            error: `Transfer between different currencies (${sourceAccount.currency} to ${destAccount.currency}) requires destination amount.`,
          },
          { status: 400 }
        );
      }
    }

    await db
      .update(transactions)
      .set({
        type,
        amountMinor,
        currency: sourceAccount.currency || currency,
        categoryId: type === "transfer" ? null : categoryId || null,
        walletId,
        toWalletId: type === "transfer" ? toWalletId || null : null,
        toAmountMinor: type === "transfer" ? toAmountMinor || null : null,
        transferFeeMinor: type === "transfer" ? transferFeeMinor || 0 : 0,
        merchant,
        note: note || null,
        occurredAt: new Date(occurredAt),
      })
      .where(
        and(
          eq(transactions.id, id),
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
