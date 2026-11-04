import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq, or, isNull } from "drizzle-orm";
import { categorySchema } from "@/lib/validations/transactions";
import { DEFAULT_CATEGORIES } from "@/lib/data/defaults";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbCategories = await db
      .select()
      .from(categories)
      .where(or(eq(categories.userId, session.user.id), isNull(categories.userId)));

    if (dbCategories.length === 0) {
      // Return defaults if none in DB yet
      return NextResponse.json({ categories: DEFAULT_CATEGORIES });
    }

    return NextResponse.json({ categories: dbCategories });
  } catch (err: unknown) {
    console.warn("Categories fetch fallback:", err);
    return NextResponse.json({ categories: DEFAULT_CATEGORIES });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const id = `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newCategory = {
      id,
      userId: session.user.id,
      name: parsed.data.name,
      kind: parsed.data.kind,
      createdAt: new Date(),
    };

    await db.insert(categories).values(newCategory);

    return NextResponse.json({ success: true, category: newCategory });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create category";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

