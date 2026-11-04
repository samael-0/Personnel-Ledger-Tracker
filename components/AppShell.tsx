"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AppShellProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email: string;
    currency?: string;
    image?: string | null;
  } | null;
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/dashboard",
      label: "Home",
      shortLabel: "Home",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: "/transactions",
      label: "Ledger",
      shortLabel: "Ledger",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      href: "/scan",
      label: "Scan",
      shortLabel: "Scan",
      isScan: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      href: "/vault",
      label: "Vault",
      shortLabel: "Vault",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      ),
    },
    {
      href: "/invest",
      label: "Portfolio",
      shortLabel: "Portfolio",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-ground text-ink">
      {/* DESKTOP LEFT RAIL (>= 768px) */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-ground border-r-2 border-border shrink-0 justify-between sticky top-0 h-screen z-30 p-6">
        <div className="space-y-6">
          {/* Brand header */}
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-btn bg-neo-yellow border-2 border-border shadow-neo flex items-center justify-center font-black text-xl">
              ≡
            </div>
            <div>
              <span className="text-xl font-black tracking-tight block">
                Ledgerly
              </span>
              <p className="text-[11px] font-bold text-muted">
                Pocket Finance
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-2 pt-2">
            {[
              navItems[0],
              navItems[1],
              {
                href: "/accounts",
                label: "Accounts",
                shortLabel: "Accounts",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                ),
              },
              ...navItems.slice(2),
            ].map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              if (item.isScan) {
                return (
                  <div key={item.href} className="py-2">
                    <Link
                      href={item.href}
                      className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-btn font-black text-sm bg-neo-cyan text-ink border-2 border-border shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Scan Receipt</span>
                    </Link>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-btn text-sm font-extrabold border-2 transition-all ${
                    isActive
                      ? "bg-neo-yellow text-ink border-border shadow-neo"
                      : "bg-surface text-ink border-transparent hover:border-border hover:shadow-neo-sm"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile bottom */}
        <div className="pt-4 border-t-2 border-border">
          <Link
            href="/profile"
            className={`flex items-center gap-3 p-3 rounded-btn border-2 border-border bg-surface shadow-neo transition-all ${
              pathname === "/profile" ? "ring-2 ring-border" : "hover:bg-surface-subtle"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-neo-yellow border-2 border-border flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
              {user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user?.name || "Avatar"}
                  className="w-full h-full object-cover"
                />
              ) : (
                (user?.name?.[0] || "U").toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black truncate">
                {user?.name || "Account"}
              </p>
              <p className="text-[11px] font-bold text-muted truncate">
                {user?.currency || "USD"} Base
              </p>
            </div>
          </Link>
        </div>
      </aside>

      {/* MOBILE TOP BAR (< 768px) matching the phone mockup */}
      <header className="md:hidden flex items-center justify-between px-5 pt-4 pb-2 bg-ground sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-btn bg-neo-yellow border-2 border-border shadow-neo-sm flex items-center justify-center font-black text-lg select-none">
            ≡
          </div>
          <div>
            <span className="text-xs font-bold text-muted block leading-none">
              Good Morning
            </span>
            <span className="text-base font-black text-ink tracking-tight flex items-center gap-1 mt-0.5">
              <span>{user?.name?.split(" ")[0] || "Friend"}</span>
              <span className="text-sm">👋</span>
            </span>
          </div>
        </div>

        <Link
          href="/profile"
          aria-label="Profile and notifications"
          className="w-10 h-10 rounded-btn bg-surface-subtle border-2 border-border shadow-neo-sm flex items-center justify-center text-ink hover:bg-surface active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </Link>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 pb-28 md:pb-8 p-4 sm:p-6 lg:p-8 max-w-4xl w-full mx-auto">
        {children}
      </main>

      {/* MOBILE BOTTOM NAVIGATION DOCK (matching mockup with black border & yellow active tile) */}
      <div className="md:hidden fixed bottom-4 inset-x-4 z-40">
        <nav
          aria-label="Mobile Navigation"
          className="bg-surface border-2 border-border rounded-[24px] shadow-neo-lg flex items-center justify-around p-1.5"
        >
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`flex-1 py-2 px-1 rounded-btn flex flex-col items-center justify-center transition-all select-none ${
                  isActive
                    ? "bg-neo-yellow text-ink border-2 border-border shadow-neo-sm font-black"
                    : "text-muted hover:text-ink font-bold"
                }`}
              >
                <div>{item.icon}</div>
                <span className="text-[10px] tracking-tight leading-none mt-1">
                  {item.shortLabel}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
