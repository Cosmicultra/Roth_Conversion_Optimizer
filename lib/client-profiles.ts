import type { RothClient } from "@/lib/roth-client";
import type { RothSocialSecurityState } from "@/lib/roth-social-security";
import type { RothWorksheet } from "@/lib/roth-worksheet";

export type ClientProfileStatus = "started" | "wizard_complete" | "teaser_viewed";

export type ClientProfileRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  source: string;
  status: ClientProfileStatus;
  client: RothClient;
  roth_worksheet: RothWorksheet;
  social_security: RothSocialSecurityState;
  manual_traditional_qualified: string;
  created_at: string;
  updated_at: string;
};

export type ClientProfileSummary = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: ClientProfileStatus;
  updated_at: string;
};

export type CreateClientProfileInput = {
  email: string;
  firstName: string;
  lastName: string;
  source?: string;
};

export type UpdateClientProfileInput = {
  status?: ClientProfileStatus;
  client?: RothClient;
  rothWorksheet?: RothWorksheet;
  socialSecurity?: RothSocialSecurityState;
  manualTraditionalQualified?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function profileDisplayName(row: Pick<ClientProfileRow, "first_name" | "last_name" | "email">): string {
  const name = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  return name || row.email;
}

export function toClientProfileSummary(row: ClientProfileRow): ClientProfileSummary {
  return {
    id: row.id,
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    status: row.status,
    updated_at: row.updated_at,
  };
}
