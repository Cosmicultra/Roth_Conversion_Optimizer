"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/roth/form/form-field";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AdvisorLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/advisor";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push(nextPath.startsWith("/") ? nextPath : "/advisor");
      router.refresh();
    } catch {
      setError("Could not sign in. Check your Supabase configuration.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <p className="ap-eyebrow">Advisor access</p>
        <h1 className="ap-hero-title text-3xl md:text-4xl">Sign in to your portal</h1>
        <p className="text-sm text-[#94a3b8]">View prospects and open client worksheets.</p>
      </div>
      <div className="space-y-4 rounded-none border border-[#1e1e2e] bg-[#101017] p-6">
        <FormField id="advisor-email" label="Email">
          <Input
            id="advisor-email"
            type="email"
            autoComplete="email"
            className="h-12 rounded-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FormField>
        <FormField id="advisor-password" label="Password">
          <Input
            id="advisor-password"
            type="password"
            autoComplete="current-password"
            className="h-12 rounded-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FormField>
        {error ? (
          <p className="text-sm text-[#fca5a5]" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="h-12 w-full rounded-none ap-cta-solid" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </div>
    </form>
  );
}
