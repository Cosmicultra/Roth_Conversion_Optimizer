const STORAGE_KEY = "roth-conversion-optimizer:prospect-profile:v1";

export type StoredProspectSession = {
  profileId: string;
  email: string;
  leadFirstName: string;
  leadLastName: string;
};

export function loadProspectSession(): StoredProspectSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredProspectSession>;
    if (
      typeof parsed.profileId !== "string" ||
      !parsed.profileId.trim() ||
      typeof parsed.email !== "string" ||
      !parsed.email.trim()
    ) {
      return null;
    }
    return {
      profileId: parsed.profileId.trim(),
      email: parsed.email.trim(),
      leadFirstName: String(parsed.leadFirstName ?? "").trim(),
      leadLastName: String(parsed.leadLastName ?? "").trim(),
    };
  } catch {
    return null;
  }
}

export function saveProspectSession(session: StoredProspectSession): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore quota errors */
  }
}

export function clearProspectSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
