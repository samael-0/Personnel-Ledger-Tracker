import { requireAuth } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import { VaultView } from "@/components/vault/VaultView";
import { db } from "@/db";
import { qrCodes, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export default async function VaultPage() {
  const session = await requireAuth();

  let userCurrency = "USD";
  let userQrCodes: any[] = [];

  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (user.length > 0 && user[0].currency) {
      userCurrency = user[0].currency;
    }

    userQrCodes = await db
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
  } catch (e) {
    console.warn("DB query fallback in vault page:", e);
  }

  return (
    <AppShell
      user={{
        name: session.user.name,
        email: session.user.email,
        currency: userCurrency,
        image: session.user.image,
      }}
    >
      <VaultView initialQrCodes={userQrCodes} />
    </AppShell>
  );
}

