import { describe, expect, it } from "vitest";
import { buildRothConversionModel } from "@/lib/roth-conversion-analysis";
import { buildRothComparisonVisualData } from "@/lib/roth-comparison-visuals";
import { buildWealthComparisonScale } from "@/lib/roth-wealth-comparison-scale";

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

describe("buildWealthComparisonScale", () => {
  it("uses max of stay and roth as scale max", () => {
    const data = baseVisualData();
    const scale = buildWealthComparisonScale(data);
    expect(scale.scaleMax).toBe(Math.max(data.stayEndingWealth, data.rothEndingWealth));
  });

  it("assigns bar widths proportional to ending wealth", () => {
    const data = baseVisualData();
    const scale = buildWealthComparisonScale(data);
    const expectedStayPct = Math.max(0, (data.stayEndingWealth / scale.scaleMax) * 100);
    const expectedRothPct = Math.max(0, (data.rothEndingWealth / scale.scaleMax) * 100);
    expect(scale.stayBarWidthPct).toBeCloseTo(expectedStayPct, 1);
    expect(scale.rothBarWidthPct).toBeCloseTo(expectedRothPct, 1);
    expect(scale.rothBarWidthPct).toBeLessThanOrEqual(100);
    expect(scale.stayBarWidthPct).toBeLessThanOrEqual(100);
  });

  it("gives roth full width when roth exceeds stay", () => {
    const scale = buildWealthComparisonScale({
      ...baseVisualData(),
      stayEndingWealth: 5_000_000,
      rothEndingWealth: 10_000_000,
      wealthDelta: 5_000_000,
      wealthDeltaPct: 100,
    });
    expect(scale.rothBarWidthPct).toBe(100);
    expect(scale.stayBarWidthPct).toBe(50);
  });

  it("gives stay full width when stay exceeds roth", () => {
    const scale = buildWealthComparisonScale({
      ...baseVisualData(),
      stayEndingWealth: 10_000_000,
      rothEndingWealth: 6_000_000,
      wealthDelta: -4_000_000,
      wealthDeltaPct: -40,
    });
    expect(scale.stayBarWidthPct).toBe(100);
    expect(scale.rothBarWidthPct).toBe(60);
    expect(scale.deltaTone).toBe("negative");
  });
});
