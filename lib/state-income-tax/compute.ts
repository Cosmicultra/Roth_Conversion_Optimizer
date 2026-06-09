import type { IllustrationFiling } from "@/lib/federal-tax-illustration";
import { STATE_TAX_PROFILES, normalizeStateCode } from "@/lib/state-income-tax/profiles";
import type { StateCode, StateRateBand, StateTaxProfile } from "@/lib/state-income-tax/types";

function progressiveTaxOnTaxable(taxable: number, brackets: StateRateBand[]): number {
  const t = Math.max(0, taxable);
  let tax = 0;
  for (const band of brackets) {
    if (t <= band.low) break;
    const incomeInBand = Math.min(t, band.high) - band.low;
    if (incomeInBand > 0) tax += incomeInBand * band.rate;
  }
  return tax;
}

export function resolveStateProfile(stateCode: string | undefined): StateTaxProfile | null {
  const code = normalizeStateCode(stateCode);
  if (!code) return null;
  return STATE_TAX_PROFILES[code];
}

/** State taxable ordinary income from federal-style ordinary components. */
export function stateTaxableOrdinaryIncome(params: {
  profile: StateTaxProfile | null;
  filing: IllustrationFiling;
  iraOrdinaryDistributions: number;
  taxableSocialSecurity: number;
  otherOrdinary?: number;
  grossConversion?: number;
}): number {
  if (!params.profile?.hasIncomeTax) return 0;

  const ira = Math.max(0, params.iraOrdinaryDistributions);
  const conversion = Math.max(0, params.grossConversion ?? 0);
  const other = Math.max(0, params.otherOrdinary ?? 0);

  let ss = Math.max(0, params.taxableSocialSecurity);
  if (params.profile.socialSecurityTreatment === "exempt") ss = 0;

  return other + ira + ss + conversion;
}

export function stateIncomeTaxOnTaxable(
  taxableOrdinaryIncome: number,
  profile: StateTaxProfile | null,
  filing: IllustrationFiling
): number {
  if (!profile?.hasIncomeTax) return 0;
  const t = Math.max(0, taxableOrdinaryIncome);

  if (profile.flatRate != null) return t * profile.flatRate;

  const brackets = profile.brackets[filing] ?? profile.brackets.single ?? [];
  if (brackets.length === 0) return 0;
  return progressiveTaxOnTaxable(t, brackets);
}

export function stateIncomeTaxFromStack(params: {
  stateCode: string | undefined;
  filing: IllustrationFiling;
  iraOrdinaryDistributions: number;
  taxableSocialSecurity: number;
  otherOrdinary?: number;
  grossConversion?: number;
}): number {
  const profile = resolveStateProfile(params.stateCode);
  const taxable = stateTaxableOrdinaryIncome({
    profile,
    filing: params.filing,
    iraOrdinaryDistributions: params.iraOrdinaryDistributions,
    taxableSocialSecurity: params.taxableSocialSecurity,
    otherOrdinary: params.otherOrdinary,
    grossConversion: params.grossConversion,
  });
  return stateIncomeTaxOnTaxable(taxable, profile, params.filing);
}

export function incrementalStateTaxFromConversionStack(params: {
  stateCode: string | undefined;
  filing: IllustrationFiling;
  iraOrdinaryDistributions: number;
  taxableSocialSecurity: number;
  otherOrdinary?: number;
  grossConversionAmount: number;
}): number {
  const base = stateIncomeTaxFromStack({ ...params, grossConversion: 0 });
  const withConv = stateIncomeTaxFromStack({
    ...params,
    grossConversion: params.grossConversionAmount,
  });
  return Math.max(0, withConv - base);
}

export function hasStateIncomeTax(stateCode: string | undefined): boolean {
  return resolveStateProfile(stateCode)?.hasIncomeTax === true;
}

export function allStateCodes(): StateCode[] {
  return Object.keys(STATE_TAX_PROFILES) as StateCode[];
}
