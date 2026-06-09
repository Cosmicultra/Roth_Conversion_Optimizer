import type { IllustrationFiling } from "@/lib/federal-tax-illustration";

/**
 * IRS Publication 915 provisional income — taxable portion of Social Security benefits.
 * otherOrdinaryIncome excludes gross Social Security (IRA distributions, wages, etc.).
 */

const THRESHOLDS: Record<IllustrationFiling, { tier1: number; tier2: number }> = {
  single: { tier1: 25_000, tier2: 34_000 },
  married: { tier1: 32_000, tier2: 44_000 },
};

export function provisionalIncomeForSocialSecurity(params: {
  grossSocialSecurityBenefits: number;
  otherOrdinaryIncome: number;
  taxExemptInterest?: number;
}): number {
  const ss = Math.max(0, params.grossSocialSecurityBenefits);
  const other = Math.max(0, params.otherOrdinaryIncome);
  const exempt = Math.max(0, params.taxExemptInterest ?? 0);
  return other + exempt + 0.5 * ss;
}

/** Taxable Social Security benefits included in federal ordinary income (illustration). */
export function taxableSocialSecurityBenefits(params: {
  filing: IllustrationFiling;
  grossSocialSecurityBenefits: number;
  otherOrdinaryIncome: number;
  taxExemptInterest?: number;
}): number {
  const ss = Math.max(0, params.grossSocialSecurityBenefits);
  if (ss <= 0) return 0;

  const combined = provisionalIncomeForSocialSecurity({
    grossSocialSecurityBenefits: ss,
    otherOrdinaryIncome: params.otherOrdinaryIncome,
    taxExemptInterest: params.taxExemptInterest,
  });
  const { tier1, tier2 } = THRESHOLDS[params.filing];
  const tierSpan = tier2 - tier1;

  if (combined <= tier1) return 0;

  if (combined <= tier2) {
    return Math.min(0.5 * ss, 0.5 * (combined - tier1));
  }

  const tier2Amount = 0.85 * (combined - tier2) + 0.5 * tierSpan;
  return Math.min(0.85 * ss, tier2Amount);
}
