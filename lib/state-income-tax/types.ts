import type { IllustrationFiling } from "@/lib/federal-tax-illustration";

export type StateCode =
  | "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "DC" | "FL"
  | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME"
  | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH"
  | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI"
  | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY";

export type StateRateBand = { low: number; high: number; rate: number };

export type StateSocialSecurityTreatment = "exempt" | "federal_taxable" | "partial";

export type StateTaxProfile = {
  code: StateCode;
  name: string;
  hasIncomeTax: boolean;
  socialSecurityTreatment: StateSocialSecurityTreatment;
  /** Progressive brackets per filing status; empty when hasIncomeTax false or flatRate set. */
  brackets: Partial<Record<IllustrationFiling, StateRateBand[]>>;
  /** Flat rate on state taxable ordinary when set (e.g. PA, IL). */
  flatRate?: number;
};

export const ALL_STATE_CODES: StateCode[] = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL",
  "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
  "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
  "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];
