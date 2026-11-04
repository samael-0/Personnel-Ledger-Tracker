import { requireAuth } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import { ReceiptScanner } from "@/components/receipts/ReceiptScanner";
import { db } from "@/db";
import { categories, wallets, users } from "@/db/schema";
import { eq, or, isNull } from "drizzle-orm";
import { DEFAULT_CATEGORIES, DEFAULT_WALLETS } from "@/lib/data/defaults";

export default async function ScanPage() {
  const session = await requireAuth();

  let userCurrency = "USD";
  let userCategories: any[] = DEFAULT_CATEGORIES;
  let userWallets: any[] = [];

  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (user.length > 0 && user[0].currency) {
      userCurrency = user[0].currency;
    }

    const fetchedCats = await db
      .select()
      .from(categories)
      .where(or(eq(categories.userId, session.user.id), isNull(categories.userId)));

    if (fetchedCats.length > 0) {
      userCategories = fetchedCats;
    }

    const fetchedWallets = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, session.user.id));

    if (fetchedWallets.length > 0) {
      userWallets = fetchedWallets;
    } else {
      userWallets = DEFAULT_WALLETS.map((w, i) => ({
        id: `wal-default-${i}`,
        name: w.name,
        type: w.type,
        currency: userCurrency,
      }));
    }
  } catch (e) {
    console.warn("Could not query DB in scan page:", e);
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
      <ReceiptScanner
        categories={userCategories}
        wallets={userWallets}
        userCurrency={userCurrency}
      />
    </AppShell>
  );
}

