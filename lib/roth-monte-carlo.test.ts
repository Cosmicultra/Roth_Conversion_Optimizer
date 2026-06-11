import { describe, expect, it } from "vitest";
import { buildRothConversionModel } from "@/lib/roth-conversion-analysis";
import {
  buildMonteCarloContextFromParams,
  createRng,
  drawAnnualIndexReturn,
  ficCreditedReturn,
  runRothMonteCarlo,
} from "@/lib/roth-monte-carlo";

const baseInput = {
  totalAccountValue: 500_000,
  currentAge: 65,
  retirementAge: 67,
  retirementSpendableIncomeAnnual: 80_000,
  federalTaxBracketId: "22",
  retirementIncomeFromConversionAccount: true,
};

describe("roth-monte-carlo", () => {
  it("ficCreditedReturn floors at 0% and caps at contract rate", () => {
    expect(ficCreditedReturn(-0.2, 0.06)).toBe(0);
    expect(ficCreditedReturn(0, 0.06)).toBe(0);
    expect(ficCreditedReturn(0.04, 0.06)).toBeCloseTo(0.04);
    expect(ficCreditedReturn(0.12, 0.06)).toBeCloseTo(0.06);
  });

  it("drawAnnualIndexReturn is reproducible with seeded RNG", () => {
    const a = drawAnnualIndexReturn(createRng(42), 0.1, 0.16);
    const b = drawAnnualIndexReturn(createRng(42), 0.1, 0.16);
    expect(a).toBe(b);
  });

  it("vol=0 tracks deterministic ending wealth closely", () => {
    const model = buildRothConversionModel({
      ...baseInput,
      useFixedIndexContract: true,
      contractEstimatedRateOfReturnPct: "6",
      ficSurrenderYears: "10",
      endAge: 75,
    });
    const ctx = buildMonteCarloContextFromParams({
      ...baseInput,
      useFixedIndexContract: true,
      contractEstimatedRateOfReturnPct: "6",
      ficSurrenderYears: "10",
      retirementIncomeFromConversionAccount: true,
    });
    const result = runRothMonteCarlo(model, ctx, {
      simulationCount: 1,
      indexMeanAnnual: 0.1,
      indexVolAnnual: 0,
      randomSeed: 1,
    });
    const stayEnd = model.stayTraditional.at(-1)!.endBalance;
    const rothEnd = model.rothConversionTotals.endingTotalRothBalance;
    expect(result.stayEndingMedian).toBeGreaterThan(0);
    expect(result.rothEndingMedian).toBeGreaterThan(0);
    expect(Math.abs(result.stayEndingMedian - stayEnd) / stayEnd).toBeLessThan(0.15);
    expect(Math.abs(result.rothEndingMedian - rothEnd) / Math.max(rothEnd, 1)).toBeLessThan(0.25);
  });

  it("negative index years favor Roth FIC path win rate vs volatile stay-traditional", () => {
    const model = buildRothConversionModel({
      ...baseInput,
      useFixedIndexContract: true,
      contractEstimatedRateOfReturnPct: "6",
      ficSurrenderYears: "10",
      endAge: 80,
    });
    const ctx = buildMonteCarloContextFromParams({
      ...baseInput,
      useFixedIndexContract: true,
      contractEstimatedRateOfReturnPct: "6",
      ficSurrenderYears: "10",
      retirementIncomeFromConversionAccount: true,
    });
    const result = runRothMonteCarlo(model, ctx, {
      simulationCount: 200,
      indexMeanAnnual: 0.06,
      indexVolAnnual: 0.22,
      randomSeed: 99,
    });
    expect(result.rothWinPct + result.stayWinPct + result.tiePct).toBeCloseTo(100, 0);
    expect(result.ficZeroCreditYearsMedian).toBeGreaterThanOrEqual(0);
    expect(result.stayNegativeReturnYearsMedian).toBeGreaterThan(0);
  });
});
