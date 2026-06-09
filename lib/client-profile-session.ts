import type { ClientProfileRow } from "@/lib/client-profiles";
import { emptyRothClient } from "@/lib/roth-client";
import { emptyRothSocialSecurityState } from "@/lib/roth-social-security";
import { normalizeRothSession, type RothSession } from "@/lib/roth-session-storage";
import { normalizeRothWorksheet } from "@/lib/roth-worksheet";

export function profileToSession(row: ClientProfileRow): RothSession | null {
  return normalizeRothSession({
    client: { ...emptyRothClient(), ...row.client },
    manualTraditionalQualified: row.manual_traditional_qualified ?? "",
    rothWorksheet: normalizeRothWorksheet(row.roth_worksheet),
    rothLiveAnalysisOpen: false,
    socialSecurity: { ...emptyRothSocialSecurityState(), ...row.social_security },
  });
}
