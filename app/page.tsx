import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";

export default async function HomePage() {
  const session = await getServerSession();
  if (session && session.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col justify-between">
      {/* HEADER BAR */}
      <header className="px-6 py-4 border-b-2 border-border bg-surface/90 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-control bg-neo-yellow border-2 border-border flex items-center justify-center text-ink font-extrabold text-base shadow-neo-sm">
            L
          </div>
          <span className="text-xl font-extrabold tracking-tight">
            Ledgerly
          </span>
        </div>
        <div className="text-xs font-bold px-2.5 py-1 rounded-pill bg-surface-subtle border border-border text-muted">
          Personal Finance PWA
        </div>
      </header>

      {/* HERO SECTION */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 md:py-20 grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
        {/* LEFT COLUMN: PITCH & ARCHITECTURE */}
        <div className="md:col-span-7 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-neo-yellow border-2 border-border text-xs font-extrabold text-ink shadow-neo-sm">
            <span className="w-2 h-2 rounded-full bg-ink" />
            <span>Mobile-First Personal Ledger</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-ink leading-[1.15]">
              Calm, disciplined money management.
            </h1>
            <p className="text-base sm:text-lg text-muted max-w-xl leading-relaxed font-medium">
              Ledgerly is an installable personal finance ledger engineered for clarity.
              Record transactions in integer minor units, scan receipts with vision AI,
              store merchant QR codes, and monitor capital assets with zero third-party telemetry.
            </p>
          </div>

          {/* THREE PILLARS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-card border-2 border-border bg-surface shadow-neo-sm">
              <span className="text-xs font-extrabold text-ink bg-neo-yellow/30 px-2 py-0.5 rounded-control border border-border uppercase tracking-wider inline-block mb-2">
                01 / Minor Units
              </span>
              <p className="text-xs text-muted font-medium leading-relaxed">
                Exact integer cents without floating-point math inaccuracies.
              </p>
            </div>
            <div className="p-4 rounded-card border-2 border-border bg-surface shadow-neo-sm">
              <span className="text-xs font-extrabold text-ink bg-neo-cyan/30 px-2 py-0.5 rounded-control border border-border uppercase tracking-wider inline-block mb-2">
                02 / Vision AI
              </span>
              <p className="text-xs text-muted font-medium leading-relaxed">
                Camera receipt extraction reviewed by you before saving.
              </p>
            </div>
            <div className="p-4 rounded-card border-2 border-border bg-surface shadow-neo-sm">
              <span className="text-xs font-extrabold text-ink bg-neo-purple/30 px-2 py-0.5 rounded-control border border-border uppercase tracking-wider inline-block mb-2">
                03 / QR Vault
              </span>
              <p className="text-xs text-muted font-medium leading-relaxed">
                High-contrast payment codes ready for counter scanning.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AUTH CARD */}
        <div className="md:col-span-5">
          <div className="rounded-card border-2 border-border bg-surface p-6 sm:p-8 shadow-neo">
            <div className="mb-6">
              <h2 className="text-xl font-extrabold tracking-tight text-ink">
                Get Started
              </h2>
              <p className="text-xs font-medium text-muted mt-1">
                Secure session-based personal account.
              </p>
            </div>

            <AuthForm />
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="px-6 py-4 border-t-2 border-border bg-surface text-xs font-bold text-muted flex flex-col sm:flex-row justify-between items-center gap-2">
        <span>Ledgerly PWA</span>
        <span>Neo-Brutalist Soft Pop Fintech</span>
      </footer>
    </div>
  );
}
