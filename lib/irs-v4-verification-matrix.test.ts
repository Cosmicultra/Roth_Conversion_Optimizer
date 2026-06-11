import { describe, expect, it } from "vitest";
import {
  buildRothConversionModel,
  ROTH_ASSUMPTION_VERSION,
} from "@/lib/roth-conversion-analysis";
import { buildOrdinaryIncomeStack } from "@/lib/ordinary-income-stack";
import { taxableSocialSecurityBenefits } from "@/lib/social-security-taxation";
import { computeOptimizedRothPremiumAmount } from "@/lib/roth-premium-optimizer";
import { conversionCompleteAgeFromModel } from "@/lib/conversion-deadlines";

const base = {
  totalAccountValue: 500_000,
  currentAge: 65,
  retirementAge: 67,
  retirementSpendableIncomeAnnual: 80_000,
  federalTaxBracketId: "22",
  retirementIncomeFromConversionAccount: true,
};

describe("IRS v4 verification matrix", () => {
  it("1 — working year bracket cap uses AGI only", () => {
    const stack = buildOrdinaryIncomeStack({
      retired: false,
      agiAnnual: 200_000,
      grossSocialSecurityBenefits: 0,
      iraOrdinaryDistributions: 0,
      filing: "single",
    });
    expect(stack.otherGrossOrdinaryBeforeConversion).toBe(200_000);
    expect(stack.iraOrdinaryDistributions).toBe(0);
  });

  it("2 — retired tax base is IRA flows + taxable SS, not gross retirement need", () => {
    const model = buildRothConversionModel({
      ...base,
      currentAge: 73,
      endAge: 73,
      retirementSpendableIncomeAnnual: 400_000,
      annualSocialSecurityGross: 55_000,
      socialSecurityStartAge: 67,
      marriedFilingJointly: true,
    });
    const row = model.stayTraditional[0]!;
    expect(row.totalOrdinaryForIllustration).toBeLessThan(row.retirementNeedAnnual);
  });

  it("3 — taxable Social Security tiers (MFJ)", () => {
    const taxable = taxableSocialSecurityBenefits({
      filing: "married",
      grossSocialSecurityBenefits: 55_000,
      otherOrdinaryIncome: 80_000,
    });
    expect(taxable).toBeGreaterThan(0);
    expect(taxable).toBeLessThan(55_000);
  });

  it("4 — total deductions override lowers federal tax", () => {
    const baseline = buildRothConversionModel({
      ...base,
      endAge: 65,
      marriedFilingJointly: false,
      annualAdjustedGrossIncomePreRetirement: 120_000,
    });
    const override = buildRothConversionModel({
      ...base,
      endAge: 65,
      marriedFilingJointly: false,
      annualAdjustedGrossIncomePreRetirement: 120_000,
      totalDeductionsAnnual: "50000",
    });
    expect(override.stayTraditional[0]!.illustrativeFederalTax).toBeLessThan(
      baseline.stayTraditional[0]!.illustrativeFederalTax
    );
  });

  it("5 — external conversion tax: net Roth equals gross", () => {
    const model = buildRothConversionModel({
      ...base,
      endAge: 65,
      payConversionTaxFrom: "external",
    });
    const row = model.rothConversion[0]!;
    expect(row.netConversionToRoth).toBe(row.grossConversion);
  });

  it("6 — California progressive state tax", () => {
    const model = buildRothConversionModel({
      ...base,
      endAge: 65,
      marriedFilingJointly: false,
      annualAdjustedGrossIncomePreRetirement: 150_000,
      stateOfResidence: "CA",
    });
    expect(model.stayTraditional[0]!.illustrativeStateTax).toBeGreaterThan(0);
  });

  it("7 — Texas has no state income tax", () => {
    const model = buildRothConversionModel({
      ...base,
      endAge: 65,
      marriedFilingJointly: false,
      annualAdjustedGrossIncomePreRetirement: 150_000,
      stateOfResidence: "TX",
    });
    expect(model.stayTraditional[0]!.illustrativeStateTax).toBe(0);
  });

  it("8 — RMD birth year 1960+ starts at age 75", () => {
    const model = buildRothConversionModel({
      ...base,
      currentAge: 66,
      endAge: 76,
      clientDob: "1960-06-01",
      rmdStartAge: 75,
    });
    expect(model.stayTraditional.find((r) => r.age === 74)!.rmd).toBe(0);
    expect(model.stayTraditional.find((r) => r.age === 75)!.rmd).toBeGreaterThan(0);
  });

  it("9 — Joint RMD when MFJ spouse more than 10 years younger", () => {
    const joint = buildRothConversionModel({
      totalAccountValue: 1_000_000,
      currentAge: 73,
      endAge: 73,
      retirementAge: 80,
      retirementSpendableIncomeAnnual: 60_000,
      federalTaxBracketId: "22",
      marriedFilingJointly: true,
      spouseStartAge: 58,
      retirementIncomeFromConversionAccount: false,
    });
    expect(joint.stayTraditional[0]!.rmd).toBeCloseTo(1_000_000 / 28.9, 0);
  });

  it("10 — protect on/off: identical year-by-year gross conversions", () => {
    const shared = {
      totalAccountValue: 400_000,
      currentAge: 65,
      retirementAge: 67,
      retirementSpendableIncomeAnnual: 80_000,
      federalTaxBracketId: "22",
      retirementIncomeFromConversionAccount: true,
      endAge: 70,
    };
    const off = buildRothConversionModel({ ...shared, protectInitialInvestment: false });
    const on = buildRothConversionModel({ ...shared, protectInitialInvestment: true });
    const grossOff = off.rothConversion.filter((r) => !r.rothOnlyPhase).map((r) => r.grossConversion);
    const grossOn = on.rothConversion.filter((r) => !r.rothOnlyPhase).map((r) => r.grossConversion);
    expect(grossOn).toEqual(grossOff);
  });

  it("11 — holdout pool partition: premium + holdout = full pool", () => {
    const result = computeOptimizedRothPremiumAmount({
      fullQualifiedBalance: 500_000,
      currentAge: 65,
      retirementAge: 67,
      retirementSpendableIncomeAnnual: 80_000,
      federalTaxBracketId: "22",
      retirementIncomeFromConversionAccount: true,
      protectInitialInvestment: false,
      annualAdjustedGrossIncomePreRetirement: 120_000,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.amount + result.holdoutReserve).toBe(500_000);
  });

  it("12 — FIC surrender 10 at start 60 completes by age 69", () => {
    const result = computeOptimizedRothPremiumAmount({
      fullQualifiedBalance: 2_000_000,
      currentAge: 60,
      retirementAge: 67,
      retirementSpendableIncomeAnnual: 100_000,
      federalTaxBracketId: "32",
      retirementIncomeFromConversionAccount: false,
      protectInitialInvestment: false,
      useFixedIndexContract: true,
      ficSurrenderYears: "10",
      annualAdjustedGrossIncomePreRetirement: 150_000,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const model = buildRothConversionModel({
      totalAccountValue: result.amount,
      stayTraditionalStartingBalance: 2_000_000,
      currentAge: 60,
      retirementAge: 67,
      retirementSpendableIncomeAnnual: 100_000,
      federalTaxBracketId: "32",
      retirementIncomeFromConversionAccount: false,
      useFixedIndexContract: true,
      ficSurrenderYears: "10",
      annualAdjustedGrossIncomePreRetirement: 150_000,
    });
    const completeAge = conversionCompleteAgeFromModel(model);
    expect(completeAge).not.toBeNull();
    expect(completeAge!).toBeLessThanOrEqual(69);
  });

  it("13 — assumption version is 2026-06-irs-ordinary-income-v5", () => {
    const model = buildRothConversionModel(base);
    expect(model.assumptions[0]).toContain(ROTH_ASSUMPTION_VERSION);
    expect(ROTH_ASSUMPTION_VERSION).toBe("2026-06-irs-ordinary-income-v5");
  });
});
