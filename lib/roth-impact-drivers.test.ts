import { describe, expect, it } from "vitest";
import { buildRothConversionModel } from "@/lib/roth-conversion-analysis";
import { buildRothComparisonVisualData } from "@/lib/roth-comparison-visuals";
import { buildImpactDrivers, deltaTone } from "@/lib/roth-impact-drivers";

function baseVisualData() {
  const model = buildRothConversionModel({
    totalAccountValue: 500_000,
    currentAge: 65,
    retirementAge: 67,
    retirementSpendableIncomeAnnual: 80_000,
    annualSocialSecurityGross: 30_000,
    federalTaxBracketId: "35",
    marriedFilingJointly: true,
    annualAdjustedGrossIncomePreRetirement: 200_000,
    retirementIncomeFromConversionAccount: true,
  });
  return buildRothComparisonVisualData(model);
}

describe("buildImpactDrivers", () => {
  it("returns exactly 4 drivers without total wealth change", () => {
    const drivers = buildImpactDrivers(baseVisualData());
    expect(drivers).toHaveLength(4);
    expect(drivers.map((d) => d.id).sort()).toEqual(["heirs", "income", "irmaa", "tax"]);
    expect(drivers.some((d) => d.id === "wealth")).toBe(false);
  });

  it("sorts drivers by descending absolute impact", () => {
    const drivers = buildImpactDrivers(baseVisualData());
    for (let i = 1; i < drivers.length; i++) {
      expect(Math.abs(drivers[i - 1]!.rawValue)).toBeGreaterThanOrEqual(Math.abs(drivers[i]!.rawValue));
    }
  });
});

describe("deltaTone", () => {
  it("classifies positive, negative, and neutral deltas", () => {
    expect(deltaTone(1_000)).toBe("positive");
    expect(deltaTone(-1_000)).toBe("negative");
    expect(deltaTone(100)).toBe("neutral");
  });
});
