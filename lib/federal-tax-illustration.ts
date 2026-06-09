/**
 * Approximate ordinary federal income tax + IRMAA for advisor illustrations only.
 * 2025 brackets and standard deductions (Rev. Proc. 2024-40) — not tax advice.
 */

/** Married filing jointly vs single — uses `married` from intake when true. */
export type IllustrationFiling = "married" | "single";

export function illustrationFiling(married: boolean): IllustrationFiling {
  return married ? "married" : "single";
}

export type IllustrationDeductionInput = {
  filing: IllustrationFiling;
  /** 0 = illustration start year */
  calendarYearOffset: number;
  clientAge: number;
  /** MFJ only; null/undefined when spouse age unknown */
  spouseAge?: number | null;
  /** When set, replaces standard deduction for federal illustration (itemized / total override). */
  totalDeductionsOverride?: number | null;
};

const DEDUCTION_INFLATION_ANNUAL = 0.025;
const BASE_STD_SINGLE_2025 = 15_750;
const BASE_STD_MFJ_2025 = 31_500;
const ADDITIONAL_65_PER_PERSON_2025 = 1_600;

function deductionInflationFactor(calendarYearOffset: number): number {
  return Math.pow(1 + DEDUCTION_INFLATION_ANNUAL, Math.max(0, calendarYearOffset));
}

function baseStandardDeductionAmount(filing: IllustrationFiling, calendarYearOffset: number): number {
  const base = filing === "married" ? BASE_STD_MFJ_2025 : BASE_STD_SINGLE_2025;
  return Math.round(base * deductionInflationFactor(calendarYearOffset));
}

function additional65PlusDeductionAmount(params: IllustrationDeductionInput): number {
  const perPerson = Math.round(ADDITIONAL_65_PER_PERSON_2025 * deductionInflationFactor(params.calendarYearOffset));
  let count = 0;
  if (params.clientAge >= 65) count += 1;
  if (params.filing === "married" && params.spouseAge != null && params.spouseAge >= 65) count += 1;
  return count * perPerson;
}

export type StandardDeductionBreakdown = {
  total: number;
  base: number;
  additional65Plus: number;
};

export function standardDeductionBreakdownIllustration(
  params: IllustrationDeductionInput
): StandardDeductionBreakdown {
  const base = baseStandardDeductionAmount(params.filing, params.calendarYearOffset);
  const additional65Plus = additional65PlusDeductionAmount(params);
  return { total: base + additional65Plus, base, additional65Plus };
}

/** Total standard deduction (base + age 65+ add-ons) for the illustration year. */
export function standardDeductionIllustration(params: IllustrationDeductionInput): number {
  return standardDeductionBreakdownIllustration(params).total;
}

/** Federal deduction for illustration year: override when set, else standard. */
export function federalDeductionIllustration(params: IllustrationDeductionInput): number {
  const override = params.totalDeductionsOverride;
  if (override != null && Number.isFinite(override) && override >= 0) {
    return Math.round(override);
  }
  return standardDeductionIllustration(params);
}

export function parseTotalDeductionsAnnual(raw: string | undefined): number | null {
  const s = String(raw ?? "").replace(/[$,]/g, "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

type RateBand = { low: number; high: number; rate: number };

/** Taxable ordinary income brackets (Rev. Proc. 2024-40, tax year 2025, illustration). */
const SINGLE_BRACKETS: RateBand[] = [
  { low: 0, high: 11_925, rate: 0.1 },
  { low: 11_925, high: 48_475, rate: 0.12 },
  { low: 48_475, high: 103_350, rate: 0.22 },
  { low: 103_350, high: 197_300, rate: 0.24 },
  { low: 197_300, high: 250_525, rate: 0.32 },
  { low: 250_525, high: 626_350, rate: 0.35 },
  { low: 626_350, high: Number.POSITIVE_INFINITY, rate: 0.37 },
];

const MFJ_BRACKETS: RateBand[] = [
  { low: 0, high: 23_850, rate: 0.1 },
  { low: 23_850, high: 96_950, rate: 0.12 },
  { low: 96_950, high: 206_700, rate: 0.22 },
  { low: 206_700, high: 394_600, rate: 0.24 },
  { low: 394_600, high: 501_050, rate: 0.32 },
  { low: 501_050, high: 751_600, rate: 0.35 },
  { low: 751_600, high: Number.POSITIVE_INFINITY, rate: 0.37 },
];

/** Progressive tax on positive taxable ordinary income only. */
export function federalIncomeTaxOnTaxable(taxableOrdinaryIncome: number, filing: IllustrationFiling): number {
  const t = Math.max(0, taxableOrdinaryIncome);
  const brackets = filing === "married" ? MFJ_BRACKETS : SINGLE_BRACKETS;
  let tax = 0;
  for (const band of brackets) {
    if (t <= band.low) break;
    const incomeInBand = Math.min(t, band.high) - band.low;
    if (incomeInBand > 0) tax += incomeInBand * band.rate;
  }
  return tax;
}

export function taxableOrdinaryAfterDeduction(
  grossOrdinaryIncome: number,
  deduction: IllustrationDeductionInput
): number {
  const sd = federalDeductionIllustration(deduction);
  return Math.max(0, grossOrdinaryIncome - sd);
}

/** Federal income tax on gross ordinary income after standard deduction (age/year-aware). */
export function federalIncomeTaxAfterStandardDeduction(
  grossOrdinaryIncome: number,
  deduction: IllustrationDeductionInput
): number {
  const taxable = taxableOrdinaryAfterDeduction(grossOrdinaryIncome, deduction);
  return federalIncomeTaxOnTaxable(taxable, deduction.filing);
}

/**
 * Extra federal income tax attributable to adding conversion gross to other ordinary gross (same deduction once).
 */
export function incrementalFederalTaxFromConversion(
  otherGrossOrdinaryIncome: number,
  grossConversionAmount: number,
  deduction: IllustrationDeductionInput
): number {
  const sd = federalDeductionIllustration(deduction);
  const baseTax = federalIncomeTaxOnTaxable(Math.max(0, otherGrossOrdinaryIncome - sd), deduction.filing);
  const withConvTax = federalIncomeTaxOnTaxable(
    Math.max(0, otherGrossOrdinaryIncome + grossConversionAmount - sd),
    deduction.filing
  );
  return Math.max(0, withConvTax - baseTax);
}

/** Parse worksheet state tax % string to a 0–1 fraction (0 when blank/invalid). */
export function parseStateTaxRateFraction(raw: string | undefined): number {
  const n = Number(String(raw ?? "").replace(/%/g, "").trim());
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, 100) / 100;
}

/** Flat illustrative state income tax on federal taxable ordinary income. */
export function stateIncomeTaxIllustrative(taxableOrdinaryIncome: number, rateFraction: number): number {
  const t = Math.max(0, taxableOrdinaryIncome);
  const r = Math.max(0, Math.min(1, rateFraction));
  return t * r;
}

/** Incremental state tax from adding conversion gross (parallel to federal incremental). */
export function incrementalStateTaxFromConversion(
  otherGrossOrdinaryIncome: number,
  grossConversionAmount: number,
  deduction: IllustrationDeductionInput,
  rateFraction: number
): number {
  if (rateFraction <= 0) return 0;
  const baseTaxable = taxableOrdinaryAfterDeduction(otherGrossOrdinaryIncome, deduction);
  const withConvTaxable = taxableOrdinaryAfterDeduction(
    otherGrossOrdinaryIncome + grossConversionAmount,
    deduction
  );
  return Math.max(0, stateIncomeTaxIllustrative(withConvTaxable, rateFraction) - stateIncomeTaxIllustrative(baseTaxable, rateFraction));
}

/** Maximum taxable ordinary income allowed before entering the bracket above user's stated marginal (illustration cap). */
const TAXABLE_CEILING_BEFORE_NEXT_BRACKET: Record<string, number> = {
  "10": 11_925,
  "12": 48_475,
  "22": 103_350,
  "24": 197_300,
  "32": 250_525,
  "35": 626_350,
  "37": Number.POSITIVE_INFINITY,
};

const TAXABLE_CEILING_MFJ_BEFORE_NEXT_BRACKET: Record<string, number> = {
  "10": 23_850,
  "12": 96_950,
  "22": 206_700,
  "24": 394_600,
  "32": 501_050,
  "35": 751_600,
  "37": Number.POSITIVE_INFINITY,
};

export function taxableIncomeCeilingForStatedBracket(
  bracketId: string,
  filing: IllustrationFiling
): number {
  const table = filing === "married" ? TAXABLE_CEILING_MFJ_BEFORE_NEXT_BRACKET : TAXABLE_CEILING_BEFORE_NEXT_BRACKET;
  const c = table[bracketId];
  return c ?? TAXABLE_CEILING_BEFORE_NEXT_BRACKET["22"]!;
}

/**
 * Max Roth conversion gross this year trad → Roth, trad balance after growth and RMD = `tradAvailableForConversion`,
 * other gross ordinary already counted = `otherGrossOrdinary` (retirement draws + RMD, etc.).
 */
export function maxRothConversionGrossThisYear(params: {
  otherGrossOrdinaryIncome: number;
  tradBalanceAvailableAfterRmd: number;
  statedBracketId: string;
  deduction: IllustrationDeductionInput;
}): number {
  const sd = federalDeductionIllustration(params.deduction);
  const C = taxableIncomeCeilingForStatedBracket(params.statedBracketId, params.deduction.filing);
  if (!Number.isFinite(C)) return Math.max(0, params.tradBalanceAvailableAfterRmd);

  const og = Math.max(0, params.otherGrossOrdinaryIncome);
  /** Need max(0, og + G - sd) <= C ⇒ G <= C + sd - og when non-negative */
  const capFromBracket = Math.max(0, C + sd - og);
  return Math.min(capFromBracket, Math.max(0, params.tradBalanceAvailableAfterRmd));
}

/** MAGI tiers for illustrative annual IRMAA Part B + D surcharge (combined, single enrollee illustration). */
export function irmaaAnnualSurchargeIllustrative(magi: number, filing: IllustrationFiling): number {
  const thresholds =
    filing === "married"
      ? [206_000, 258_000, 322_000, 386_000, 750_000]
      : [103_000, 129_000, 161_000, 193_000, 500_000];
  const surcharge = [1_264, 3_160, 5_056, 7_096, 9_136];
  let tier = -1;
  for (let i = 0; i < thresholds.length; i++) {
    if (magi > thresholds[i]!) tier = i;
  }
  return tier >= 0 ? surcharge[tier]! : 0;
}

/**
 * Human-readable citation for brackets/deductions baked into illustration math.
 * AdvisorPilot does not query the IRS in real time; parameters are revised in shipped releases when law changes are incorporated.
 */
export const FEDERAL_TAX_ILLUSTRATION_REFERENCE =
  "Ordinary taxable income brackets mirror Rev. Proc. 2024-40 (2025 tax year) for single and MFJ; standard deduction is inflation-indexed from 2025 base with additional amounts for taxpayers age 65+, or total deductions override when entered; IRMAA uses simplified tier surcharges (illustrative only).";
