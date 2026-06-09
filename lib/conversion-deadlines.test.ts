import { describe, expect, it } from "vitest";
import { buildRothConversionModel, RMD_ILLUSTRATION_START_AGE } from "@/lib/roth-conversion-analysis";
import {
  effectiveConversionDeadlineAge,
  isFullyConvertedByDeadline,
  meetsConversionOptimizationGoal,
  parseSurrenderYears,
} from "@/lib/conversion-deadlines";

describe("conversion-deadlines", () => {
  it("parseSurrenderYears accepts positive integers", () => {
    expect(parseSurrenderYears("10")).toBe(10);
    expect(parseSurrenderYears("")).toBeNull();
    expect(parseSurrenderYears("-1")).toBeNull();
  });

  it("effectiveConversionDeadlineAge uses min of surrender and pre-RMD when FIC on", () => {
    expect(
      effectiveConversionDeadlineAge({
        startAge: 60,
        useFixedIndexContract: true,
        ficSurrenderYears: "15",
      })
    ).toBe(72);
    expect(
      effectiveConversionDeadlineAge({
        startAge: 60,
        useFixedIndexContract: true,
        ficSurrenderYears: "10",
      })
    ).toBe(69);
  });

  it("FIC surrender 10 at start 73 binds at age 82", () => {
    expect(
      effectiveConversionDeadlineAge({
        startAge: 73,
        endAge: 95,
        useFixedIndexContract: true,
        ficSurrenderYears: "10",
      })
    ).toBe(82);
  });

  it("meetsConversionOptimizationGoal enforces protect ending floor", () => {
    const model = buildRothConversionModel({
      totalAccountValue: 50_000,
      currentAge: 65,
      retirementAge: 95,
      retirementSpendableIncomeAnnual: 80_000,
      federalTaxBracketId: "22",
      protectInitialInvestment: true,
      retirementIncomeFromConversionAccount: false,
      endAge: 75,
    });
    expect(
      meetsConversionOptimizationGoal(model, {
        startAge: 65,
        protectInitialInvestment: true,
      })
    ).toBe(true);
    expect(
      meetsConversionOptimizationGoal(model, {
        startAge: 65,
        protectInitialInvestment: false,
      })
    ).toBe(true);
  });

  it("isFullyConvertedByDeadline rejects completion after deadline", () => {
    const model = buildRothConversionModel({
      totalAccountValue: 500_000,
      currentAge: 73,
      retirementAge: 67,
      retirementSpendableIncomeAnnual: 400_000,
      annualAdjustedGrossIncomePreRetirement: 420_000,
      federalTaxBracketId: "35",
      marriedFilingJointly: true,
      protectInitialInvestment: false,
      retirementIncomeFromConversionAccount: true,
      endAge: 95,
    });
    const deadline = 82;
    expect(isFullyConvertedByDeadline(model, deadline)).toBe(
      (model.rothConversion.filter((r) => !r.rothOnlyPhase).at(-1)?.age ?? 999) <= deadline &&
        (model.rothConversion.filter((r) => !r.rothOnlyPhase).at(-1)?.endTraditionalBalance ?? 999) <= 1
    );
    expect(
      isFullyConvertedByDeadline(model, RMD_ILLUSTRATION_START_AGE - 1)
    ).toBe(false);
  });
});
