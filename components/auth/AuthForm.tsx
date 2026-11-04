"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!name.trim()) {
          setError("Name is required");
          setLoading(false);
          return;
        }
        const res = await signUp.email({
          email,
          password,
          name,
        });
        if (res.error) {
          setError(res.error.message || "Failed to create account");
          setLoading(false);
          return;
        }
      } else {
        const res = await signIn.email({
          email,
          password,
        });
        if (res.error) {
          setError(res.error.message || "Invalid email or password");
          setLoading(false);
          return;
        }
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred during authentication";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {/* Tab toggle */}
      <div className="flex p-1.5 bg-surface-subtle border-2 border-border rounded-btn mb-6 shadow-neo-sm gap-1.5">
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setError(null);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-control transition-all select-none ${
            mode === "signin"
              ? "bg-neo-yellow text-ink border-2 border-border shadow-neo-sm font-extrabold"
              : "text-muted hover:text-ink"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-control transition-all select-none ${
            mode === "signup"
              ? "bg-neo-yellow text-ink border-2 border-border shadow-neo-sm font-extrabold"
              : "text-muted hover:text-ink"
          }`}
        >
          Create Account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <Field label="Full Name" required>
            <Input
              type="text"
              placeholder="e.g. Ariyan Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </Field>
        )}

        <Field label="Email Address" required>
          <Input
            type="email"
            placeholder="ariyan@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </Field>

        <Field
          label="Password"
          description={
            mode === "signup"
              ? "At least 8 characters with numbers and symbols."
              : undefined
          }
          required
        >
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </Field>

        {error && (
          <div className="p-3.5 bg-neo-coral/20 text-ink font-bold text-xs rounded-btn border-2 border-border shadow-neo-sm">
            {error}
          </div>
        )}

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full font-extrabold"
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : mode === "signin"
              ? "Access Ledger"
              : "Create Account"}
          </Button>
        </div>
      </form>
    </div>
  );
}
