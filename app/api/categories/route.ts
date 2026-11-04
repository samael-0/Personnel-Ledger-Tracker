import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { categories, userHiddenCategories, transactions } from "@/db/schema";
import { eq, or, isNull, and } from "drizzle-orm";
import { categorySchema } from "@/lib/validations/transactions";
import { DEFAULT_CATEGORIES } from "@/lib/data/defaults";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get("includeArchived") === "true";
    const includeHidden = searchParams.get("includeHidden") === "true";

    // 1. Fetch hidden category records for this user
    const hiddenList = await db
      .select({ categoryId: userHiddenCategories.categoryId })
      .from(userHiddenCategories)
      .where(eq(userHiddenCategories.userId, session.user.id));

    const hiddenIds = new Set(hiddenList.map((h) => h.categoryId));

    // 2. Fetch categories (shared defaults + user custom)
    const dbCategories = await db
      .select()
      .from(categories)
      .where(
        or(eq(categories.userId, session.user.id), isNull(categories.userId))
      );

    let allCategories = dbCategories;

    // If database has no categories yet, populate with memory defaults
    if (allCategories.length === 0) {
      allCategories = DEFAULT_CATEGORIES.map((c) => ({
        id: c.id,
        userId: null,
        name: c.name,
        kind: c.kind,
        icon: null,
        isArchived: false,
        createdAt: new Date(),
      }));
    }

    // 3. Mark hidden status and filter
    const mapped = allCategories.map((c) => ({
      ...c,
      isDefault: c.userId === null,
      isHidden: hiddenIds.has(c.id),
    }));

    const filtered = mapped.filter((c) => {
      if (!includeArchived && c.isArchived) return false;
      if (!includeHidden && c.isHidden) return false;
      return true;
    });

    return NextResponse.json({ categories: filtered });
  } catch (err: unknown) {
    console.error("Categories fetch error:", err);
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

    const trimmedName = parsed.data.name.trim();

    // Check duplicate name per user and kind (case-insensitive)
    const existing = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.kind, parsed.data.kind),
          or(eq(categories.userId, session.user.id), isNull(categories.userId))
        )
      );

    const isDuplicate = existing.some(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      return NextResponse.json(
        { error: `A ${parsed.data.kind} category named "${trimmedName}" already exists.` },
        { status: 400 }
      );
    }

    const id = `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newCategory = {
      id,
      userId: session.user.id,
      name: trimmedName,
      kind: parsed.data.kind,
      icon: parsed.data.icon || null,
      isArchived: false,
      createdAt: new Date(),
    };

    await db.insert(categories).values(newCategory);

    return NextResponse.json({ success: true, category: newCategory });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create category";
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
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify category belongs to user and is not a shared default
    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, body.id));

    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    if (existing.userId === null) {
      return NextResponse.json(
        {
          error:
            "Default system categories cannot be edited directly. You can hide them or create a custom category.",
        },
        { status: 400 }
      );
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const trimmedName = parsed.data.name.trim();

    // Check duplicate name if renamed
    if (trimmedName.toLowerCase() !== existing.name.toLowerCase()) {
      const allUserCategories = await db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.kind, parsed.data.kind),
            or(eq(categories.userId, session.user.id), isNull(categories.userId))
          )
        );

      const isDup = allUserCategories.some(
        (c) => c.id !== body.id && c.name.toLowerCase() === trimmedName.toLowerCase()
      );

      if (isDup) {
        return NextResponse.json(
          { error: `A ${parsed.data.kind} category named "${trimmedName}" already exists.` },
          { status: 400 }
        );
      }
    }

    await db
      .update(categories)
      .set({
        name: trimmedName,
        kind: parsed.data.kind,
        icon: parsed.data.icon || null,
        isArchived: parsed.data.isArchived ?? false,
      })
      .where(and(eq(categories.id, body.id), eq(categories.userId, session.user.id)));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update category";
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
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    if (category.userId === null) {
      return NextResponse.json(
        {
          error:
            "Default system categories cannot be deleted. You can hide them instead.",
        },
        { status: 400 }
      );
    }

    if (category.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if category has transactions
    const [hasTxs] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, session.user.id),
          eq(transactions.categoryId, id)
        )
      )
      .limit(1);

    if (hasTxs) {
      return NextResponse.json(
        {
          error:
            "This category has associated transactions. Please archive it or merge into another category.",
          canMerge: true,
          canArchive: true,
        },
        { status: 400 }
      );
    }

    await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, session.user.id)));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete category";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
