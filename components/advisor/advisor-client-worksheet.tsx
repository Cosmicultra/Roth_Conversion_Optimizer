"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ClientProfileRow } from "@/lib/client-profiles";
import { profileToSession } from "@/lib/client-profile-session";
import { RothConversionWorksheet } from "@/components/roth/roth-conversion-worksheet";
import type { RothSession } from "@/lib/roth-session-storage";

type Props = {
  profileId: string;
};

export function AdvisorClientWorksheet({ profileId }: Props) {
  const [session, setSession] = useState<RothSession | null>(null);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/prospect-profiles/${profileId}`);
        const j = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          profile?: ClientProfileRow;
        };
        if (cancelled) return;
        if (!res.ok || !j.ok || !j.profile) {
          setError(j.error || "Could not load client profile.");
          return;
        }
        const nextSession = profileToSession(j.profile);
        if (!nextSession) {
          setError("Profile data is invalid.");
          return;
        }
        setSession(nextSession);
        const name = [j.profile.first_name, j.profile.last_name].filter(Boolean).join(" ").trim();
        setClientName(name || j.profile.email);
      } catch {
        if (!cancelled) setError("Could not load client profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  if (loading) {
    return (
      <div className="ap-app-bg flex min-h-screen items-center justify-center">
        <p className="text-sm text-[#fbbf24]" role="status">
          Loading client worksheet…
        </p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="ap-app-bg flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-sm text-[#fca5a5]">{error ?? "Profile not found."}</p>
        <Link href="/advisor" className="text-sm font-semibold text-[#fbbf24] underline underline-offset-2">
          ← Back to portal
        </Link>
      </div>
    );
  }

  return (
    <RothConversionWorksheet
      profileId={profileId}
      initialSession={session}
      advisorPortalMode
      clientLabel={clientName}
    />
  );
}
