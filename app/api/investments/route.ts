import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { investments, investmentEvents } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  investmentSchema,
  valuationUpdateSchema,
} from "@/lib/validations/investments";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [items, events] = await Promise.all([
      db
        .select()
        .from(investments)
        .where(eq(investments.userId, session.user.id))
        .orderBy(desc(investments.updatedAt)),
      db
        .select()
        .from(investmentEvents)
        .where(eq(investmentEvents.userId, session.user.id))
        .orderBy(desc(investmentEvents.occurredAt)),
    ]);

    const itemsWithEvents = items.map((inv) => ({
      ...inv,
      events: events.filter((e) => e.investmentId === inv.id),
    }));

    return NextResponse.json({ investments: itemsWithEvents });
  } catch (err: unknown) {
    console.warn("Investments fetch fallback:", err);
    return NextResponse.json({ investments: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = investmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      type,
      name,
      quantity,
      unit,
      purchasePriceMinor,
      purchaseDate,
      currentValueMinor,
      currency,
      notes,
      ticker,
      shares,
      weight,
      location,
      area,
      ownershipPercentage,
    } = parsed.data;

    const extraFields = {
      ticker,
      shares,
      weight,
      location,
      area,
      ownershipPercentage,
    };

    const id = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newInv = {
      id,
      userId: session.user.id,
      type,
      name,
      quantity,
      unit: unit || null,
      purchasePriceMinor,
      purchaseDate: new Date(purchaseDate),
      currentValueMinor,
      currency,
      notes: notes || null,
      extraFields,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(investments).values(newInv);

    // Initial buy event
    const eventId = `inve-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await db.insert(investmentEvents).values({
      id: eventId,
      investmentId: id,
      userId: session.user.id,
      eventType: "buy",
      amountMinor: purchasePriceMinor,
      quantity,
      note: "Initial Asset Acquisition",
      occurredAt: new Date(purchaseDate),
    });

    return NextResponse.json({ success: true, investment: newInv });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create asset";
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

    // Check if it's a valuation update
    if (body.action === "update_valuation") {
      const parsedVal = valuationUpdateSchema.safeParse(body);
      if (!parsedVal.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsedVal.error.flatten() },
          { status: 400 }
        );
      }

      const { investmentId, newCurrentValueMinor, note, occurredAt } =
        parsedVal.data;

      // Verify ownership
      const existing = await db
        .select()
        .from(investments)
        .where(
          and(
            eq(investments.id, investmentId),
            eq(investments.userId, session.user.id)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        return NextResponse.json(
          { error: "Investment not found" },
          { status: 404 }
        );
      }

      const now = occurredAt ? new Date(occurredAt) : new Date();

      // Update current valuation and insert event atomically in transaction
      const eventId = `inve-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await db.transaction(async (tx) => {
        await tx
          .update(investments)
          .set({
            currentValueMinor: newCurrentValueMinor,
            updatedAt: now,
          })
          .where(
            and(
              eq(investments.id, investmentId),
              eq(investments.userId, session.user.id)
            )
          );

        await tx.insert(investmentEvents).values({
          id: eventId,
          investmentId,
          userId: session.user.id,
          eventType: "valuation_update",
          amountMinor: newCurrentValueMinor,
          quantity: existing[0].quantity,
          note: note || "Manual valuation benchmark update",
          occurredAt: now,
        });
      });

      return NextResponse.json({ success: true });
    }

    // Otherwise standard edit
    const parsed = investmentSchema.safeParse(body);
    if (!parsed.success || !parsed.data.id) {
      return NextResponse.json(
        { error: "Invalid data or ID missing" },
        { status: 400 }
      );
    }

    const {
      id,
      name,
      quantity,
      unit,
      purchasePriceMinor,
      currentValueMinor,
      notes,
      ticker,
      shares,
      weight,
      location,
      area,
      ownershipPercentage,
    } = parsed.data;

    await db
      .update(investments)
      .set({
        name,
        quantity,
        unit: unit || null,
        purchasePriceMinor,
        currentValueMinor,
        notes: notes || null,
        extraFields: {
          ticker,
          shares,
          weight,
          location,
          area,
          ownershipPercentage,
        },
        updatedAt: new Date(),
      })
      .where(
        and(eq(investments.id, id), eq(investments.userId, session.user.id))
      );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Update failed";
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
      .delete(investments)
      .where(
        and(eq(investments.id, id), eq(investments.userId, session.user.id))
      );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

