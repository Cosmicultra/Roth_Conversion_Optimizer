import { describe, expect, it } from "vitest";
import { buildRothConversionModel, RMD_ILLUSTRATION_START_AGE } from "@/lib/roth-conversion-analysis";
import {
  computeOptimizedRothPremiumAmount,
  conversionCompleteAgeFromModel,
  holdoutWithdrawalRequiredForAge,
  isFullyConvertedBeforeRmd,
  isFullyConvertedWithinHorizon,
  minimumStartingHoldoutReserve,
  projectIncomeHoldoutReserve,
  traditionalRemainingBeforeRmd,
  type OptimizeRothPremiumInput,
} from "@/lib/roth-premium-optimizer";
import { portfolioIncomeShortfallForAge } from "@/lib/retirement-income-escalation";

const optimizeBase: OptimizeRothPremiumInput = {
  fullQualifiedBalance: 500_000,
  currentAge: 65,
  retirementAge: 67,
  retirementSpendableIncomeAnnual: 80_000,
  federalTaxBracketId: "22",
  retirementIncomeFromConversionAccount: true,
};

describe("roth-premium-optimizer", () => {
  it("isFullyConvertedBeforeRmd is true when traditional is depleted by age 72", () => {
    const model = buildRothConversionModel({
      ...optimizeBase,
      totalAccountValue: 50_000,
      protectInitialInvestment: false,
      endAge: 75,
    });
    expect(isFullyConvertedBeforeRmd(model)).toBe(true);
    expect(traditionalRemainingBeforeRmd(model)).toBeLessThanOrEqual(1);
  });

  it("returns full qualified balance when the entire pool clears before RMD (no overlap holdout)", () => {
    const result = computeOptimizedRothPremiumAmount({
      ...optimizeBase,
      retirementAge: 95,
      protectInitialInvestment: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.holdoutReserve).toBe(0);
    expect(result.amount).toBeGreaterThan(0);
    const model = buildRothConversionModel({
      ...optimizeBase,
      totalAccountValue: result.amount,
      protectInitialInvestment: false,
      retirementAge: 95,
    });
    expect(isFullyConvertedBeforeRmd(model)).toBe(true);
  });

  it("with protect on, optimized model keeps Roth at or above entered premium when full pool clears", () => {
    const result = computeOptimizedRothPremiumAmount({
      ...optimizeBase,
      retirementAge: 95,
      protectInitialInvestment: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const model = buildRothConversionModel({
      ...optimizeBase,
      totalAccountValue: result.amount,
      protectInitialInvestment: true,
      retirementAge: 95,
    });
    expect(isFullyConvertedBeforeRmd(model)).toBe(true);
    expect(model.rothConversionTotals.endingTotalRothBalance).toBeGreaterThanOrEqual(model.conversionPremium);
  });

  it("a tighter max bracket yields a lower optimized amount", () => {
    const bracketBase = {
      ...optimizeBase,
      fullQualifiedBalance: 250_000,
      retirementAge: 95,
      retirementIncomeFromConversionAccount: false as const,
      protectInitialInvestment: false,
      annualAdjustedGrossIncomePreRetirement: 150_000,
    };
    const wide = computeOptimizedRothPremiumAmount({
      ...bracketBase,
      federalTaxBracketId: "37",
    });
    const tight = computeOptimizedRothPremiumAmount({
      ...bracketBase,
      federalTaxBracketId: "22",
    });
    expect(wide.ok).toBe(true);
    if (!wide.ok) return;
    expect(wide.amount).toBeGreaterThan(0);
    if (tight.ok) {
      expect(tight.amount).toBeLessThan(wide.amount);
    }
  });

  it("returns a positive optimized amount for clients at RMD illustration age", () => {
    const result = computeOptimizedRothPremiumAmount({
      ...optimizeBase,
      currentAge: RMD_ILLUSTRATION_START_AGE,
      retirementAge: 67,
      fullQualifiedBalance: 500_000,
      protectInitialInvestment: false,
      federalTaxBracketId: "37",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.amount).toBeGreaterThan(0);
    expect(result.amount + result.holdoutReserve).toBe(500_000);
    expect(result.holdoutReserve).toBeGreaterThan(0);
    const model = buildRothConversionModel({
      ...optimizeBase,
      currentAge: RMD_ILLUSTRATION_START_AGE,
      totalAccountValue: result.amount,
      stayTraditionalStartingBalance: 500_000,
      incomeHoldoutReserve: result.holdoutReserve,
      protectInitialInvestment: false,
      federalTaxBracketId: "37",
    });
    expect(isFullyConvertedWithinHorizon(model)).toBe(true);
  });

  it("when age 73+ and retirement overlaps conversion, holdout + premium equals full qualified balance", () => {
    const result = computeOptimizedRothPremiumAmount({
      ...optimizeBase,
      currentAge: RMD_ILLUSTRATION_START_AGE,
      retirementAge: 67,
      annualSocialSecurityGross: 30_000,
      protectInitialInvestment: false,
      federalTaxBracketId: "37",
      annualAdjustedGrossIncomePreRetirement: 120_000,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.holdoutReserve).toBeGreaterThan(0);
    expect(result.amount).toBeLessThan(500_000);
    expect(result.amount + result.holdoutReserve).toBe(500_000);
    expect(result.overlapStartAge).toBe(73);
    const model = buildRothConversionModel({
      ...optimizeBase,
      currentAge: RMD_ILLUSTRATION_START_AGE,
      totalAccountValue: result.amount,
      stayTraditionalStartingBalance: 500_000,
      incomeHoldoutReserve: result.holdoutReserve,
      annualSocialSecurityGross: 30_000,
      protectInitialInvestment: false,
      federalTaxBracketId: "37",
      annualAdjustedGrossIncomePreRetirement: 120_000,
    });
    expect(isFullyConvertedWithinHorizon(model)).toBe(true);
    expect(model.incomeHoldoutReserve).toBe(result.holdoutReserve);
  });

  it("when age 73+ holdout need exceeds pool at low bracket, optimization fails clearly", () => {
    const result = computeOptimizedRothPremiumAmount({
      ...optimizeBase,
      currentAge: RMD_ILLUSTRATION_START_AGE,
      retirementAge: 67,
      retirementSpendableIncomeAnnual: 150_000,
      annualSocialSecurityGross: 30_000,
      protectInitialInvestment: false,
      federalTaxBracketId: "22",
      annualAdjustedGrossIncomePreRetirement: 120_000,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("holdout exceeds the qualified balance");
  });

  it("when age 73+ optimizes within horizon while subject to RMDs", () => {
    const result = computeOptimizedRothPremiumAmount({
      ...optimizeBase,
      currentAge: RMD_ILLUSTRATION_START_AGE,
      retirementAge: 73,
      protectInitialInvestment: false,
      federalTaxBracketId: "22",
      annualAdjustedGrossIncomePreRetirement: 150_000,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.amount).toBeGreaterThan(0);
    expect(result.amount + result.holdoutReserve).toBe(500_000);
    expect(result.holdoutReserve).toBeGreaterThan(0);
    const model = buildRothConversionModel({
      ...optimizeBase,
      currentAge: RMD_ILLUSTRATION_START_AGE,
      retirementAge: 73,
      totalAccountValue: result.amount,
      stayTraditionalStartingBalance: 500_000,
      incomeHoldoutReserve: result.holdoutReserve,
      protectInitialInvestment: false,
      federalTaxBracketId: "22",
      annualAdjustedGrossIncomePreRetirement: 150_000,
    });
    expect(isFullyConvertedWithinHorizon(model)).toBe(true);
    expect(isFullyConvertedBeforeRmd(model)).toBe(false);
  });

  it("returns a positive amount for a one-year pre-RMD horizon at age 72", () => {
    const result = computeOptimizedRothPremiumAmount({
      ...optimizeBase,
      currentAge: 72,
      retirementAge: 95,
      fullQualifiedBalance: 500_000,
      protectInitialInvestment: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.amount).toBeGreaterThan(0);
    expect(result.amount).toBeLessThan(500_000);
  });

  it("when Yes and retirement overlaps conversion, holdout + premium equals full qualified balance", () => {
    const result = computeOptimizedRothPremiumAmount({
      ...optimizeBase,
      protectInitialInvestment: false,
      annualAdjustedGrossIncomePreRetirement: 120_000,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.holdoutReserve).toBeGreaterThan(0);
    expect(result.amount).toBeLessThan(500_000);
    expect(result.amount + result.holdoutReserve).toBe(500_000);
    expect(result.overlapStartAge).toBe(67);
    const model = buildRothConversionModel({
      ...optimizeBase,
      totalAccountValue: result.amount,
      incomeHoldoutReserve: result.holdoutReserve,
      protectInitialInvestment: false,
      annualAdjustedGrossIncomePreRetirement: 120_000,
    });
    expect(isFullyConvertedBeforeRmd(model)).toBe(true);
    expect(model.incomeHoldoutReserve).toBe(result.holdoutReserve);
    expect(model.totalTraditionalPool).toBe(500_000);
  });

  it("when Yes but retirement starts after conversion finishes, holdout is zero", () => {
    const result = computeOptimizedRothPremiumAmount({
      ...optimizeBase,
      retirementAge: 95,
      protectInitialInvestment: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.holdoutReserve).toBe(0);
  });

  it("when No, holdout is zero", () => {
    const shared = {
      ...optimizeBase,
      protectInitialInvestment: false,
      annualAdjustedGrossIncomePreRetirement: 120_000,
    };
    const yes = computeOptimizedRothPremiumAmount({
      ...shared,
      retirementIncomeFromConversionAccount: true,
    });
    const no = computeOptimizedRothPremiumAmount({
      ...shared,
      retirementIncomeFromConversionAccount: false,
    });
    expect(yes.ok).toBe(true);
    expect(no.ok).toBe(true);
    if (!yes.ok || !no.ok) return;
    expect(yes.holdoutReserve).toBeGreaterThan(0);
    expect(no.holdoutReserve).toBe(0);
    expect(yes.amount + yes.holdoutReserve).toBe(500_000);
  });

  it("projectIncomeHoldoutReserve uses full-pool simulation overlap window", () => {
    const { fullQualifiedBalance: _f, rmdStartAge: _r, ...modelParams } = optimizeBase;
    const projection = projectIncomeHoldoutReserve({
      ...modelParams,
      fullQualifiedBalance: 500_000,
    });
    expect(projection.holdoutReserve).toBeGreaterThan(0);
    expect(projection.overlapStartAge).toBe(67);
    const fullModel = buildRothConversionModel({
      ...optimizeBase,
      totalAccountValue: 500_000,
    });
    expect(projection.overlapEndAge).toBe(conversionCompleteAgeFromModel(fullModel));
  });

  it("escalating IRA shortfall is higher before Social Security begins", () => {
    const atRetirement = portfolioIncomeShortfallForAge({
      age: 67,
      retireAge: 67,
      ssStartAge: 67,
      baseNeed: 80_000,
      baseSS: 40_000,
      fundNeedFromIra: true,
    });
    const beforeSs = portfolioIncomeShortfallForAge({
      age: 67,
      retireAge: 67,
      ssStartAge: 70,
      baseNeed: 80_000,
      baseSS: 40_000,
      fundNeedFromIra: true,
    });
    expect(beforeSs.portfolioIncomeShortfall).toBe(80_000);
    expect(atRetirement.portfolioIncomeShortfall).toBe(40_000);
    expect(beforeSs.portfolioIncomeShortfall).toBeGreaterThan(atRetirement.portfolioIncomeShortfall);
  });

  describe("holdoutWithdrawalRequiredForAge", () => {
    const shortfallForAge = (age: number) => (age >= 67 ? 80_000 : 0);

    it("returns max(RMD, shortfall) when shortfall equals RMD", () => {
      const combinedFor80kRmd = 80_000 * 26.5;
      const withdrawal = holdoutWithdrawalRequiredForAge({
        age: 73,
        retireAge: 67,
        holdoutAfterGrowth: 0,
        convertAtYearStart: combinedFor80kRmd,
        growth: 0,
        shortfallForAge,
      });
      expect(withdrawal).toBe(80_000);
    });

    it("returns shortfall when shortfall exceeds RMD", () => {
      const combinedFor80kRmd = 80_000 * 26.5;
      const withdrawal = holdoutWithdrawalRequiredForAge({
        age: 73,
        retireAge: 67,
        holdoutAfterGrowth: 0,
        convertAtYearStart: combinedFor80kRmd,
        growth: 0,
        shortfallForAge: () => 100_000,
      });
      expect(withdrawal).toBe(100_000);
    });
  });

  describe("minimumStartingHoldoutReserve age 73+ survival", () => {
    it("rejects holdout that only covers the first conversion year", () => {
      const growthByAge = new Map([
        [73, 0.05],
        [74, 0.05],
        [75, 0.05],
      ]);
      const convertBalanceAtAgeStart = new Map([
        [73, 900_000],
        [74, 600_000],
        [75, 300_000],
      ]);
      const shortfallForAge = () => 80_000;

      const minimum = minimumStartingHoldoutReserve({
        startAge: 73,
        retireAge: 67,
        conversionCompleteAge: 75,
        growthByAge,
        shortfallForAge,
        convertBalanceAtAgeStart,
      });

      expect(minimum).toBeGreaterThan(80_000);
    });
  });

  it("age 73 $1M scenario reserves meaningful holdout instead of ~full pool conversion", () => {
    const annualSS = 4_606 * 12 + 2_303 * 12;
    const result = computeOptimizedRothPremiumAmount({
      fullQualifiedBalance: 1_000_000,
      currentAge: RMD_ILLUSTRATION_START_AGE,
      retirementAge: 67,
      retirementSpendableIncomeAnnual: 150_000,
      annualSocialSecurityGross: annualSS,
      socialSecurityStartAge: 67,
      federalTaxBracketId: "24",
      marriedFilingJointly: true,
      annualAdjustedGrossIncomePreRetirement: 200_000,
      retirementIncomeFromConversionAccount: true,
      protectInitialInvestment: false,
      useFixedIndexContract: true,
      contractEstimatedRateOfReturnPct: "5",
      ficPremiumBonusPct: "10",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.holdoutReserve).toBeGreaterThan(50_000);
    expect(result.amount).toBeLessThan(950_000);
    expect(result.amount + result.holdoutReserve).toBe(1_000_000);
    expect(result.overlapStartAge).toBe(73);
    const model = buildRothConversionModel({
      currentAge: RMD_ILLUSTRATION_START_AGE,
      retirementAge: 67,
      retirementSpendableIncomeAnnual: 150_000,
      annualSocialSecurityGross: annualSS,
      socialSecurityStartAge: 67,
      federalTaxBracketId: "24",
      marriedFilingJointly: true,
      annualAdjustedGrossIncomePreRetirement: 200_000,
      retirementIncomeFromConversionAccount: true,
      protectInitialInvestment: false,
      useFixedIndexContract: true,
      contractEstimatedRateOfReturnPct: "5",
      ficPremiumBonusPct: "10",
      totalAccountValue: result.amount,
      stayTraditionalStartingBalance: 1_000_000,
      incomeHoldoutReserve: result.holdoutReserve,
    });
    expect(isFullyConvertedWithinHorizon(model)).toBe(true);
  });

  const fiveMillionFixture = {
    fullQualifiedBalance: 5_000_000,
    currentAge: RMD_ILLUSTRATION_START_AGE,
    retirementAge: 67,
    retirementSpendableIncomeAnnual: 400_000,
    annualAdjustedGrossIncomePreRetirement: 420_000,
    annualSocialSecurityGross: 55_272,
    socialSecurityStartAge: 67,
    federalTaxBracketId: "35",
    marriedFilingJointly: true,
    retirementIncomeFromConversionAccount: true as const,
    useFixedIndexContract: true,
    contractEstimatedRateOfReturnPct: "5",
    ficPremiumBonusPct: "10",
  };

  it("$5M age 73+ MFJ 35% protect on vs off — same amount and holdout", () => {
    const protectOn = computeOptimizedRothPremiumAmount({
      ...fiveMillionFixture,
      protectInitialInvestment: true,
    });
    const protectOff = computeOptimizedRothPremiumAmount({
      ...fiveMillionFixture,
      protectInitialInvestment: false,
    });
    expect(protectOn.ok).toBe(true);
    expect(protectOff.ok).toBe(true);
    if (!protectOn.ok || !protectOff.ok) return;
    expect(protectOn.holdoutReserve).toBeGreaterThan(0);
    expect(protectOff.holdoutReserve).toBeGreaterThan(0);
    expect(Math.abs(protectOn.amount - protectOff.amount)).toBeLessThanOrEqual(1);
    expect(Math.abs(protectOn.holdoutReserve - protectOff.holdoutReserve)).toBeLessThanOrEqual(1);
    expect(protectOn.amount + protectOn.holdoutReserve).toBe(5_000_000);
    expect(protectOff.amount + protectOff.holdoutReserve).toBe(5_000_000);
  });

  it("full-pool reference completes sooner at 35% than 32%", () => {
    const shared = {
      ...fiveMillionFixture,
      totalAccountValue: 5_000_000,
      stayTraditionalStartingBalance: 5_000_000,
      incomeHoldoutReserve: 0,
      protectInitialInvestment: false,
    };
    const at35 = buildRothConversionModel({ ...shared, federalTaxBracketId: "35" });
    const at32 = buildRothConversionModel({ ...shared, federalTaxBracketId: "32" });
    const complete35 = conversionCompleteAgeFromModel(at35);
    const complete32 = conversionCompleteAgeFromModel(at32);
    expect(complete35).not.toBeNull();
    expect(complete32).not.toBeNull();
    expect(complete35!).toBeLessThanOrEqual(complete32!);
  });

  it("projectIncomeHoldoutReserve is neutral to protect and similar across nearby brackets", () => {
    const protectOn = projectIncomeHoldoutReserve({
      ...fiveMillionFixture,
      protectInitialInvestment: true,
    });
    const protectOff = projectIncomeHoldoutReserve({
      ...fiveMillionFixture,
      protectInitialInvestment: false,
    });
    expect(Math.abs(protectOn.holdoutReserve - protectOff.holdoutReserve)).toBeLessThanOrEqual(1);
    const at35 = projectIncomeHoldoutReserve({
      ...fiveMillionFixture,
      federalTaxBracketId: "35",
    });
    const at32 = projectIncomeHoldoutReserve({
      ...fiveMillionFixture,
      federalTaxBracketId: "32",
    });
    expect(at35.holdoutReserve).toBeGreaterThan(0);
    expect(at32.holdoutReserve).toBeGreaterThan(0);
    expect(at35.holdoutReserve).toBeLessThanOrEqual(at32.holdoutReserve);
  });

  it("35% bracket yields higher optimized amount than 32% for same inputs", () => {
    const at35 = computeOptimizedRothPremiumAmount({
      ...fiveMillionFixture,
      protectInitialInvestment: false,
      federalTaxBracketId: "35",
    });
    const at32 = computeOptimizedRothPremiumAmount({
      ...fiveMillionFixture,
      protectInitialInvestment: false,
      federalTaxBracketId: "32",
    });
    expect(at35.ok).toBe(true);
    expect(at32.ok).toBe(true);
    if (!at35.ok || !at32.ok) return;
    expect(at35.amount).toBeGreaterThanOrEqual(at32.amount);
  });

  it("FIC surrender 10 at start 60 completes by age 69", () => {
    const result = computeOptimizedRothPremiumAmount({
      ...optimizeBase,
      currentAge: 60,
      retirementAge: 67,
      fullQualifiedBalance: 2_000_000,
      protectInitialInvestment: false,
      retirementIncomeFromConversionAccount: false,
      useFixedIndexContract: true,
      ficSurrenderYears: "10",
      federalTaxBracketId: "32",
      annualAdjustedGrossIncomePreRetirement: 200_000,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const model = buildRothConversionModel({
      ...optimizeBase,
      currentAge: 60,
      retirementAge: 67,
      totalAccountValue: result.amount,
      protectInitialInvestment: false,
      retirementIncomeFromConversionAccount: false,
      useFixedIndexContract: true,
      ficSurrenderYears: "10",
      federalTaxBracketId: "32",
      annualAdjustedGrossIncomePreRetirement: 200_000,
    });
    const completeAge = conversionCompleteAgeFromModel(model);
    expect(completeAge).not.toBeNull();
    expect(completeAge!).toBeLessThanOrEqual(69);
  });

  it("FIC surrender 10 at start 73 caps premium below full $5M pool", () => {
    const result = computeOptimizedRothPremiumAmount({
      ...fiveMillionFixture,
      protectInitialInvestment: false,
      ficSurrenderYears: "10",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.amount).toBeLessThan(5_000_000);
    expect(result.amount + result.holdoutReserve).toBe(5_000_000);
    const model = buildRothConversionModel({
      ...fiveMillionFixture,
      totalAccountValue: result.amount,
      stayTraditionalStartingBalance: 5_000_000,
      incomeHoldoutReserve: result.holdoutReserve,
      protectInitialInvestment: false,
      ficSurrenderYears: "10",
    });
    const completeAge = conversionCompleteAgeFromModel(model);
    expect(completeAge).not.toBeNull();
    expect(completeAge!).toBeLessThanOrEqual(82);
  });

  it("protect on only returns premiums with ending Roth at or above premium", () => {
    const result = computeOptimizedRothPremiumAmount({
      ...fiveMillionFixture,
      protectInitialInvestment: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const model = buildRothConversionModel({
      ...fiveMillionFixture,
      totalAccountValue: result.amount,
      stayTraditionalStartingBalance: 5_000_000,
      incomeHoldoutReserve: result.holdoutReserve,
      protectInitialInvestment: true,
    });
    expect(model.rothConversionTotals.endingTotalRothBalance).toBeGreaterThanOrEqual(model.conversionPremium);
  });

  it("CA state tax smoke: optimizer succeeds and partitions full pool", () => {
    const result = computeOptimizedRothPremiumAmount({
      fullQualifiedBalance: 1_000_000,
      currentAge: 65,
      retirementAge: 67,
      retirementSpendableIncomeAnnual: 120_000,
      annualAdjustedGrossIncomePreRetirement: 150_000,
      federalTaxBracketId: "24",
      marriedFilingJointly: false,
      stateOfResidence: "CA",
      retirementIncomeFromConversionAccount: true,
      protectInitialInvestment: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.amount + result.holdoutReserve).toBe(1_000_000);
    const model = buildRothConversionModel({
      totalAccountValue: result.amount,
      stayTraditionalStartingBalance: 1_000_000,
      incomeHoldoutReserve: result.holdoutReserve,
      currentAge: 65,
      retirementAge: 67,
      retirementSpendableIncomeAnnual: 120_000,
      annualAdjustedGrossIncomePreRetirement: 150_000,
      federalTaxBracketId: "24",
      marriedFilingJointly: false,
      stateOfResidence: "CA",
      retirementIncomeFromConversionAccount: true,
      protectInitialInvestment: false,
    });
    expect(model.stayTraditional[0]!.illustrativeStateTax).toBeGreaterThan(0);
  });

  it("TX state tax smoke: no state tax; premium at least CA scenario", () => {
    const base = {
      fullQualifiedBalance: 1_000_000,
      currentAge: 65,
      retirementAge: 67,
      retirementSpendableIncomeAnnual: 120_000,
      annualAdjustedGrossIncomePreRetirement: 150_000,
      federalTaxBracketId: "24",
      marriedFilingJointly: false,
      retirementIncomeFromConversionAccount: true,
      protectInitialInvestment: false,
    };
    const ca = computeOptimizedRothPremiumAmount({ ...base, stateOfResidence: "CA" });
    const tx = computeOptimizedRothPremiumAmount({ ...base, stateOfResidence: "TX" });
    expect(ca.ok).toBe(true);
    expect(tx.ok).toBe(true);
    if (!ca.ok || !tx.ok) return;
    expect(tx.amount + tx.holdoutReserve).toBe(1_000_000);
    expect(tx.amount).toBeGreaterThanOrEqual(ca.amount);
    const txModel = buildRothConversionModel({
      ...base,
      stateOfResidence: "TX",
      totalAccountValue: tx.amount,
      stayTraditionalStartingBalance: 1_000_000,
      incomeHoldoutReserve: tx.holdoutReserve,
    });
    expect(txModel.stayTraditional[0]!.illustrativeStateTax).toBe(0);
  });

  it("RMD age 75 holdout uses pre-RMD deadline 74 when born 1960", () => {
    const projection = projectIncomeHoldoutReserve({
      fullQualifiedBalance: 800_000,
      currentAge: 66,
      retirementAge: 67,
      retirementSpendableIncomeAnnual: 100_000,
      annualAdjustedGrossIncomePreRetirement: 120_000,
      federalTaxBracketId: "22",
      marriedFilingJointly: false,
      retirementIncomeFromConversionAccount: true,
      clientDob: "1960-06-01",
      rmdStartAge: 75,
    });
    expect(projection.overlapEndAge).toBeLessThanOrEqual(74);
  });
});
