import type { IllustrationFiling } from "@/lib/federal-tax-illustration";
import { taxableSocialSecurityBenefits } from "@/lib/social-security-taxation";

export type OrdinaryIncomeStackInput = {
  retired: boolean;
  /** Inclusive illustrated AGI before retirement (wages, taxable SS, RMD, etc.). */
  agiAnnual: number;
  grossSocialSecurityBenefits: number;
  /** Traditional IRA ordinary distributions (RMD + portfolio shortfall from IRA). */
  iraOrdinaryDistributions: number;
  filing: IllustrationFiling;
  grossConversion?: number;
};

export type OrdinaryIncomeStackResult = {
  iraOrdinaryDistributions: number;
  taxableSocialSecurity: number;
  otherGrossOrdinaryBeforeConversion: number;
  grossOrdinaryIncludingConversion: number;
  magiForIrmaa: number;
};

/**
 * IRS-shaped ordinary income for bracket cap, tax, and IRMAA.
 * Pre-retirement: intake AGI (inclusive). Retired: taxable SS + IRA ordinary flows.
 */
export function buildOrdinaryIncomeStack(input: OrdinaryIncomeStackInput): OrdinaryIncomeStackResult {
  const conversion = Math.max(0, input.grossConversion ?? 0);

  if (!input.retired) {
    const other = Math.max(0, input.agiAnnual);
    return {
      iraOrdinaryDistributions: 0,
      taxableSocialSecurity: 0,
      otherGrossOrdinaryBeforeConversion: other,
      grossOrdinaryIncludingConversion: other + conversion,
      magiForIrmaa: other + conversion,
    };
  }

  const iraOrdinary = Math.max(0, input.iraOrdinaryDistributions);
  const grossSs = Math.max(0, input.grossSocialSecurityBenefits);
  const taxableSs = taxableSocialSecurityBenefits({
    filing: input.filing,
    grossSocialSecurityBenefits: grossSs,
    otherOrdinaryIncome: iraOrdinary,
  });
  const other = iraOrdinary + taxableSs;

  return {
    iraOrdinaryDistributions: iraOrdinary,
    taxableSocialSecurity: taxableSs,
    otherGrossOrdinaryBeforeConversion: other,
    grossOrdinaryIncludingConversion: other + conversion,
    magiForIrmaa: other + conversion,
  };
}

/** @deprecated Use buildOrdinaryIncomeStack — kept for report-column helpers during migration. */
export function illustratedOrdinaryIncomeBase(params: {
  retired: boolean;
  agiAnnual: number;
  retirementNeedAnnual: number;
}): number {
  return params.retired ? params.retirementNeedAnnual : params.agiAnnual;
}
