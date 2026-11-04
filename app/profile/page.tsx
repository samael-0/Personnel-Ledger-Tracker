import { requireAuth } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import { ProfileView } from "@/components/profile/ProfileView";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function ProfilePage() {
  const session = await requireAuth();

  // Fetch full user record to get currency and latest data
  let userRecord: {
    id: string;
    name: string;
    email: string;
    currency: string;
    image: string | null;
  } = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    currency: "USD",
    image: session.user.image || null,
  };

  try {
    const fetched = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (fetched.length > 0) {
      userRecord = {
        id: fetched[0].id,
        name: fetched[0].name,
        email: fetched[0].email,
        currency: fetched[0].currency || "USD",
        image: fetched[0].image,
      };
    }
  } catch (e) {
    console.warn("Could not query user table at runtime, using session cache:", e);
  }

  return (
    <AppShell user={userRecord}>
      <ProfileView user={userRecord} />
    </AppShell>
  );
}

