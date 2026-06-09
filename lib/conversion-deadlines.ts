import {
  RMD_ILLUSTRATION_START_AGE,
  type RothConversionModelResult,
} from "@/lib/roth-conversion-analysis";

/** Epsilon for "traditional IRA conversion sleeve depleted". */
export const TRAD_DEPLETED_EPSILON = 1;

const DEFAULT_END_AGE = 95;

/** Surrender period length in illustration years. Blank / invalid → null. */
export function parseSurrenderYears(raw: string | undefined): number | null {
  const s = String(raw ?? "").replace(/,/g, "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

export type ConversionDeadlineInput = {
  startAge: number;
  endAge?: number;
  rmdStartAge?: number;
  useFixedIndexContract?: boolean;
  ficSurrenderYears?: string;
};

/** Last trad-phase age while the conversion sleeve is active. */
export function conversionCompleteAgeFromModel(model: RothConversionModelResult): number | null {
  const tradRows = model.rothConversion.filter((r) => !r.rothOnlyPhase);
  if (tradRows.length === 0) return null;
  return tradRows[tradRows.length - 1]!.age;
}

/**
 * Last age by which the conversion sleeve must be depleted.
 * FIC+surrender: min(base rule, startAge + surrenderYears - 1).
 */
export function effectiveConversionDeadlineAge(input: ConversionDeadlineInput): number {
  const startAge = Math.max(0, Math.floor(Number(input.startAge) || 0));
  const endAge = Math.max(startAge, Math.floor(Number(input.endAge) || DEFAULT_END_AGE));
  const rmdStartAge = input.rmdStartAge ?? RMD_ILLUSTRATION_START_AGE;
  const rmdDeadlineAge = rmdStartAge - 1;
  const baseDeadline = startAge < rmdStartAge ? rmdDeadlineAge : endAge;

  const surrenderYears =
    input.useFixedIndexContract === true ? parseSurrenderYears(input.ficSurrenderYears) : null;
  if (surrenderYears == null || surrenderYears <= 0) {
    return baseDeadline;
  }

  const surrenderDeadlineAge = startAge + surrenderYears - 1;
  return Math.min(baseDeadline, surrenderDeadlineAge);
}

export function isFullyConvertedByDeadline(
  model: RothConversionModelResult,
  deadlineAge: number
): boolean {
  const tradRows = model.rothConversion.filter((r) => !r.rothOnlyPhase);
  if (tradRows.length === 0) {
    return model.rothPathStartingQualifiedBalance <= TRAD_DEPLETED_EPSILON;
  }
  const last = tradRows[tradRows.length - 1]!;
  return (
    last.age <= deadlineAge && last.endTraditionalBalance <= TRAD_DEPLETED_EPSILON
  );
}

/** Protect ON: ending total Roth must be at or above entered conversion premium. */
export function meetsProtectEndingFloor(model: RothConversionModelResult): boolean {
  const endingTotalRoth =
    model.rothConversion.length > 0
      ? model.rothConversion[model.rothConversion.length - 1]!.totalRothBalance
      : 0;
  return endingTotalRoth >= model.conversionPremium;
}

export type ConversionGoalInput = ConversionDeadlineInput & {
  protectInitialInvestment?: boolean;
};

export function meetsConversionOptimizationGoal(
  model: RothConversionModelResult,
  input: ConversionGoalInput
): boolean {
  const deadline = effectiveConversionDeadlineAge(input);
  if (!isFullyConvertedByDeadline(model, deadline)) return false;
  if (input.protectInitialInvestment && !meetsProtectEndingFloor(model)) return false;
  return true;
}
