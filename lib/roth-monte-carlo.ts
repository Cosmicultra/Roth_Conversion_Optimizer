/**
 * Volatility stress test: stay-traditional vs Roth/FIC paths with frozen conversion schedule.
 * Supplemental to the fixed-return deterministic illustration only.
 */

import { parseSurrenderYears } from "@/lib/conversion-deadlines";
import { irmaaAnnualSurchargeWithLookback } from "@/lib/federal-tax-illustration";
import { buildOrdinaryIncomeStack } from "@/lib/ordinary-income-stack";
import { portfolioIncomeShortfallForAge, variableIncomeByAgeMap } from "@/lib/retirement-income-escalation";
import { rmdAmountFromPriorYearEndBalance } from "@/lib/rmd-engine";
import {
  computeFicRothGrowthRateForYear,
  parseAnnualReturnFromPercentField,
  rothPathGrowthAnnual,
  type PayConversionTaxFrom,
  type RothConversionModelResult,
} from "@/lib/roth-conversion-analysis";
import type { OptimizeRothPremiumInput } from "@/lib/roth-premium-optimizer";

export const MONTE_CARLO_DEFAULT_SIMULATION_COUNT = 1000;
export const MONTE_CARLO_DEFAULT_INDEX_MEAN = 0.1;
export const MONTE_CARLO_DEFAULT_INDEX_VOL = 0.16;

export const MONTE_CARLO_DISCLAIMER =
  "Supplemental volatility stress test only. Primary year-by-year tables use fixed illustrated returns. Annual conversion amounts are held constant from the base bracket-fill illustration. FIA credited return is illustrated as 0% in index-down years and capped in index-up years; carrier participation and spread rules may differ.";

export type RothMonteCarloConfig = {
  simulationCount?: number;
  indexMeanAnnual?: number;
  indexVolAnnual?: number;
  randomSeed?: number;
};

export type RothMonteCarloContext = {
  rmdStartAge: number;
  socialSecurityStartAge: number;
  fundNeedFromIra: boolean;
  payConversionTaxFrom: PayConversionTaxFrom;
  stateCode?: string;
  spouseStartAge: number | null;
  totalDeductionsOverride: number | null;
  useFixedIndexContract: boolean;
  contractRateAnnual: number;
  trailingBonusAnnual: number;
  trailBonusYears: number;
  surrenderYears: number | null;
};

export type RothMonteCarloResult = {
  rothWinPct: number;
  stayWinPct: number;
  tiePct: number;
  rothEndingMedian: number;
  stayEndingMedian: number;
  medianWealthDelta: number;
  rothEndingP10: number;
  rothEndingP50: number;
  rothEndingP90: number;
  stayEndingP10: number;
  stayEndingP50: number;
  stayEndingP90: number;
  stayNegativeReturnYearsMedian: number;
  ficZeroCreditYearsMedian: number;
  simulationCount: number;
  config: Required<Pick<RothMonteCarloConfig, "indexMeanAnnual" | "indexVolAnnual">> & {
    simulationCount: number;
  };
  disclaimer: string;
};

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

/** Seeded PRNG (mulberry32) for reproducible tests. */
export function createRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function normalSample(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function drawAnnualIndexReturn(
  rng: () => number,
  meanAnnual: number,
  volAnnual: number
): number {
  const monthlySigma = volAnnual / Math.sqrt(12);
  const monthlyMu = Math.log(1 + meanAnnual) / 12 - 0.5 * monthlySigma * monthlySigma;
  let compound = 1;
  for (let m = 0; m < 12; m++) {
    const monthly = Math.exp(monthlyMu + monthlySigma * normalSample(rng)) - 1;
    compound *= 1 + monthly;
  }
  return compound - 1;
}

/** FIA floor at 0%; cap at illustrated contract rate (+ trailing bonus when applicable). */
export function ficCreditedReturn(indexReturn: number, capAnnual: number): number {
  if (indexReturn <= 0) return 0;
  return Math.min(Math.max(0, capAnnual), indexReturn);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const w = idx - lo;
  return sorted[lo]! * (1 - w) + sorted[hi]! * w;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return percentile(sorted, 0.5);
}

function inferRmdStartAge(model: RothConversionModelResult): number {
  const withRmd = model.stayTraditional.find((r) => r.rmd > 0);
  return withRmd?.age ?? 73;
}

function inferSocialSecurityStartAge(model: RothConversionModelResult): number {
  const withSs = model.stayTraditional.find((r) => r.socialSecurityAnnualGross > 0);
  return withSs?.age ?? model.retirementAge;
}

export function buildMonteCarloContextFromParams(
  params: Pick<
    OptimizeRothPremiumInput,
    | "useFixedIndexContract"
    | "contractEstimatedRateOfReturnPct"
    | "ficTrailingBonusPct"
    | "ficTrailBonusYears"
    | "ficSurrenderYears"
    | "rmdStartAge"
    | "socialSecurityStartAge"
    | "retirementIncomeFromConversionAccount"
    | "payConversionTaxFrom"
    | "stateOfResidence"
    | "spouseStartAge"
    | "totalDeductionsAnnual"
    | "currentAge"
    | "retirementAge"
    | "annualSocialSecurityGross"
  >
): RothMonteCarloContext {
  const useFic = params.useFixedIndexContract === true;
  const contractRateAnnual = rothPathGrowthAnnual({
    useFixedIndexContract: useFic,
    contractEstimatedRateOfReturnPct: params.contractEstimatedRateOfReturnPct,
  });
  const trailingBonusAnnual = useFic
    ? parseAnnualReturnFromPercentField(params.ficTrailingBonusPct) ?? 0
    : 0;
  const trailRaw = String(params.ficTrailBonusYears ?? "").replace(/,/g, "").trim();
  const trailBonusYears = useFic && trailRaw ? Math.max(0, Math.floor(Number(trailRaw) || 0)) : 0;
  const surrenderYears = useFic ? parseSurrenderYears(params.ficSurrenderYears) : null;

  const annualSS = Math.max(0, Number(params.annualSocialSecurityGross) || 0);
  const retireAge = Math.max(0, Math.floor(Number(params.retirementAge) || 67));
  const ssStartAge =
    annualSS > 0
      ? Math.max(
          0,
          Math.floor(
            Number(params.socialSecurityStartAge) || Math.min(70, Math.max(50, retireAge))
          )
        )
      : retireAge;

  const dedRaw = String(params.totalDeductionsAnnual ?? "").replace(/[$,]/g, "").trim();
  const totalDeductionsOverride =
    dedRaw && Number.isFinite(Number(dedRaw)) && Number(dedRaw) > 0
      ? Math.floor(Number(dedRaw))
      : null;

  return {
    rmdStartAge: Math.max(72, Math.floor(Number(params.rmdStartAge) || 73)),
    socialSecurityStartAge: ssStartAge,
    fundNeedFromIra: params.retirementIncomeFromConversionAccount === true,
    payConversionTaxFrom:
      params.payConversionTaxFrom === "external" ? "external" : "conversion_account",
    stateCode: String(params.stateOfResidence ?? "").trim().toUpperCase() || undefined,
    spouseStartAge:
      params.spouseStartAge != null && Number.isFinite(params.spouseStartAge)
        ? Math.floor(params.spouseStartAge)
        : null,
    totalDeductionsOverride,
    useFixedIndexContract: useFic,
    contractRateAnnual,
    trailingBonusAnnual: Math.max(0, trailingBonusAnnual),
    trailBonusYears,
    surrenderYears,
  };
}

export function buildMonteCarloContextFromModel(
  model: RothConversionModelResult,
  overrides?: Partial<RothMonteCarloContext>
): RothMonteCarloContext {
  const useFic = model.rothGrowthAssumptionLabel.toLowerCase().includes("contract");
  const firstGrowth = model.rothConversion[0]?.growthRate ?? 0.1;
  return {
    rmdStartAge: inferRmdStartAge(model),
    socialSecurityStartAge: inferSocialSecurityStartAge(model),
    fundNeedFromIra: model.stayTraditional.some((r) => r.portfolioIncomeShortfall > 0),
    payConversionTaxFrom: "conversion_account",
    stateCode: undefined,
    spouseStartAge: null,
    totalDeductionsOverride: null,
    useFixedIndexContract: useFic,
    contractRateAnnual: firstGrowth,
    trailingBonusAnnual: 0,
    trailBonusYears: 0,
    surrenderYears: null,
    ...overrides,
  };
}

function rothPathGrowthForYear(
  yearOffset: number,
  indexReturn: number,
  ctx: RothMonteCarloContext
): { growth: number; ficZeroCredit: boolean; stayNegative: boolean } {
  const stayNegative = indexReturn < 0;
  if (!ctx.useFixedIndexContract) {
    return { growth: indexReturn, ficZeroCredit: false, stayNegative };
  }
  const inSurrender = ctx.surrenderYears == null || yearOffset < ctx.surrenderYears;
  if (!inSurrender) {
    return { growth: indexReturn, ficZeroCredit: false, stayNegative };
  }
  const cap = computeFicRothGrowthRateForYear({
    yearOffset,
    surrenderYears: ctx.surrenderYears,
    trailBonusYears: ctx.trailBonusYears,
    contractRateAnnual: ctx.contractRateAnnual,
    trailingBonusAnnual: ctx.trailingBonusAnnual,
    postSurrenderRateAnnual: MONTE_CARLO_DEFAULT_INDEX_MEAN,
  });
  const growth = ficCreditedReturn(indexReturn, cap);
  return { growth, ficZeroCredit: indexReturn <= 0, stayNegative };
}

type FrozenConversionYear = {
  grossConversion: number;
  netRatio: number;
  rothOnlyPhase: boolean;
};

function frozenConversionSchedule(model: RothConversionModelResult): Map<number, FrozenConversionYear> {
  const map = new Map<number, FrozenConversionYear>();
  for (const row of model.rothConversion) {
    const gross = row.grossConversion;
    const netRatio = gross > 0 ? row.netConversionToRoth / gross : 0;
    map.set(row.age, {
      grossConversion: gross,
      netRatio,
      rothOnlyPhase: row.rothOnlyPhase,
    });
  }
  return map;
}

function simulateOnePath(
  model: RothConversionModelResult,
  ctx: RothMonteCarloContext,
  indexReturnsByOffset: number[],
  path: "stay" | "roth"
): { endingWealth: number; stayNegativeYears: number; ficZeroYears: number } {
  const startAge = model.startingAge;
  const endAge = model.stayTraditional.at(-1)?.age ?? startAge;
  const retireAge = model.retirementAge;
  const need = model.retirementSpendableIncomeAnnual;
  const annualSS = model.annualSocialSecurityGross;
  const ssStartAge = ctx.socialSecurityStartAge;
  const fundNeedFromIra = ctx.fundNeedFromIra;
  const filing = model.illustrationFiling;
  const agiAnnual = model.annualAgiPreRetirementIllustration;
  const irmaaProxy = agiAnnual > 0 ? agiAnnual : 0;
  const variableIncomeByAge =
    model.variableRetirementIncomeSchedule.length > 0
      ? variableIncomeByAgeMap(model.variableRetirementIncomeSchedule)
      : undefined;
  const conversionSchedule = frozenConversionSchedule(model);
  const married = model.marriedFilingJointly;
  const rmdStartAge = ctx.rmdStartAge;

  const deductionInputForAge = (age: number) => ({
    filing,
    calendarYearOffset: age - startAge,
    clientAge: age,
    spouseAge: ctx.spouseStartAge != null ? ctx.spouseStartAge + (age - startAge) : null,
    totalDeductionsOverride: ctx.totalDeductionsOverride,
  });

  let stayNegativeYears = 0;
  let ficZeroYears = 0;

  if (path === "stay") {
    let bStay = model.startingBalance;
    let priorDec31Stay = model.startingBalance;
    const magiByAge = new Map<number, number>();

    for (let age = startAge; age <= endAge; age++) {
      const yearOffset = age - startAge;
      const indexReturn = indexReturnsByOffset[yearOffset] ?? 0;
      if (indexReturn < 0) stayNegativeYears += 1;

      const rmd =
        age >= rmdStartAge
          ? rmdAmountFromPriorYearEndBalance(priorDec31Stay, {
              age,
              rmdStartAge,
              marriedFilingJointly: married,
              clientAge: age,
              spouseAge: ctx.spouseStartAge != null ? ctx.spouseStartAge + (age - startAge) : null,
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
        variableIncomeByAge,
      });
      const { portfolioIncomeShortfall, socialSecurityAnnualGross: ssThisYear } = incomeParts;
      const totalIraDistribution = retired ? Math.max(rmd, portfolioIncomeShortfall) : rmd;
      const incomeStack = buildOrdinaryIncomeStack({
        retired,
        agiAnnual,
        grossSocialSecurityBenefits: ssThisYear,
        iraOrdinaryDistributions: totalIraDistribution,
        filing,
      });
      magiByAge.set(age, incomeStack.magiForIrmaa);
      void irmaaAnnualSurchargeWithLookback({
        age,
        magiByAge,
        filing,
        proxyMagiBeforeHistory: irmaaProxy > 0 ? irmaaProxy : incomeStack.magiForIrmaa,
      });

      const endBal = (bStay - totalIraDistribution) * (1 + indexReturn);
      priorDec31Stay = Math.max(0, endBal);
      bStay = priorDec31Stay;
    }
    return { endingWealth: bStay, stayNegativeYears, ficZeroYears: 0 };
  }

  let bHoldout = model.incomeHoldoutReserve;
  let bConvert = model.rothPathStartingQualifiedBalance;
  let rothBalance = 0;
  let priorDec31Trad = model.incomeHoldoutReserve + model.rothPathStartingQualifiedBalance;
  const magiByAge = new Map<number, number>();

  for (let age = startAge; age <= endAge; age++) {
    const yearOffset = age - startAge;
    const indexReturn = indexReturnsByOffset[yearOffset] ?? 0;
    const { growth, ficZeroCredit } = rothPathGrowthForYear(yearOffset, indexReturn, ctx);
    if (ficZeroCredit) ficZeroYears += 1;

    const holdoutAtYearStart = bHoldout;
    const convertAtYearStart = bConvert;
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
      variableIncomeByAge,
    });
    const { portfolioIncomeShortfall, socialSecurityAnnualGross: ssThisYear } = incomeParts;
    const frozen = conversionSchedule.get(age);
    const rothOnly = frozen?.rothOnlyPhase ?? convertAtYearStart <= 0.01;

    if (!rothOnly && convertAtYearStart > 0.01) {
      const holdoutAfterGrowth = holdoutAtYearStart * (1 + growth);
      const convertAfterGrowth = convertAtYearStart * (1 + growth);
      const rmdTake =
        age >= rmdStartAge
          ? rmdAmountFromPriorYearEndBalance(priorDec31Trad, {
              age,
              rmdStartAge,
              marriedFilingJointly: married,
              clientAge: age,
              spouseAge: ctx.spouseStartAge != null ? ctx.spouseStartAge + (age - startAge) : null,
            })
          : 0;
      const totalIraWithdrawalPreConversion = retired ? Math.max(rmdTake, portfolioIncomeShortfall) : rmdTake;
      const afterWithdraw = withdrawFromTraditionalSleeves(
        holdoutAfterGrowth,
        convertAfterGrowth,
        totalIraWithdrawalPreConversion
      );
      const tradAfterSpendingAndRmd = afterWithdraw.convertBalance;
      const grossConv = Math.min(frozen?.grossConversion ?? 0, tradAfterSpendingAndRmd);
      const netRatio = frozen?.netRatio ?? 0;
      const net =
        ctx.payConversionTaxFrom === "external"
          ? grossConv
          : Math.max(0, grossConv * netRatio);
      const rothAfterGrowth = rothAtYearStart * (1 + growth);
      rothBalance = rothAfterGrowth + net;
      const endTrad = Math.max(0, tradAfterSpendingAndRmd - grossConv);

      const magiRough = buildOrdinaryIncomeStack({
        retired,
        agiAnnual,
        grossSocialSecurityBenefits: ssThisYear,
        iraOrdinaryDistributions: totalIraWithdrawalPreConversion,
        filing,
        grossConversion: grossConv,
      }).magiForIrmaa;
      magiByAge.set(age, magiRough);
      void irmaaAnnualSurchargeWithLookback({
        age,
        magiByAge,
        filing,
        proxyMagiBeforeHistory: irmaaProxy > 0 ? irmaaProxy : magiRough,
      });

      bHoldout = afterWithdraw.holdoutBalance;
      bConvert = endTrad;
      priorDec31Trad = afterWithdraw.holdoutBalance + endTrad;
    } else if (holdoutAtYearStart > 0.01) {
      const holdoutAfterGrowth = holdoutAtYearStart * (1 + growth);
      const rmdTake =
        age >= rmdStartAge
          ? rmdAmountFromPriorYearEndBalance(priorDec31Trad, {
              age,
              rmdStartAge,
              marriedFilingJointly: married,
              clientAge: age,
              spouseAge: ctx.spouseStartAge != null ? ctx.spouseStartAge + (age - startAge) : null,
            })
          : 0;
      const totalIraWithdrawal = retired ? Math.max(rmdTake, portfolioIncomeShortfall) : rmdTake;
      const afterWithdraw = withdrawFromTraditionalSleeves(holdoutAfterGrowth, 0, totalIraWithdrawal);
      const magiRough = buildOrdinaryIncomeStack({
        retired,
        agiAnnual,
        grossSocialSecurityBenefits: ssThisYear,
        iraOrdinaryDistributions: totalIraWithdrawal,
        filing,
      }).magiForIrmaa;
      magiByAge.set(age, magiRough);
      void irmaaAnnualSurchargeWithLookback({
        age,
        magiByAge,
        filing,
        proxyMagiBeforeHistory: irmaaProxy > 0 ? irmaaProxy : magiRough,
      });
      rothBalance = rothAtYearStart * (1 + growth);
      bHoldout = afterWithdraw.holdoutBalance;
      bConvert = 0;
      priorDec31Trad = afterWithdraw.holdoutBalance;
    } else {
      rothBalance = rothAtYearStart * (1 + growth);
      bHoldout = 0;
      bConvert = 0;
    }
  }

  return { endingWealth: rothBalance, stayNegativeYears: 0, ficZeroYears };
}

export function runRothMonteCarlo(
  model: RothConversionModelResult,
  context: RothMonteCarloContext,
  config: RothMonteCarloConfig = {}
): RothMonteCarloResult {
  const simulationCount = Math.max(
    1,
    Math.floor(config.simulationCount ?? MONTE_CARLO_DEFAULT_SIMULATION_COUNT)
  );
  const indexMeanAnnual = config.indexMeanAnnual ?? MONTE_CARLO_DEFAULT_INDEX_MEAN;
  const indexVolAnnual = Math.max(0, config.indexVolAnnual ?? MONTE_CARLO_DEFAULT_INDEX_VOL);
  const rng = createRng(config.randomSeed ?? Date.now());

  const startAge = model.startingAge;
  const endAge = model.stayTraditional.at(-1)?.age ?? startAge;
  const horizonYears = endAge - startAge + 1;

  const rothEndings: number[] = [];
  const stayEndings: number[] = [];
  const stayNegYearCounts: number[] = [];
  const ficZeroYearCounts: number[] = [];

  let rothWins = 0;
  let stayWins = 0;
  let ties = 0;

  for (let s = 0; s < simulationCount; s++) {
    const indexReturns: number[] = [];
    for (let y = 0; y < horizonYears; y++) {
      indexReturns.push(
        indexVolAnnual <= 0
          ? indexMeanAnnual
          : drawAnnualIndexReturn(rng, indexMeanAnnual, indexVolAnnual)
      );
    }

    const stay = simulateOnePath(model, context, indexReturns, "stay");
    const roth = simulateOnePath(model, context, indexReturns, "roth");
    stayEndings.push(stay.endingWealth);
    rothEndings.push(roth.endingWealth);
    stayNegYearCounts.push(stay.stayNegativeYears);
    ficZeroYearCounts.push(roth.ficZeroYears);

    const delta = roth.endingWealth - stay.endingWealth;
    if (Math.abs(delta) < 1) ties += 1;
    else if (delta > 0) rothWins += 1;
    else stayWins += 1;
  }

  const rothSorted = [...rothEndings].sort((a, b) => a - b);
  const staySorted = [...stayEndings].sort((a, b) => a - b);
  const rothMedian = median(rothEndings);
  const stayMedian = median(stayEndings);

  return {
    rothWinPct: (rothWins / simulationCount) * 100,
    stayWinPct: (stayWins / simulationCount) * 100,
    tiePct: (ties / simulationCount) * 100,
    rothEndingMedian: rothMedian,
    stayEndingMedian: stayMedian,
    medianWealthDelta: rothMedian - stayMedian,
    rothEndingP10: percentile(rothSorted, 0.1),
    rothEndingP50: percentile(rothSorted, 0.5),
    rothEndingP90: percentile(rothSorted, 0.9),
    stayEndingP10: percentile(staySorted, 0.1),
    stayEndingP50: percentile(staySorted, 0.5),
    stayEndingP90: percentile(staySorted, 0.9),
    stayNegativeReturnYearsMedian: median(stayNegYearCounts),
    ficZeroCreditYearsMedian: median(ficZeroYearCounts),
    simulationCount,
    config: { simulationCount, indexMeanAnnual, indexVolAnnual },
    disclaimer: MONTE_CARLO_DISCLAIMER,
  };
}
