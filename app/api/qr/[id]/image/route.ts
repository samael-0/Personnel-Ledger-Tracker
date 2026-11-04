import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { qrCodes } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const record = await db
      .select({
        imageData: qrCodes.imageData,
        mimeType: qrCodes.mimeType,
      })
      .from(qrCodes)
      .where(and(eq(qrCodes.id, id), eq(qrCodes.userId, session.user.id)))
      .limit(1);

    if (record.length === 0 || !record[0].imageData) {
      return NextResponse.json({ error: "QR image not found" }, { status: 404 });
    }

    const item = record[0];
    const rawData = item.imageData!;
    const buffer = Buffer.isBuffer(rawData)
      ? rawData
      : Buffer.from(rawData as unknown as string, "binary");

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": item.mimeType || "image/png",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error serving QR image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
