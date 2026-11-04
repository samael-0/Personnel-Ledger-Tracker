import { requireAuth } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import { ProfileView } from "@/components/profile/ProfileView";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserReceiptStorage } from "@/lib/data/receipts";

export default async function ProfilePage() {
  const session = await requireAuth();

  let userRecord = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    currency: "USD",
    image: session.user.image || null,
    saveReceiptPhotosDefault: false,
  };

  let storageStats = { count: 0, totalBytes: 0 };

  try {
    const [fetched, storage] = await Promise.all([
      db
        .select()
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1),
      getUserReceiptStorage(session.user.id),
    ]);

    if (fetched.length > 0) {
      userRecord = {
        id: fetched[0].id,
        name: fetched[0].name,
        email: fetched[0].email,
        currency: fetched[0].currency || "USD",
        image: fetched[0].image,
        saveReceiptPhotosDefault: fetched[0].saveReceiptPhotosDefault ?? false,
      };
    }

    storageStats = storage;
  } catch (e) {
    console.warn("Could not query user table at runtime, using session cache:", e);
  }

  return (
    <AppShell user={userRecord}>
      <ProfileView user={userRecord} initialStorageStats={storageStats} />
    </AppShell>
  );
}
