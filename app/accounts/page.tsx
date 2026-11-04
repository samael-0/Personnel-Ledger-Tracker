import { requireAuth } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import { AccountsView } from "@/components/accounts/AccountsView";
import { getAccountsWithBalances } from "@/lib/data/accounts";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function AccountsPage() {
  const session = await requireAuth();

  let userCurrency = "USD";
  let userAccounts: any[] = [];

  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (user.length > 0 && user[0].currency) {
      userCurrency = user[0].currency;
    }

    const data = await getAccountsWithBalances(session.user.id, true);
    userAccounts = data.accounts;
  } catch (err) {
    console.error("Accounts page load error:", err);
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
      <AccountsView
        initialAccounts={userAccounts}
        userCurrency={userCurrency}
      />
    </AppShell>
  );
}

