import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { wallets, transactions } from "@/db/schema";
import { eq, and, asc, or } from "drizzle-orm";
import { walletSchema } from "@/lib/validations/transactions";
import { getAccountsWithBalances } from "@/lib/data/accounts";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get("includeArchived") === "true";

    const data = await getAccountsWithBalances(session.user.id, includeArchived);

    return NextResponse.json({
      wallets: data.accounts,
      totalsByCurrency: data.totalsByCurrency,
      firstRun: data.firstRun,
    });
  } catch (err: unknown) {
    console.error("Accounts fetch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error fetching accounts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = walletSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check existing accounts
    const existing = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, session.user.id));

    // If this is the user's first account, ensure it is default
    const shouldBeDefault = parsed.data.isDefault || existing.length === 0;

    const id = `wal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newWallet = {
      id,
      userId: session.user.id,
      name: parsed.data.name.trim(),
      type: parsed.data.type,
      currency: parsed.data.currency.trim().toUpperCase(),
      openingBalanceMinor: parsed.data.openingBalanceMinor,
      isDefault: shouldBeDefault,
      isArchived: parsed.data.isArchived ?? false,
      sortOrder: parsed.data.sortOrder ?? existing.length,
      accountNumberLast4: parsed.data.accountNumberLast4 || null,
      note: parsed.data.note?.trim() || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Execute in transaction: ensure exactly one default account
    await db.transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx
          .update(wallets)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(wallets.userId, session.user.id));
      }
      await tx.insert(wallets).values(newWallet);
    });

    return NextResponse.json({ success: true, wallet: newWallet });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create account";
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
    if (!body.id) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    const parsed = walletSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify account belongs to authenticated user
    const [existing] = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.id, body.id), eq(wallets.userId, session.user.id)));

    if (!existing) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await db.transaction(async (tx) => {
      if (parsed.data.isDefault) {
        // Unset any other default account for this user
        await tx
          .update(wallets)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(wallets.userId, session.user.id));
      }

      await tx
        .update(wallets)
        .set({
          name: parsed.data.name.trim(),
          type: parsed.data.type,
          currency: parsed.data.currency.trim().toUpperCase(),
          openingBalanceMinor: parsed.data.openingBalanceMinor,
          isDefault: parsed.data.isDefault,
          isArchived: parsed.data.isArchived,
          sortOrder: parsed.data.sortOrder,
          accountNumberLast4: parsed.data.accountNumberLast4 || null,
          note: parsed.data.note?.trim() || null,
          updatedAt: new Date(),
        })
        .where(and(eq(wallets.id, body.id), eq(wallets.userId, session.user.id)));
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update account";
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
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    // Verify ownership
    const [account] = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.id, id), eq(wallets.userId, session.user.id)));

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Check if account has any transactions (as sender or receiver)
    const [hasTxs] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, session.user.id),
          or(eq(transactions.walletId, id), eq(transactions.toWalletId, id))
        )
      )
      .limit(1);

    if (hasTxs) {
      return NextResponse.json(
        {
          error:
            "This account has transaction records. Please archive it instead so financial history remains accurate.",
        },
        { status: 400 }
      );
    }

    await db
      .delete(wallets)
      .where(and(eq(wallets.id, id), eq(wallets.userId, session.user.id)));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
