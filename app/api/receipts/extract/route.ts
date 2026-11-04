import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { db } from "@/db";
import { receipts } from "@/db/schema";
import { extractReceiptFromImage } from "@/lib/ai/receipt";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting per user
    const rateCheck = checkRateLimit(session.user.id, 10, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error:
            "Rate limit reached. Please wait a minute before scanning more receipts.",
        },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No receipt file provided" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only JPEG, PNG, WebP, and PDF files are allowed.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 5MB size limit. Please compress image." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Store receipt image in Postgres bytea so it is never lost
    const receiptId = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await db.insert(receipts).values({
      id: receiptId,
      userId: session.user.id,
      data: buffer,
      mimeType: file.type,
      filename: file.name || "receipt.jpg",
      fileSize: file.size,
      createdAt: new Date(),
    });

    // Run AI extraction
    const extraction = await extractReceiptFromImage(buffer, file.type);

    return NextResponse.json({
      success: !extraction.allModelsFailed,
      receiptId,
      extracted: extraction.data,
      fallbackUsed: extraction.fallbackUsed,
      allModelsFailed: extraction.allModelsFailed || false,
      message: extraction.message,
    });
  } catch (err: unknown) {
    const statusCode = (err as Record<string, any>)?.statusCode || 500;
    const message = err instanceof Error ? err.message : "Error processing receipt";
    return NextResponse.json({ error: message, success: false }, { status: statusCode });
  }
}
