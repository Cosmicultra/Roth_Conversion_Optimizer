"use client";

import { useCallback, useState } from "react";
import type { ClientProfileRow, UpdateClientProfileInput } from "@/lib/client-profiles";
import type { RothClient } from "@/lib/roth-client";
import type { RothSocialSecurityState } from "@/lib/roth-social-security";
import type { RothWorksheet } from "@/lib/roth-worksheet";

export type ProspectProfileSession = {
  profileId: string;
  email: string;
  leadFirstName: string;
  leadLastName: string;
  client: RothClient;
  rothWorksheet: RothWorksheet;
  socialSecurity: RothSocialSecurityState;
  manualTraditionalQualified: string;
};

export async function createProspectProfile(input: {
  email: string;
  firstName: string;
  lastName: string;
}): Promise<{ ok: true; profile: ClientProfileRow } | { ok: false; error: string }> {
  const res = await fetch("/api/prospect-profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const j = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    profile?: ClientProfileRow;
  };
  if (!res.ok || !j.ok || !j.profile) {
    return { ok: false, error: j.error || "Could not save your information." };
  }
  return { ok: true, profile: j.profile };
}

export async function saveProspectProfile(
  profileId: string,
  patch: UpdateClientProfileInput,
): Promise<{ ok: true; profile: ClientProfileRow } | { ok: false; error: string }> {
  const res = await fetch(`/api/prospect-profiles/${profileId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const j = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    profile?: ClientProfileRow;
  };
  if (!res.ok || !j.ok || !j.profile) {
    return { ok: false, error: j.error || "Could not save progress." };
  }
  return { ok: true, profile: j.profile };
}

export async function deleteProspectProfile(
  profileId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`/api/prospect-profiles/${profileId}`, {
    method: "DELETE",
  });
  const j = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  };
  if (!res.ok || !j.ok) {
    return { ok: false, error: j.error || "Could not delete prospect." };
  }
  return { ok: true };
}

export function useProspectProfileSave() {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const persist = useCallback(
    async (profileId: string, patch: UpdateClientProfileInput) => {
      setSaving(true);
      setSaveError(null);
      const result = await saveProspectProfile(profileId, patch);
      setSaving(false);
      if (!result.ok) {
        setSaveError(result.error);
        return false;
      }
      return true;
    },
    [],
  );

  return { saving, saveError, persist, setSaveError };
}
