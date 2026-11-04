import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import { mergeCategorySchema } from "@/lib/validations/transactions";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = mergeCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { fromCategoryId, toCategoryId } = parsed.data;

    if (fromCategoryId === toCategoryId) {
      return NextResponse.json(
        { error: "Source and destination categories must be different" },
        { status: 400 }
      );
    }

    // Verify both categories exist and are accessible to this user
    const [fromCat] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, fromCategoryId),
          or(eq(categories.userId, session.user.id), isNull(categories.userId))
        )
      );

    const [toCat] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, toCategoryId),
          or(eq(categories.userId, session.user.id), isNull(categories.userId))
        )
      );

    if (!fromCat || !toCat) {
      return NextResponse.json(
        { error: "One or both categories could not be found" },
        { status: 404 }
      );
    }

    // Wrap in atomic database transaction
    await db.transaction(async (tx) => {
      // 1. Reassign all user transactions from fromCategoryId to toCategoryId
      await tx
        .update(transactions)
        .set({ categoryId: toCategoryId })
        .where(
          and(
            eq(transactions.userId, session.user.id),
            eq(transactions.categoryId, fromCategoryId)
          )
        );

      // 2. If the source category was user-created, safely delete it
      if (fromCat.userId === session.user.id) {
        await tx
          .delete(categories)
          .where(
            and(
              eq(categories.id, fromCategoryId),
              eq(categories.userId, session.user.id)
            )
          );
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully merged "${fromCat.name}" into "${toCat.name}".`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Merge failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

