import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { wallets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { walletSchema } from "@/lib/validations/transactions";
import { DEFAULT_WALLETS } from "@/lib/data/defaults";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userWallets = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, session.user.id));

    if (userWallets.length === 0) {
      // Auto seed default wallets for user
      const defaultUserWallets = DEFAULT_WALLETS.map((w, index) => ({
        id: `wal-${Date.now()}-${index}`,
        userId: session.user.id,
        name: w.name,
        type: w.type,
        currency: "USD",
        createdAt: new Date(),
      }));

      try {
        await db.insert(wallets).values(defaultUserWallets);
        userWallets = defaultUserWallets;
      } catch (e) {
        console.warn("Could not write default wallets to db, using memory defaults:", e);
        userWallets = defaultUserWallets;
      }
    }

    return NextResponse.json({ wallets: userWallets });
  } catch (err: unknown) {
    console.warn("Wallets fetch error fallback:", err);
    return NextResponse.json({
      wallets: DEFAULT_WALLETS.map((w, index) => ({
        id: `wal-default-${index}`,
        userId: "guest",
        name: w.name,
        type: w.type,
        currency: "USD",
        createdAt: new Date(),
      })),
    });
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

    const id = `wal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newWallet = {
      id,
      userId: session.user.id,
      name: parsed.data.name,
      type: parsed.data.type,
      currency: parsed.data.currency,
      createdAt: new Date(),
    };

    await db.insert(wallets).values(newWallet);

    return NextResponse.json({ success: true, wallet: newWallet });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create wallet";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

