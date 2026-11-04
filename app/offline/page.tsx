import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-ground text-ink flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-card border border-border bg-surface p-8 shadow-card text-center">
        <div className="w-12 h-12 rounded-full bg-accent-subtle text-accent flex items-center justify-center mx-auto mb-4 font-bold text-lg">
          !
        </div>
        <h1 className="text-xl font-bold tracking-tight text-ink">
          Offline Mode
        </h1>
        <p className="text-xs sm:text-sm text-muted my-3 leading-relaxed">
          You are currently disconnected from the network. Ledgerly caches app
          shells and visual assets, but database operations require an active
          connection.
        </p>
        <div className="pt-3">
          <Link href="/dashboard">
            <Button variant="primary" size="lg" className="w-full">
              Retry Connection
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
