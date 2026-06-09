import { emptyRothClient, type RothClient } from "@/lib/roth-client";
import {
  emptyRothSocialSecurityState,
  type RothSocialSecurityState,
} from "@/lib/roth-social-security";
import { emptyRothWorksheet, type RothWorksheet } from "@/lib/roth-worksheet";

const STORAGE_KEY = "roth-conversion-optimizer:session:v2";

export type RothSession = {
  client: RothClient;
  manualTraditionalQualified: string;
  rothWorksheet: RothWorksheet;
  rothLiveAnalysisOpen: boolean;
  socialSecurity: RothSocialSecurityState;
};

export function emptyRothSession(): RothSession {
  return {
    client: emptyRothClient(),
    manualTraditionalQualified: "",
    rothWorksheet: emptyRothWorksheet(),
    rothLiveAnalysisOpen: false,
    socialSecurity: emptyRothSocialSecurityState(),
  };
}

export function normalizeRothSession(raw: Partial<RothSession> | null): RothSession | null {
  if (!raw || typeof raw !== "object" || !raw.client || !raw.rothWorksheet) return null;
  const client = {
    ...emptyRothClient(),
    ...raw.client,
    spouseRetirementAge: raw.client.spouseRetirementAge ?? raw.client.retirementAge ?? "65",
    stateOfResidence: String(raw.client.stateOfResidence ?? ""),
    totalDeductionsAnnual: String(raw.client.totalDeductionsAnnual ?? ""),
  };
  return {
    client,
    manualTraditionalQualified: String(raw.manualTraditionalQualified ?? ""),
    rothWorksheet: raw.rothWorksheet,
    rothLiveAnalysisOpen: Boolean(raw.rothLiveAnalysisOpen),
    socialSecurity: { ...emptyRothSocialSecurityState(), ...(raw.socialSecurity ?? {}) },
  };
}

/** Legacy FIC flat state % is ignored when state of residence is blank (v4 uses jurisdiction brackets). */
export function hasLegacyFlatStateTaxPct(worksheet: RothWorksheet, client: RothClient): boolean {
  const pct = Number(String(worksheet.fic?.stateTaxPct ?? "").replace(/%/g, "").trim());
  return !client.stateOfResidence?.trim() && Number.isFinite(pct) && pct > 0;
}

export function loadRothSession(): RothSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RothSession>;
    return normalizeRothSession(parsed);
  } catch {
    return null;
  }
}

export function saveRothSession(session: RothSession): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore quota errors */
  }
}
