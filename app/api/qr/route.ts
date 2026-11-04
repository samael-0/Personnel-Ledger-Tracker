import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { qrCodes } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { qrCodeSchema } from "@/lib/validations/qr";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const list = await db
      .select({
        id: qrCodes.id,
        name: qrCodes.name,
        category: qrCodes.category,
        note: qrCodes.note,
        decodedText: qrCodes.decodedText,
        isPinned: qrCodes.isPinned,
        createdAt: qrCodes.createdAt,
        updatedAt: qrCodes.updatedAt,
      })
      .from(qrCodes)
      .where(eq(qrCodes.userId, session.user.id))
      .orderBy(desc(qrCodes.isPinned), desc(qrCodes.updatedAt));

    return NextResponse.json({ qrCodes: list });
  } catch (err: unknown) {
    console.warn("QR fetch error fallback:", err);
    return NextResponse.json({ qrCodes: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const name = formData.get("name") as string | null;
    const category = (formData.get("category") as string) || "payment";
    const note = (formData.get("note") as string) || null;
    const decodedText = (formData.get("decodedText") as string) || null;
    const file = formData.get("file") as File | null;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    let imageBuffer: Buffer | null = null;
    let mimeType: string | null = null;

    if (file) {
      const arr = await file.arrayBuffer();
      imageBuffer = Buffer.from(arr);
      mimeType = file.type || "image/png";
    }

    const id = `qr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newQr = {
      id,
      userId: session.user.id,
      name: name.trim(),
      category,
      note: note ? note.trim() : null,
      decodedText: decodedText ? decodedText.trim() : null,
      imageData: imageBuffer,
      mimeType,
      isPinned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(qrCodes).values(newQr);

    return NextResponse.json({
      success: true,
      qrCode: {
        id,
        name: newQr.name,
        category: newQr.category,
        note: newQr.note,
        decodedText: newQr.decodedText,
        isPinned: newQr.isPinned,
        createdAt: newQr.createdAt,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to store QR code";
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
    const parsed = qrCodeSchema.safeParse(body);
    if (!parsed.success || !parsed.data.id) {
      return NextResponse.json(
        { error: "Validation failed or missing ID" },
        { status: 400 }
      );
    }

    await db
      .update(qrCodes)
      .set({
        name: parsed.data.name,
        category: parsed.data.category,
        note: parsed.data.note,
        decodedText: parsed.data.decodedText,
        isPinned: parsed.data.isPinned,
        updatedAt: new Date(),
      })
      .where(
        and(eq(qrCodes.id, parsed.data.id), eq(qrCodes.userId, session.user.id))
      );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update QR code";
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
      .delete(qrCodes)
      .where(and(eq(qrCodes.id, id), eq(qrCodes.userId, session.user.id)));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete QR code";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

