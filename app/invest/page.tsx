import { requireAuth } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import { InvestmentsView } from "@/components/investments/InvestmentsView";
import { db } from "@/db";
import { investments, investmentEvents, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { timeQuery } from "@/lib/timing";

export default async function InvestPage() {
  const session = await requireAuth();

  let userCurrency = "USD";
  let userInvestments: any[] = [];

  try {
    const [userRows, items, events] = await timeQuery("InvestPage:parallel-load", () =>
      Promise.all([
        db
          .select({ currency: users.currency })
          .from(users)
          .where(eq(users.id, session.user.id))
          .limit(1),
        db
          .select()
          .from(investments)
          .where(eq(investments.userId, session.user.id))
          .orderBy(desc(investments.updatedAt)),
        db
          .select()
          .from(investmentEvents)
          .where(eq(investmentEvents.userId, session.user.id))
          .orderBy(desc(investmentEvents.occurredAt)),
      ])
    );

    if (userRows.length > 0 && userRows[0].currency) {
      userCurrency = userRows[0].currency;
    }

    userInvestments = items.map((inv) => ({
      ...inv,
      events: events.filter((e) => e.investmentId === inv.id),
    }));
  } catch (e) {
    console.warn("Investments DB query fallback:", e);
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
      <InvestmentsView
        initialInvestments={userInvestments}
        userCurrency={userCurrency}
      />
    </AppShell>
  );
}
