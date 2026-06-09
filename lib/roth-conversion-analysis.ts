/**
 * Illustrative Roth conversion vs. stay-traditional + RMD modeling for advisor PDFs.
 * Not tax advice — uses simplified brackets, IRMAA, and RMD factors.
 */

import {
  federalDeductionIllustration,
  incrementalFederalTaxFromConversion,
  federalIncomeTaxAfterStandardDeduction,
  illustrationFiling,
  irmaaAnnualSurchargeIllustrative,
  maxRothConversionGrossThisYear,
  parseTotalDeductionsAnnual,
  standardDeductionBreakdownIllustration,
  taxableOrdinaryAfterDeduction,
  type IllustrationDeductionInput,
  type IllustrationFiling,
} from "@/lib/federal-tax-illustration";
import { parseSurrenderYears } from "@/lib/conversion-deadlines";
import { buildOrdinaryIncomeStack, illustratedOrdinaryIncomeBase } from "@/lib/ordinary-income-stack";
import {
  portfolioIncomeShortfallForAge,
  RETIREMENT_NEED_INFLATION_ANNUAL,
  SOCIAL_SECURITY_COLA_ANNUAL,
} from "@/lib/retirement-income-escalation";
import {
  RMD_DISTRIBUTION_PERIOD,
  rmdAmountFromPriorYearEndBalance,
  rmdDivisorForAge,
  rmdStartAgeForDob,
} from "@/lib/rmd-engine";
import {
  incrementalStateTaxFromConversionStack,
  resolveStateProfile,
  stateIncomeTaxFromStack,
} from "@/lib/state-income-tax";

export { illustratedOrdinaryIncomeBase } from "@/lib/ordinary-income-stack";

export const ROTH_ASSUMPTION_VERSION = "2026-06-irs-ordinary-income-v4";

export type PayConversionTaxFrom = "conversion_account" | "external";

export { RMD_DISTRIBUTION_PERIOD } from "@/lib/rmd-engine";

/** Default illustration RMD start age when DOB not provided. */
export const RMD_ILLUSTRATION_START_AGE = 73;

/** Divisor for Uniform Lifetime RMD factor; null below RMD start age. Also used by FIA qualified illustration. */
export function uniformLifetimeRmdDivisor(
  age: number,
  rmdStartAge: number = RMD_ILLUSTRATION_START_AGE
): number | null {
  return rmdDivisorForAge({
    age,
    rmdStartAge,
    marriedFilingJointly: false,
    clientAge: age,
    spouseAge: null,
  });
}

/** Kept for UI / legacy id checks; Roth model uses progressive tax + standard deduction instead. */
export const FEDERAL_MARGINAL_RATE: Record<string, number> = {
  "10": 0.1,
  "12": 0.12,
  "22": 0.22,
  "24": 0.24,
  "32": 0.32,
  "35": 0.35,
  "37": 0.37,
};

function conversionTaxTotal(params: {
  otherGrossOrdinaryBeforeConversion: number;
  iraOrdinaryDistributions: number;
  taxableSocialSecurity: number;
  grossConversion: number;
  deduction: IllustrationDeductionInput;
  stateCode: string | undefined;
  filing: IllustrationFiling;
}): number {
  if (params.grossConversion <= 0) return 0;
  const fed = incrementalFederalTaxFromConversion(
    params.otherGrossOrdinaryBeforeConversion,
    params.grossConversion,
    params.deduction
  );
  const state = incrementalStateTaxFromConversionStack({
    stateCode: params.stateCode,
    filing: params.filing,
    iraOrdinaryDistributions: params.iraOrdinaryDistributions,
    taxableSocialSecurity: params.taxableSocialSecurity,
    grossConversionAmount: params.grossConversion,
  });
  return fed + state;
}

function netConversionToRoth(params: {
  grossConversion: number;
  otherGrossOrdinaryBeforeConversion: number;
  iraOrdinaryDistributions: number;
  taxableSocialSecurity: number;
  deduction: IllustrationDeductionInput;
  stateCode: string | undefined;
  filing: IllustrationFiling;
  payConversionTaxFrom: PayConversionTaxFrom;
}): number {
  if (params.grossConversion <= 0) return 0;
  const tax = conversionTaxTotal(params);
  if (params.payConversionTaxFrom === "external") return params.grossConversion;
  return Math.max(0, params.grossConversion - tax);
}

/**
 * Largest gross conversion in [0, maxGross] that keeps total Roth (after growth + net conversion) at or above the entered premium floor.
 */
export function maxGrossConversionRespectingRothFloor(params: {
  rothBalanceAfterGrowth: number;
  maxGross: number;
  otherGrossOrdinaryForBracketCap: number;
  protectedPrincipalFloor: number;
  deduction: IllustrationDeductionInput;
  stateCode?: string;
  filing?: IllustrationFiling;
  iraOrdinaryDistributions?: number;
  taxableSocialSecurity?: number;
  payConversionTaxFrom?: PayConversionTaxFrom;
}): number {
  const maxG = Math.max(0, Math.floor(params.maxGross));
  if (maxG <= 0) return 0;
  const filing = params.filing ?? "single";

  const rothTotalAfter = (gross: number) =>
    params.rothBalanceAfterGrowth +
    netConversionToRoth({
      grossConversion: gross,
      otherGrossOrdinaryBeforeConversion: params.otherGrossOrdinaryForBracketCap,
      iraOrdinaryDistributions: params.iraOrdinaryDistributions ?? 0,
      taxableSocialSecurity: params.taxableSocialSecurity ?? 0,
      deduction: params.deduction,
      stateCode: params.stateCode,
      filing,
      payConversionTaxFrom:
        params.payConversionTaxFrom === "external" ? "external" : "conversion_account",
    });

  const satisfies = (gross: number) => rothTotalAfter(gross) >= params.protectedPrincipalFloor;

  if (!satisfies(maxG)) {
    if (!satisfies(0)) return 0;
    let lo = 0;
    let hi = maxG;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (satisfies(mid)) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  let lo = 0;
  let hi = maxG;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (satisfies(mid)) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * Roth path growth (legacy illustration schedule): 4% annually through age 69, 10% from age 70 onward.
 * The main worksheet-driven model prefers {@link rothPathGrowthAnnual} (10% or FIC rate).
 */
export function rothPathReturnForAge(age: number): number {
  return age < 70 ? 0.04 : 0.1;
}

/** Parse "10", "10%", or "0.10" into an annual decimal return. */
export function parseAnnualReturnFromPercentField(raw: string | undefined): number | null {
  const n = Number(String(raw ?? "").replace(/%/g, "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n > 1 ? n / 100 : n;
}

/** Non-negative whole years; blank → null; invalid → null. */
function parseNonNegativeIntegerYears(raw: string | undefined): number | null {
  const s = String(raw ?? "").replace(/,/g, "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

/**
 * Roth-path growth for FIC worksheet: trailing bonus adds to contract rate for the first
 * `trailBonusYears`; remaining years inside the surrender window use contract rate only.
 * From `surrenderYears` onward (0-based offset), growth matches {@link stayTraditionalReturn}.
 */
export function computeFicRothGrowthRateForYear(params: {
  yearOffset: number;
  surrenderYears: number | null;
  trailBonusYears: number;
  contractRateAnnual: number;
  trailingBonusAnnual: number;
  postSurrenderRateAnnual: number;
}): number {
  const inSurrender =
    params.surrenderYears == null ? true : params.yearOffset < params.surrenderYears;
  if (!inSurrender) return params.postSurrenderRateAnnual;
  const trail = Math.max(0, Math.floor(params.trailBonusYears));
  const extra = params.yearOffset < trail ? params.trailingBonusAnnual : 0;
  return params.contractRateAnnual + extra;
}

/**
 * Roth conversion bucket growth: flat 10% when not using a fixed indexed contract worksheet path;
 * otherwise contract estimated annual return if parseable (else 10%).
 * For the full per-year FIC schedule (trail + surrender + post-surrender), see
 * {@link computeFicRothGrowthRateForYear} inside {@link buildRothConversionModel}.
 */
export function rothPathGrowthAnnual(params: {
  useFixedIndexContract: boolean;
  contractEstimatedRateOfReturnPct: string | undefined;
}): number {
  if (!params.useFixedIndexContract) return 0.1;
  const d = parseAnnualReturnFromPercentField(params.contractEstimatedRateOfReturnPct);
  return d ?? 0.1;
}

export type StayTraditionalYearRow = {
  calendarYearOffset: number;
  age: number;
  yearStartBalance: number;
  growthRate: number;
  rmd: number;
  /** Total spendable need from intake (Q5) in retirement years; 0 before retirement age. */
  retirementNeedAnnual: number;
  /** Annual gross Social Security (Q6) included in satisfying that need when taking benefits. */
  socialSecurityAnnualGross: number;
  /** Amount of Q5 need still funded from IRA after Social Security (illustration). */
  portfolioIncomeShortfall: number;
  /** Retirement need modeled as non-IRA ordinary income when not sourced from qualified account. */
  nonIraRetirementIncome: number;
  /** Total distribution from IRA: max(RMD, shortfall) in retirement so RMD is always satisfied. */
  totalIraDistribution: number;
  /** PDF "Income": illustrated AGI before retirement age only; annual spendable retirement income at/after retirement. */
  reportIncomeAnnual: number;
  endBalance: number;
  /** gross ordinary for tax / IRMAA: modeled SS plus IRA distributions (illustration). */
  totalOrdinaryForIllustration: number;
  standardDeductionTotal: number;
  additionalDeduction65Plus: number;
  illustrativeFederalTax: number;
  illustrativeStateTax: number;
  irmaaSurchargeAnnual: number;
};

export type RothConversionYearRow = {
  sequence: number;
  age: number;
  /** RMD From traditional IRA in conversion phase (IRS rules apply through age < converted); 0 in Roth-only years. */
  rmdTraditional: number;
  /** MAGI-linked illustrative IRMAA; 0 in Roth-only phase (no surcharge from Roth dist.). */
  irmaaSurchargeAnnual: number;
  /** Conversion-premium sleeve at year start (excludes income holdout; includes FIC premium bonus when modeled). */
  yearStartTraditional: number;
  yearStartRoth: number;
  growthRate: number;
  balanceBeforeConversion: number;
  grossConversion: number;
  illustrativeTaxOnConversion: number;
  netConversionToRoth: number;
  endTraditionalBalance: number;
  totalRothBalance: number;
  capFromBracketConversion: number;
  retirementIncomeAnnual: number;
  /** PDF "Income" column (AGI before retirement; spendable retirement income need when retired). */
  reportIncomeAnnual: number;
  /** IRA dollars withdrawn for retirement income (after SS) before conversion that year; 0 when not sourced from account. */
  portfolioIncomeWithdrawal: number;
  rothOnlyPhase: boolean;
};

export type StayTraditionalTotals = {
  totalRmdWithdrawals: number;
  totalTaxAttributableToRmds: number;
  totalIrmaaPaid: number;
};

export type RothConversionTotals = {
  totalRmdTraditional: number;
  totalIrmaaPaid: number;
  totalGrossConversion: number;
  totalConversionTaxPaid: number;
  totalNetConversionToRoth: number;
  endingTotalRothBalance: number;
};

/** Withdraw from holdout sleeve first, then conversion sleeve. */
function withdrawFromTraditionalSleeves(
  holdoutBalance: number,
  convertBalance: number,
  amount: number
): { holdoutBalance: number; convertBalance: number } {
  const need = Math.max(0, amount);
  const fromHoldout = Math.min(holdoutBalance, need);
  const fromConvert = Math.min(convertBalance, Math.max(0, need - fromHoldout));
  return {
    holdoutBalance: Math.max(0, holdoutBalance - fromHoldout),
    convertBalance: Math.max(0, convertBalance - fromConvert),
  };
}

export type RothConversionModelResult = {
  assumptions: string[];
  /** Modeled qualified starting balance for the stay-traditional path (no FIC premium bonus). */
  startingBalance: number;
  /** Conversion premium modeled on the Roth path (excludes income holdout sleeve). */
  conversionPremium: number;
  /** Non-converting traditional sleeve reserved for retirement income during conversion (when modeled). */
  incomeHoldoutReserve: number;
  /** Conversion premium + income holdout (total qualified IRA pool on Roth path). */
  totalTraditionalPool: number;
  /** First-year traditional balance on the Roth illustration path (includes FIC premium bonus when modeled). */
  rothPathStartingQualifiedBalance: number;
  startingAge: number;
  retirementAge: number;
  retirementSpendableIncomeAnnual: number;
  /** Combined annual gross Social Security (client + spouse monthly x 12) when taking benefits; 0 otherwise. */
  annualSocialSecurityGross: number;
  federalBracketId: string;
  /** Stated marginal bracket band used as conversion ceiling (illustrative). */
  marginalRateNominalPct: number;
  marriedFilingJointly: boolean;
  illustrationFiling: IllustrationFiling;
  standardDeductionAnnual: number;
  /** Narrative inserted into disclosures / headings (Roth bucket return assumptions). */
  rothGrowthAssumptionLabel: string;
  annualAgiPreRetirementIllustration: number;
  stayTraditional: StayTraditionalYearRow[];
  stayTraditionalTotals: StayTraditionalTotals;
  rothConversion: RothConversionYearRow[];
  rothConversionTotals: RothConversionTotals;
};

export function buildRothConversionModel(input: {
  totalAccountValue: number;
  /** Full qualified IRA balance for stay-traditional path; defaults to {@link totalAccountValue}. */
  stayTraditionalStartingBalance?: number;
  currentAge: number;
  retirementAge: number;
  retirementSpendableIncomeAnnual: number;
  /** Gross Social Security per year from intake (Q6); 0 if not taking or blank. */
  annualSocialSecurityGross?: number;
  /** Age when household Social Security benefits begin (resolved claim age). */
  socialSecurityStartAge?: number;
  federalTaxBracketId: string;
  /** When true, use MFJ brackets, standard deduction, and IRMAA thresholds (illustration). */
  marriedFilingJointly?: boolean;
  stayTraditionalReturn?: number;
  endAge?: number;
  /**
   * Inclusive illustrated AGI before retirement (Form 1040 line 11 style: wages, taxable SS, RMD, etc.).
   * Used as the sole ordinary-income base for bracket cap, tax, and IRMAA before retirement age, and in the report Income column.
   */
  annualAdjustedGrossIncomePreRetirement?: number;
  /** When true, cap each year's conversion so total Roth after net conversion stays at or above the entered premium (`totalAccountValue`); when false, convert as fast as bracket allows. */
  protectInitialInvestment?: boolean;
  /** Worksheet: using fixed index contract path (affects Roth bucket return assumption). */
  useFixedIndexContract?: boolean;
  /** Worksheet FIC estimated rate of return % string; used when useFixedIndexContract. */
  contractEstimatedRateOfReturnPct?: string;
  /** Premium bonus adds this percent to Roth-path starting qualified balance only (stay-traditional unchanged). */
  ficPremiumBonusPct?: string;
  /** Adds to contract rate for the first `ficTrailBonusYears` Roth-path illustration years inside surrender (when FIC). */
  ficTrailingBonusPct?: string;
  /** Count of Roth-path illustration years that receive trailing bonus on top of contract rate (when FIC). */
  ficTrailBonusYears?: string;
  /** After this many Roth-path illustration years, Roth growth steps up to {@link stayTraditionalReturn} when FIC. Blank keeps contract-phase rates through the modeled horizon. */
  ficSurrenderYears?: string;
  /** Spouse age at illustration start (MFJ); null when unknown or not married. */
  spouseStartAge?: number | null;
  /** @deprecated Use stateOfResidence — legacy flat state tax % string. */
  stateTaxRatePct?: string;
  /** US state or DC of residence; blank = no state income tax. */
  stateOfResidence?: string;
  /** Optional total federal deductions override; blank uses standard deduction. */
  totalDeductionsAnnual?: string;
  /** Client DOB (YYYY-MM-DD) for SECURE / SECURE 2.0 RMD start age. */
  clientDob?: string;
  /** Override RMD illustration start age; derived from DOB when omitted. */
  rmdStartAge?: number;
  /** Pay conversion tax from conversion account (default) or external source. */
  payConversionTaxFrom?: PayConversionTaxFrom;
  /** When true, retirement spendable need after SS is funded from the qualified IRA/conversion bucket. */
  retirementIncomeFromConversionAccount: boolean;
  /** Dollars held in traditional IRA but not converted; funds retirement income withdrawals first. */
  incomeHoldoutReserve?: number;
}): RothConversionModelResult {
  const stayR = input.stayTraditionalReturn ?? 0.1;
  const endAge = input.endAge ?? 95;
  const bracketId = input.federalTaxBracketId in FEDERAL_MARGINAL_RATE ? input.federalTaxBracketId : "22";
  const nominalMarginal = Math.round((FEDERAL_MARGINAL_RATE[bracketId] ?? 0.22) * 100);

  const need = Math.max(0, Number(input.retirementSpendableIncomeAnnual) || 0);
  const annualSS = Math.max(0, Number(input.annualSocialSecurityGross) || 0);
  const startAge = Math.max(0, Math.floor(Number(input.currentAge) || 0));
  const retireAge = Math.max(0, Math.floor(Number(input.retirementAge) || 67));
  const ssStartAge =
    annualSS > 0
      ? Math.max(
          0,
          Math.floor(
            Number(input.socialSecurityStartAge) ||
              Math.min(70, Math.max(50, retireAge))
          )
        )
      : retireAge;
  const startBal = Math.max(0, Number(input.totalAccountValue) || 0);
  const stayStartBal = Math.max(
    0,
    Number(input.stayTraditionalStartingBalance ?? input.totalAccountValue) || 0
  );
  const incomeHoldoutReserve = Math.max(0, Number(input.incomeHoldoutReserve) || 0);
  const totalTraditionalPool = startBal + incomeHoldoutReserve;
  const married = Boolean(input.marriedFilingJointly);
  const filing = illustrationFiling(married);
  const spouseStartAge =
    married && input.spouseStartAge != null && Number.isFinite(input.spouseStartAge)
      ? Math.floor(input.spouseStartAge)
      : null;
  const stateCode = String(input.stateOfResidence ?? "").trim().toUpperCase() || undefined;
  const stateProfile = resolveStateProfile(stateCode);
  const totalDeductionsOverride = parseTotalDeductionsAnnual(input.totalDeductionsAnnual);
  const payConversionTaxFrom: PayConversionTaxFrom =
    input.payConversionTaxFrom === "external" ? "external" : "conversion_account";
  const rmdStartAge = Math.max(
    72,
    Math.floor(Number(input.rmdStartAge) || rmdStartAgeForDob(input.clientDob))
  );
  const fundNeedFromIra = input.retirementIncomeFromConversionAccount === true;

  const rmdDivisor = (age: number) =>
    rmdDivisorForAge({
      age,
      rmdStartAge,
      marriedFilingJointly: married,
      clientAge: age,
      spouseAge: spouseStartAge != null ? spouseStartAge + (age - startAge) : null,
    });

  const deductionInputForAge = (age: number): IllustrationDeductionInput => ({
    filing,
    calendarYearOffset: age - startAge,
    clientAge: age,
    spouseAge: spouseStartAge != null ? spouseStartAge + (age - startAge) : null,
    totalDeductionsOverride,
  });

  const startDeduction = standardDeductionBreakdownIllustration(deductionInputForAge(startAge));
  const sd = startDeduction.total;
  const agiAnnual = Math.max(0, Number(input.annualAdjustedGrossIncomePreRetirement) || 0);
  const protectPrincipal = Boolean(input.protectInitialInvestment);
  const useFic = Boolean(input.useFixedIndexContract);
  const contractRateAnnual = rothPathGrowthAnnual({
    useFixedIndexContract: useFic,
    contractEstimatedRateOfReturnPct: input.contractEstimatedRateOfReturnPct,
  });
  const premiumBonusFrac = useFic ? parseAnnualReturnFromPercentField(input.ficPremiumBonusPct) ?? 0 : 0;
  const trailingBonusFrac = useFic ? parseAnnualReturnFromPercentField(input.ficTrailingBonusPct) ?? 0 : 0;
  const surrenderYearsParsed = useFic ? parseSurrenderYears(input.ficSurrenderYears) : null;
  const trailBonusYearsN = useFic ? parseNonNegativeIntegerYears(input.ficTrailBonusYears) ?? 0 : 0;

  const rothPathStartingQualifiedBalance =
    startBal > 0 && useFic ? startBal * (1 + Math.max(0, premiumBonusFrac)) : startBal;

  const rothGrowthForOffset = (yearOffset: number) =>
    !useFic
      ? 0.1
      : computeFicRothGrowthRateForYear({
          yearOffset,
          surrenderYears: surrenderYearsParsed,
          trailBonusYears: trailBonusYearsN,
          contractRateAnnual,
          trailingBonusAnnual: Math.max(0, trailingBonusFrac),
          postSurrenderRateAnnual: stayR,
        });

  const surrenderWindowText =
    surrenderYearsParsed == null
      ? "Surrender years left blank — Roth path keeps contract-phase returns through the modeled horizon (no automatic step-up to current allocation)."
      : `For the first ${surrenderYearsParsed} Roth-path illustration year(s), returns follow the worksheet contract phase; afterward Roth-path growth matches current allocation (${(stayR * 100).toFixed(0)}%).`;

  const rothGrowthAssumptionLabel = useFic
    ? [
        premiumBonusFrac > 0 ? `Premium bonus boosts Roth-path starting qualified balance by ${(premiumBonusFrac * 100).toFixed(2)}% (stay-traditional path omits).` : null,
        surrenderWindowText,
        `Trailing bonus (${(trailingBonusFrac * 100).toFixed(2)}%) adds to contract ${(contractRateAnnual * 100).toFixed(2)}% for the first ${trailBonusYearsN} illustration year(s) of that surrender phase; remaining surrender-phase years use contract ${(contractRateAnnual * 100).toFixed(2)}% only.`,
        "Illustration only — confirm with carrier prospectus or illustration.",
      ]
        .filter((s): s is string => Boolean(s))
        .join(" ")
    : "Roth path balance growth: 10% annually (historical-style S&P 500 long-run growth illustration; not a forecast).";

  const assumptions = [
    `Assumption version: ${ROTH_ASSUMPTION_VERSION}.`,
    "Illustration only — not tax or investment advice. Confirm assumptions with the client and their CPA.",
    useFic && premiumBonusFrac > 0
      ? `Roth conversion path begins with conversion premium plus a ${(premiumBonusFrac * 100).toFixed(2)}% premium bonus (${rothPathStartingQualifiedBalance.toLocaleString("en-US")}); current-allocation path uses full qualified balance ${stayStartBal.toLocaleString("en-US")} without that bonus. Paths are otherwise not cross-linked.`
      : stayStartBal !== startBal || incomeHoldoutReserve > 0
        ? `Current allocation path begins with full qualified balance ${stayStartBal.toLocaleString("en-US")}; Roth conversion path models conversion premium ${startBal.toLocaleString("en-US")}${incomeHoldoutReserve > 0 ? ` plus income holdout ${incomeHoldoutReserve.toLocaleString("en-US")}` : ""}. Paths are not cross-linked.`
        : "Current allocation and Roth conversion paths each begin with the same starting qualified balance and are not cross-linked.",
    filing === "married"
      ? `Filing illustration: married filing jointly — standard deduction about ${sd.toLocaleString("en-US")}/yr at start (inflation-indexed 2025 base plus age 65+ add-ons per spouse); ordinary tax uses progressive MFJ taxable income brackets (2025). IRMAA uses illustrative married thresholds.`
      : `Filing illustration: single — standard deduction about ${sd.toLocaleString("en-US")}/yr at start (inflation-indexed 2025 base plus age 65+ add-on when applicable); progressive single brackets (2025). IRMAA uses illustrative single thresholds.`,
    `Current allocation (stay-traditional): ${(stayR * 100).toFixed(0)}% annual growth; RMDs begin at age 73 using Uniform Lifetime divisors (IRS tables).`,
    protectPrincipal
      ? `Protect initial investment: convert as fast as the stated marginal bracket allows each year; after the traditional IRA is depleted, illustrative total Roth must be at or above the entered premium (${startBal.toLocaleString("en-US")}) — conversion taxes may reduce net below gross premium.`
      : "Roth conversion pacing: maximize annual conversion within the stated marginal bracket ceiling until the traditional IRA is depleted (no ending Roth floor).",
    useFic && surrenderYearsParsed != null
      ? `FIC conversion deadline: traditional IRA conversion sleeve must be fully depleted by age ${startAge + surrenderYearsParsed - 1} (within ${surrenderYearsParsed} illustration year(s) of contract surrender), or sooner if pre-RMD or age-${endAge} horizon binds.`
      : null,
    startAge > retireAge
      ? "Report Income column (Current allocation and Roth tables): before intake retirement age, shows illustrated AGI only; at/after intake retirement age, shows total retirement income need (3% annual inflation from illustration start when already retired)."
      : "Report Income column (Current allocation and Roth tables): before intake retirement age, shows illustrated AGI only; at/after intake retirement age, shows total retirement income need (3% annual inflation from retirement age).",
    agiAnnual > 0
      ? `Pre-retirement ordinary income for bracket cap, tax, and IRMAA: illustrated AGI about ${agiAnnual.toLocaleString("en-US")}/yr (inclusive of wages, Social Security, RMD, and other sources on intake; not stacked with future retirement need or modeled IRA flows).`
      : "Pre-retirement illustrated AGI: not modeled (zero or blank).",
    `At/after retirement age, ordinary income for bracket cap, tax, and IRMAA uses inflated total retirement income need only (gross, includes Social Security on intake; modeled IRA distributions are not added on top).`,
    startAge > retireAge
      ? `Total retirement income need: ${need.toLocaleString("en-US")}/yr at illustration start age ${startAge} (gross, includes Social Security); illustrated with ${(RETIREMENT_NEED_INFLATION_ANNUAL * 100).toFixed(1)}% annual inflation from age ${startAge}.`
      : `Total retirement income need: ${need.toLocaleString("en-US")}/yr at retirement (gross, includes Social Security); illustrated with ${(RETIREMENT_NEED_INFLATION_ANNUAL * 100).toFixed(1)}% annual inflation from retirement age.`,
    annualSS > 0
      ? `Social Security: ${annualSS.toLocaleString("en-US")}/yr gross at benefit start (age ${ssStartAge}); ${(SOCIAL_SECURITY_COLA_ANNUAL * 100).toFixed(1)}% illustrative COLA compounded each year after benefits begin.`
      : null,
    `Roth conversion path: while assets remain in traditional IRA, modeled RMDs apply from age ${rmdStartAge}; conversions stay within the stated marginal bracket ceiling (after deductions). Through age ${endAge}.`,
    annualSS > 0
      ? fundNeedFromIra
        ? "Qualified IRA/conversion bucket funds the gap between inflated total retirement need and inflated Social Security during retirement."
        : "Gap between inflated total retirement need and inflated Social Security is modeled as non-IRA income; qualified account distributions are RMD-only (plus conversions on the Roth path)."
      : fundNeedFromIra
        ? "Social Security: not modeled (not taking or no amounts on intake). Inflated total retirement need is modeled from the qualified IRA."
        : "Social Security: not modeled (not taking or no amounts on intake). Inflated total retirement need is modeled as non-IRA income; qualified account distributions are RMD-only.",
    stateProfile?.hasIncomeTax
      ? `State income tax: ${stateProfile.name} (${stateProfile.code}) progressive/flat illustrative brackets (2025); Social Security treatment: ${stateProfile.socialSecurityTreatment}.`
      : "State income tax: not modeled (no state selected or no state income tax).",
    totalDeductionsOverride != null
      ? `Federal deductions: total override ${totalDeductionsOverride.toLocaleString("en-US")}/yr (replaces standard deduction).`
      : null,
    payConversionTaxFrom === "external"
      ? "Conversion tax: illustrated as paid from an external source — net Roth conversion equals gross; taxes still shown for bracket illustration."
      : "Conversion tax: illustrated as paid from conversion proceeds (reduces net Roth).",
    `RMD illustration start age: ${rmdStartAge} (SECURE / SECURE 2.0 from date of birth when provided). Joint Life table when MFJ and spouse is more than 10 years younger.`,
    `Ordinary income for federal/state tax and bracket cap: pre-retirement inclusive AGI; after retirement taxable Social Security plus IRA distributions (RMD and retirement income from IRA), not gross retirement need.`,
    incomeHoldoutReserve > 0
      ? `Income holdout reserve: ${incomeHoldoutReserve.toLocaleString("en-US")} held in traditional IRA (not converted) to fund retirement income during conversion; conversion premium ${startBal.toLocaleString("en-US")} (total qualified pool ${totalTraditionalPool.toLocaleString("en-US")}). Withdrawals draw from holdout first.`
      : null,
  ].filter((s): s is string => Boolean(s));

  const stayTraditional: StayTraditionalYearRow[] = [];
  let bStay = stayStartBal;
  let priorDec31Stay = stayStartBal;

  for (let age = startAge; age <= endAge; age++) {
    const yearStartStay = bStay;
    const rmdBase = age >= rmdStartAge ? priorDec31Stay : 0;
    const rmd =
      age >= rmdStartAge
        ? rmdAmountFromPriorYearEndBalance(rmdBase, {
            age,
            rmdStartAge,
            marriedFilingJointly: married,
            clientAge: age,
            spouseAge: spouseStartAge != null ? spouseStartAge + (age - startAge) : null,
          })
        : 0;
    const retired = age >= retireAge;
    const incomeParts = portfolioIncomeShortfallForAge({
      age,
      retireAge,
      ssStartAge,
      baseNeed: need,
      baseSS: annualSS,
      fundNeedFromIra,
      illustrationStartAge: startAge,
    });
    const { retirementNeedAnnual, socialSecurityAnnualGross: ssThisYear, portfolioIncomeShortfall } =
      incomeParts;
    const nonIraRetirementIncome =
      retired && !fundNeedFromIra
        ? Math.max(0, retirementNeedAnnual - ssThisYear)
        : 0;
    const totalIraDistribution =
      retired ? Math.max(rmd, portfolioIncomeShortfall) : rmd;
    const incomeStack = buildOrdinaryIncomeStack({
      retired,
      agiAnnual,
      grossSocialSecurityBenefits: ssThisYear,
      iraOrdinaryDistributions: totalIraDistribution,
      filing,
    });
    const totalOrd = incomeStack.grossOrdinaryIncludingConversion;
    const dedInput = deductionInputForAge(age);
    const dedBreakdown = standardDeductionBreakdownIllustration(dedInput);
    const federalDed = federalDeductionIllustration(dedInput);
    const taxableOrd = taxableOrdinaryAfterDeduction(totalOrd, dedInput);
    const illustrativeFedTax = federalIncomeTaxAfterStandardDeduction(totalOrd, dedInput);
    const illustrativeStateTax = stateIncomeTaxFromStack({
      stateCode,
      filing,
      iraOrdinaryDistributions: incomeStack.iraOrdinaryDistributions,
      taxableSocialSecurity: incomeStack.taxableSocialSecurity,
      otherOrdinary: retired ? 0 : incomeStack.otherGrossOrdinaryBeforeConversion,
    });
    const irmaa = irmaaAnnualSurchargeIllustrative(incomeStack.magiForIrmaa, filing);
    const reportIncomeAnnual = retired ? retirementNeedAnnual : agiAnnual;

    const endBal = (yearStartStay - totalIraDistribution) * (1 + stayR);
    priorDec31Stay = endBal;
    stayTraditional.push({
      calendarYearOffset: age - startAge,
      age,
      yearStartBalance: bStay,
      growthRate: stayR,
      rmd,
      retirementNeedAnnual,
      socialSecurityAnnualGross: ssThisYear,
      portfolioIncomeShortfall,
      nonIraRetirementIncome,
      totalIraDistribution,
      reportIncomeAnnual,
      endBalance: endBal,
      totalOrdinaryForIllustration: totalOrd,
      standardDeductionTotal: federalDed,
      additionalDeduction65Plus: dedBreakdown.additional65Plus,
      illustrativeFederalTax: illustrativeFedTax,
      illustrativeStateTax,
      irmaaSurchargeAnnual: irmaa,
    });

    bStay = endBal;
  }

  let totalRmdWithdrawals = 0;
  let totalTaxAttributableToRmds = 0;
  let totalIrmaaPaidStay = 0;
  for (const r of stayTraditional) {
    totalRmdWithdrawals += r.rmd;
    totalIrmaaPaidStay += r.irmaaSurchargeAnnual;
    if (r.totalIraDistribution > 0 && r.totalOrdinaryForIllustration > 0) {
      totalTaxAttributableToRmds += r.illustrativeFederalTax * (r.rmd / r.totalOrdinaryForIllustration);
    }
  }

  const rothConversion: RothConversionYearRow[] = [];
  let bHoldout = incomeHoldoutReserve;
  let bConvert = rothPathStartingQualifiedBalance;
  let rothBalance = 0;
  let sequence = 0;
  let priorDec31Trad = incomeHoldoutReserve + rothPathStartingQualifiedBalance;

  for (let age = startAge; age <= endAge; age++) {
    sequence += 1;
    const yearOffset = age - startAge;
    const rGrowth = rothGrowthForOffset(yearOffset);
    const holdoutAtYearStart = bHoldout;
    const convertAtYearStart = bConvert;
    const tradAtYearStart = holdoutAtYearStart + convertAtYearStart;
    const rothAtYearStart = rothBalance;
    const retired = age >= retireAge;
    const incomeParts = portfolioIncomeShortfallForAge({
      age,
      retireAge,
      ssStartAge,
      baseNeed: need,
      baseSS: annualSS,
      fundNeedFromIra,
      illustrationStartAge: startAge,
    });
    const { retirementNeedAnnual, socialSecurityAnnualGross: ssThisYear, portfolioIncomeShortfall } =
      incomeParts;
    const retirementIncomeAnnual = retirementNeedAnnual;
    const reportIncomeAnnual = retired ? retirementNeedAnnual : agiAnnual;

    if (convertAtYearStart > 0.01) {
      const holdoutAfterGrowth = holdoutAtYearStart * (1 + rGrowth);
      const convertAfterGrowth = convertAtYearStart * (1 + rGrowth);
      const rmdTake =
        age >= rmdStartAge
          ? rmdAmountFromPriorYearEndBalance(priorDec31Trad, {
              age,
              rmdStartAge,
              marriedFilingJointly: married,
              clientAge: age,
              spouseAge: spouseStartAge != null ? spouseStartAge + (age - startAge) : null,
            })
          : 0;
      const totalIraWithdrawalPreConversion = retired ? Math.max(rmdTake, portfolioIncomeShortfall) : rmdTake;
      const afterWithdraw = withdrawFromTraditionalSleeves(
        holdoutAfterGrowth,
        convertAfterGrowth,
        totalIraWithdrawalPreConversion
      );
      const portfolioIncomeWithdrawal =
        retired && fundNeedFromIra
          ? Math.min(portfolioIncomeShortfall, totalIraWithdrawalPreConversion)
          : 0;
      const tradAfterSpendingAndRmd = afterWithdraw.convertBalance;
      const incomeStackPreConv = buildOrdinaryIncomeStack({
        retired,
        agiAnnual,
        grossSocialSecurityBenefits: ssThisYear,
        iraOrdinaryDistributions: totalIraWithdrawalPreConversion,
        filing,
      });
      const otherGrossOrdinaryForBracketCap = incomeStackPreConv.otherGrossOrdinaryBeforeConversion;
      const dedInput = deductionInputForAge(age);

      const bracketMaxConvThisYear = maxRothConversionGrossThisYear({
        otherGrossOrdinaryIncome: otherGrossOrdinaryForBracketCap,
        tradBalanceAvailableAfterRmd: tradAfterSpendingAndRmd,
        statedBracketId: bracketId,
        deduction: dedInput,
      });
      const maxGrossThisYear = Math.min(bracketMaxConvThisYear, tradAfterSpendingAndRmd);
      const rothAfterGrowth = rothAtYearStart * (1 + rGrowth);
      const grossConv = maxGrossThisYear;

      const taxOnConversion = conversionTaxTotal({
        otherGrossOrdinaryBeforeConversion: otherGrossOrdinaryForBracketCap,
        iraOrdinaryDistributions: incomeStackPreConv.iraOrdinaryDistributions,
        taxableSocialSecurity: incomeStackPreConv.taxableSocialSecurity,
        grossConversion: grossConv,
        deduction: dedInput,
        stateCode,
        filing,
      });
      const net = netConversionToRoth({
        grossConversion: grossConv,
        otherGrossOrdinaryBeforeConversion: otherGrossOrdinaryForBracketCap,
        iraOrdinaryDistributions: incomeStackPreConv.iraOrdinaryDistributions,
        taxableSocialSecurity: incomeStackPreConv.taxableSocialSecurity,
        deduction: dedInput,
        stateCode,
        filing,
        payConversionTaxFrom,
      });
      rothBalance = rothAfterGrowth + net;
      const endTrad = Math.max(0, tradAfterSpendingAndRmd - grossConv);

      const magiRough =
        buildOrdinaryIncomeStack({
          retired,
          agiAnnual,
          grossSocialSecurityBenefits: ssThisYear,
          iraOrdinaryDistributions: totalIraWithdrawalPreConversion,
          filing,
          grossConversion: grossConv,
        }).magiForIrmaa;
      const irmaa = irmaaAnnualSurchargeIllustrative(magiRough, filing);

      const capFromBracketConversion = maxRothConversionGrossThisYear({
        otherGrossOrdinaryIncome: otherGrossOrdinaryForBracketCap,
        tradBalanceAvailableAfterRmd: convertAfterGrowth,
        statedBracketId: bracketId,
        deduction: dedInput,
      });

      rothConversion.push({
        sequence,
        age,
        rmdTraditional: rmdTake,
        irmaaSurchargeAnnual: irmaa,
        yearStartTraditional: convertAtYearStart,
        yearStartRoth: rothAtYearStart,
        growthRate: rGrowth,
        balanceBeforeConversion: tradAfterSpendingAndRmd,
        grossConversion: grossConv,
        illustrativeTaxOnConversion: taxOnConversion,
        netConversionToRoth: net,
        endTraditionalBalance: endTrad,
        totalRothBalance: rothBalance,
        capFromBracketConversion,
        retirementIncomeAnnual,
        reportIncomeAnnual,
        portfolioIncomeWithdrawal,
        rothOnlyPhase: false,
      });

      bHoldout = afterWithdraw.holdoutBalance;
      bConvert = endTrad;
      priorDec31Trad = afterWithdraw.holdoutBalance + endTrad;
    } else if (holdoutAtYearStart > 0.01) {
      /** Conversion sleeve depleted; income holdout remains traditional (RMD / retirement withdrawals only). */
      const holdoutAfterGrowth = holdoutAtYearStart * (1 + rGrowth);
      const rmdTake =
        age >= rmdStartAge
          ? rmdAmountFromPriorYearEndBalance(priorDec31Trad, {
              age,
              rmdStartAge,
              marriedFilingJointly: married,
              clientAge: age,
              spouseAge: spouseStartAge != null ? spouseStartAge + (age - startAge) : null,
            })
          : 0;
      const totalIraWithdrawal = retired ? Math.max(rmdTake, portfolioIncomeShortfall) : rmdTake;
      const afterWithdraw = withdrawFromTraditionalSleeves(holdoutAfterGrowth, 0, totalIraWithdrawal);
      const portfolioIncomeWithdrawal =
        retired && fundNeedFromIra
          ? Math.min(portfolioIncomeShortfall, totalIraWithdrawal)
          : 0;
      const magiRough = buildOrdinaryIncomeStack({
        retired,
        agiAnnual,
        grossSocialSecurityBenefits: ssThisYear,
        iraOrdinaryDistributions: totalIraWithdrawal,
        filing,
      }).magiForIrmaa;
      const irmaa = irmaaAnnualSurchargeIllustrative(magiRough, filing);

      rothBalance = rothAtYearStart * (1 + rGrowth);
      rothConversion.push({
        sequence,
        age,
        rmdTraditional: rmdTake,
        irmaaSurchargeAnnual: irmaa,
        yearStartTraditional: 0,
        yearStartRoth: rothAtYearStart,
        growthRate: rGrowth,
        balanceBeforeConversion: 0,
        grossConversion: 0,
        illustrativeTaxOnConversion: 0,
        netConversionToRoth: 0,
        endTraditionalBalance: 0,
        totalRothBalance: rothBalance,
        capFromBracketConversion: 0,
        retirementIncomeAnnual,
        reportIncomeAnnual,
        portfolioIncomeWithdrawal,
        rothOnlyPhase: true,
      });
      bHoldout = afterWithdraw.holdoutBalance;
      bConvert = 0;
      priorDec31Trad = afterWithdraw.holdoutBalance;
    } else {
      /** Roth only: qualified growth; no illustrative IRMAA from distributions. */
      rothBalance = rothAtYearStart * (1 + rGrowth);
      rothConversion.push({
        sequence,
        age,
        rmdTraditional: 0,
        irmaaSurchargeAnnual: 0,
        yearStartTraditional: 0,
        yearStartRoth: rothAtYearStart,
        growthRate: rGrowth,
        balanceBeforeConversion: 0,
        grossConversion: 0,
        illustrativeTaxOnConversion: 0,
        netConversionToRoth: 0,
        endTraditionalBalance: 0,
        totalRothBalance: rothBalance,
        capFromBracketConversion: 0,
        retirementIncomeAnnual: retirementNeedAnnual,
        reportIncomeAnnual,
        portfolioIncomeWithdrawal: 0,
        rothOnlyPhase: true,
      });
      bHoldout = 0;
      bConvert = 0;
    }
  }

  let totalGrossConversion = 0;
  let totalConversionTaxPaid = 0;
  let totalNetConversionToRoth = 0;
  let totalRmdRothTable = 0;
  let totalIrmaaRothTable = 0;
  for (const row of rothConversion) {
    if (!row.rothOnlyPhase) {
      totalGrossConversion += row.grossConversion;
      totalConversionTaxPaid += row.illustrativeTaxOnConversion;
      totalNetConversionToRoth += row.netConversionToRoth;
      totalRmdRothTable += row.rmdTraditional;
      totalIrmaaRothTable += row.irmaaSurchargeAnnual;
    }
  }
  const endingTotalRothBalance = rothConversion.length ? rothConversion[rothConversion.length - 1]!.totalRothBalance : 0;

  if (protectPrincipal) {
    const lastTradRow = [...rothConversion].reverse().find((r) => !r.rothOnlyPhase);
    if (lastTradRow && lastTradRow.endTraditionalBalance > 1) {
      assumptions.push(
        "Protect initial investment: the traditional IRA was not fully depleted within the modeled age horizon — review bracket ceiling, taxes, or horizon."
      );
    } else if (endingTotalRothBalance < startBal) {
      assumptions.push(
        `Protect initial investment: after depleting the traditional IRA, illustrative Roth (${endingTotalRothBalance.toLocaleString("en-US")}) is below the entered premium (${startBal.toLocaleString("en-US")}) — conversion taxes exceeded the floor in this scenario.`
      );
    }
  }

  return {
    assumptions,
    startingBalance: stayStartBal,
    conversionPremium: startBal,
    incomeHoldoutReserve,
    totalTraditionalPool,
    rothPathStartingQualifiedBalance,
    startingAge: startAge,
    retirementAge: retireAge,
    retirementSpendableIncomeAnnual: need,
    annualSocialSecurityGross: annualSS,
    federalBracketId: bracketId,
    marginalRateNominalPct: nominalMarginal,
    marriedFilingJointly: married,
    illustrationFiling: filing,
    standardDeductionAnnual: sd,
    rothGrowthAssumptionLabel,
    annualAgiPreRetirementIllustration: agiAnnual,
    stayTraditional,
    stayTraditionalTotals: {
      totalRmdWithdrawals,
      totalTaxAttributableToRmds,
      totalIrmaaPaid: totalIrmaaPaidStay,
    },
    rothConversion,
    rothConversionTotals: {
      totalRmdTraditional: totalRmdRothTable,
      totalIrmaaPaid: totalIrmaaRothTable,
      totalGrossConversion,
      totalConversionTaxPaid,
      totalNetConversionToRoth,
      endingTotalRothBalance,
    },
  };
}
