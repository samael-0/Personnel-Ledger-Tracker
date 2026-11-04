import { requireAuth } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import { AccountsView } from "@/components/accounts/AccountsView";
import { getAccountsWithBalances } from "@/lib/data/accounts";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { timeQuery } from "@/lib/timing";

export default async function AccountsPage() {
  const session = await requireAuth();

  let userCurrency = "USD";
  let userAccounts: any[] = [];

  try {
    const [userRows, data] = await timeQuery("AccountsPage:parallel-load", () =>
      Promise.all([
        db
          .select({ currency: users.currency })
          .from(users)
          .where(eq(users.id, session.user.id))
          .limit(1),
        getAccountsWithBalances(session.user.id, true),
      ])
    );

    if (userRows.length > 0 && userRows[0].currency) {
      userCurrency = userRows[0].currency;
    }

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
