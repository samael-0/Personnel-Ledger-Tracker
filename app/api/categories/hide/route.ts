import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { userHiddenCategories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const hideSchema = z.object({
  categoryId: z.string().min(1),
  hide: z.boolean(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = hideSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { categoryId, hide } = parsed.data;

    if (hide) {
      // Add to hidden list if not already present
      const [existing] = await db
        .select()
        .from(userHiddenCategories)
        .where(
          and(
            eq(userHiddenCategories.userId, session.user.id),
            eq(userHiddenCategories.categoryId, categoryId)
          )
        );

      if (!existing) {
        await db.insert(userHiddenCategories).values({
          id: `uhc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          userId: session.user.id,
          categoryId,
          createdAt: new Date(),
        });
      }
    } else {
      // Remove from hidden list
      await db
        .delete(userHiddenCategories)
        .where(
          and(
            eq(userHiddenCategories.userId, session.user.id),
            eq(userHiddenCategories.categoryId, categoryId)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

