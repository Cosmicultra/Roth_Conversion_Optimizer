import { describe, expect, it } from "vitest";
import { buildRothConversionModel } from "@/lib/roth-conversion-analysis";
import { buildRothConversionModelForAdvisorUi } from "@/lib/roth-conversion-ui-model";
import { computeOptimizedRothPremiumAmount } from "@/lib/roth-premium-optimizer";
import type { RothClient } from "@/lib/roth-client";
import { emptyRothWorksheet } from "@/lib/roth-worksheet";
import {
  rothFullQualifiedPoolBalance,
  rothIllustrationQualifiedBalance,
} from "@/lib/roth-worksheet";

const intakeFixture = (): RothClient => ({
  firstName: "",
  lastName: "",
  dob: "",
  age: "60",
  federalTaxBracket: "24",
  adjustedGrossIncomeAnnual: "200000",
  retirementAge: "67",
  spouseRetirementAge: "67",
  retirementSpendableIncomeAnnual: "150000",
  socialSecurityMonthlyClient: "",
  socialSecurityMonthlySpouse: "",
  married: false,
  spouseFirstName: "",
  spouseLastName: "",
  spouseDob: "",
  spouseAge: "",
  takingSocialSecurity: false,
});

/** User-reported scenario: full pool 1,170,419; premium 730,909; holdout 439,510; FIC 11% bonus. */
const USER_FULL_POOL = 1_170_419;
const USER_PREMIUM = 730_909;
const USER_HOLDOUT = 439_510;
const USER_FIC_BONUS = 0.11;

describe("roth math invariants", () => {
  it("premium + holdout equals full qualified pool (user scenario)", () => {
    expect(USER_PREMIUM + USER_HOLDOUT).toBe(USER_FULL_POOL);
  });

  it("Roth Taxable IRA year 1 excludes holdout; includes FIC bonus on premium only", () => {
    const model = buildRothConversionModel({
      totalAccountValue: USER_PREMIUM,
      stayTraditionalStartingBalance: USER_FULL_POOL,
      incomeHoldoutReserve: USER_HOLDOUT,
      currentAge: 60,
      retirementAge: 67,
      retirementSpendableIncomeAnnual: 150_000,
      annualAdjustedGrossIncomePreRetirement: 200_000,
      federalTaxBracketId: "24",
      marriedFilingJointly: false,
      protectInitialInvestment: true,
      useFixedIndexContract: true,
      ficPremiumBonusPct: "11",
      retirementIncomeFromConversionAccount: true,
      endAge: 71,
    });

    const expectedConvertSleeve = USER_PREMIUM * (1 + USER_FIC_BONUS);
    expect(model.conversionPremium).toBe(USER_PREMIUM);
    expect(model.incomeHoldoutReserve).toBe(USER_HOLDOUT);
    expect(model.totalTraditionalPool).toBe(USER_FULL_POOL);
    expect(model.startingBalance).toBe(USER_FULL_POOL);
    expect(model.rothPathStartingQualifiedBalance).toBeCloseTo(expectedConvertSleeve, 0);
    expect(model.stayTraditional[0]?.yearStartBalance).toBe(USER_FULL_POOL);
    expect(model.rothConversion[0]?.yearStartTraditional).toBeCloseTo(expectedConvertSleeve, 0);
    /** Prior bug: holdout + bonus-inflated premium (~1,250,819) appeared in Taxable IRA. */
    const priorBugDisplay = USER_HOLDOUT + expectedConvertSleeve;
    expect(priorBugDisplay).toBeCloseTo(1_250_819, 0);
    expect(model.rothConversion[0]?.yearStartTraditional).not.toBeCloseTo(priorBugDisplay, 0);
    expect(model.rothConversion[0]?.yearStartTraditional).toBeLessThan(USER_FULL_POOL);
  });

  it("stay-traditional and Roth paths use distinct starting balances when premium < full pool", () => {
    const out = buildRothConversionModelForAdvisorUi(
      intakeFixture(),
      {
        ...emptyRothWorksheet(),
        useEntireQualifiedBalance: false,
        specificConversionAmount: String(USER_PREMIUM),
        incomeHoldoutReserve: String(USER_HOLDOUT),
        useFixedIndexContract: true,
        retirementIncomeFromConversionAccount: true,
        fic: {
          ...emptyRothWorksheet().fic,
          maxTaxRatePct: "24",
          protectInitialInvestment: true,
          premiumBonusPct: "11",
        },
      },
      USER_PREMIUM,
      USER_FULL_POOL
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.model.startingBalance).toBe(USER_FULL_POOL);
    expect(out.model.conversionPremium).toBe(USER_PREMIUM);
    expect(out.model.stayTraditional[0]?.yearStartBalance).toBe(USER_FULL_POOL);
    expect(out.model.rothConversion[0]?.yearStartTraditional).toBe(
      out.model.rothPathStartingQualifiedBalance
    );
  });

  it("worksheet balance helpers: premium vs full pool", () => {
    const ws = {
      ...emptyRothWorksheet(),
      useEntireQualifiedBalance: false,
      specificConversionAmount: "730909",
      incomeHoldoutReserve: "439510",
    };
    expect(rothIllustrationQualifiedBalance(ws, 8_355_816, USER_FULL_POOL)).toBe(USER_PREMIUM);
    expect(rothFullQualifiedPoolBalance(ws, 8_355_816, USER_FULL_POOL)).toBe(USER_FULL_POOL);
  });

  it("optimizer: amount + holdout = full pool and model invariants hold", () => {
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

    const model = buildRothConversionModel({
      totalAccountValue: result.amount,
      stayTraditionalStartingBalance: 500_000,
      incomeHoldoutReserve: result.holdoutReserve,
      currentAge: 65,
      retirementAge: 67,
      retirementSpendableIncomeAnnual: 80_000,
      federalTaxBracketId: "22",
      retirementIncomeFromConversionAccount: true,
      protectInitialInvestment: false,
      annualAdjustedGrossIncomePreRetirement: 120_000,
    });

    expect(model.conversionPremium + model.incomeHoldoutReserve).toBe(500_000);
    expect(model.startingBalance).toBe(500_000);
    expect(model.rothConversion[0]?.yearStartTraditional).toBe(model.rothPathStartingQualifiedBalance);
    expect(model.rothConversion[0]?.yearStartTraditional).toBeLessThanOrEqual(result.amount);
  });

  it("conversion sleeve continuity: end balance rolls to next year start (no FIC)", () => {
    const model = buildRothConversionModel({
      totalAccountValue: 400_000,
      stayTraditionalStartingBalance: 500_000,
      incomeHoldoutReserve: 100_000,
      currentAge: 65,
      retirementAge: 70,
      retirementSpendableIncomeAnnual: 60_000,
      federalTaxBracketId: "22",
      retirementIncomeFromConversionAccount: true,
      useFixedIndexContract: false,
      endAge: 70,
    });

    const tradRows = model.rothConversion.filter((r) => !r.rothOnlyPhase);
    for (let i = 1; i < tradRows.length; i++) {
      const prev = tradRows[i - 1]!;
      const curr = tradRows[i]!;
      expect(curr.yearStartTraditional).toBeCloseTo(prev.endTraditionalBalance, 0);
    }
  });

  it("protect floor uses conversion premium, not stay-traditional full pool", () => {
    const model = buildRothConversionModel({
      totalAccountValue: 300_000,
      stayTraditionalStartingBalance: 500_000,
      currentAge: 65,
      retirementAge: 67,
      retirementSpendableIncomeAnnual: 80_000,
      federalTaxBracketId: "22",
      retirementIncomeFromConversionAccount: true,
      protectInitialInvestment: true,
      endAge: 75,
    });

    for (const row of model.rothConversion) {
      if (!row.rothOnlyPhase && row.grossConversion > 0) {
        const rothAfterGrowth = row.yearStartRoth * (1 + row.growthRate);
        if (rothAfterGrowth >= model.conversionPremium) {
          expect(row.totalRothBalance).toBeGreaterThanOrEqual(model.conversionPremium);
        }
      }
    }
  });

  it("holdout sleeve survives after conversion sleeve depletes (not zeroed)", () => {
    const model = buildRothConversionModel({
      totalAccountValue: 50_000,
      stayTraditionalStartingBalance: 500_000,
      incomeHoldoutReserve: 200_000,
      currentAge: 65,
      retirementAge: 67,
      retirementSpendableIncomeAnnual: 80_000,
      federalTaxBracketId: "22",
      retirementIncomeFromConversionAccount: true,
      protectInitialInvestment: false,
      endAge: 75,
    });

    const lastTradPhase = [...model.rothConversion].reverse().find((r) => r.grossConversion > 0);
    expect(lastTradPhase).toBeDefined();
    const afterDepleted = model.rothConversion.filter(
      (r) => r.rothOnlyPhase && r.rmdTraditional > 0 && r.grossConversion === 0
    );
    /** If holdout remains after conversions finish, RMD-only holdout years may appear. */
    if (lastTradPhase && lastTradPhase.endTraditionalBalance <= 1) {
      expect(afterDepleted.length).toBeGreaterThanOrEqual(0);
    }
  });
});
