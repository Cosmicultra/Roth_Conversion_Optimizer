import { describe, expect, it } from "vitest";
import {
  buildRothConversionModel,
  computeFicRothGrowthRateForYear,
  illustratedOrdinaryIncomeBase,
  maxGrossConversionRespectingRothFloor,
  ROTH_ASSUMPTION_VERSION,
  rothPathGrowthAnnual,
  rothPathReturnForAge,
} from "./roth-conversion-analysis";
import {
  maxRothConversionGrossThisYear,
  standardDeductionBreakdownIllustration,
} from "./federal-tax-illustration";

const baseInput = {
  totalAccountValue: 500_000,
  currentAge: 65,
  retirementAge: 67,
  retirementSpendableIncomeAnnual: 80_000,
  federalTaxBracketId: "22",
  retirementIncomeFromConversionAccount: true,
};

describe("roth-conversion-analysis", () => {
  it("uses the documented legacy age-based Roth path helper (still exported)", () => {
    expect(rothPathReturnForAge(69)).toBe(0.04);
    expect(rothPathReturnForAge(70)).toBe(0.1);
  });

  it("uses worksheet FIC percent when provided", () => {
    expect(
      rothPathGrowthAnnual({ useFixedIndexContract: true, contractEstimatedRateOfReturnPct: "7.5" })
    ).toBeCloseTo(0.075);
  });

  it("report Income column: AGI-only pre-retirement, retirement income only after retirement age", () => {
    const model = buildRothConversionModel({
      ...baseInput,
      annualAdjustedGrossIncomePreRetirement: 200_000,
      marriedFilingJointly: false,
    });
    const pre = model.stayTraditional.find((r) => r.age === 65);
    const post = model.stayTraditional.find((r) => r.age === 67);
    expect(pre?.reportIncomeAnnual).toBe(200_000);
    expect(post?.reportIncomeAnnual).toBe(80_000);
    const rothPre = model.rothConversion.find((r) => r.age === 65);
    const rothPost = model.rothConversion.find((r) => r.age === 67);
    expect(rothPre?.reportIncomeAnnual).toBe(200_000);
    expect(rothPost?.reportIncomeAnnual).toBe(80_000);
  });

  it("builds rows through age 95 and preserves core inputs", () => {
    const model = buildRothConversionModel({
      ...baseInput,
      annualSocialSecurityGross: 30_000,
      marriedFilingJointly: false,
    });

    expect(model.startingBalance).toBe(500_000);
    expect(model.stayTraditional[0]?.age).toBe(65);
    expect(model.stayTraditional.at(-1)?.age).toBe(95);
    expect(model.rothConversion.length).toBe(model.stayTraditional.length);
    expect(model.rothConversionTotals.totalGrossConversion).toBeGreaterThan(0);
    expect(model.assumptions[0]).toContain(ROTH_ASSUMPTION_VERSION);
  });

  it("uses flat 10% Roth path growth without FIC worksheet path", () => {
    const model = buildRothConversionModel({
      ...baseInput,
      annualSocialSecurityGross: 30_000,
      marriedFilingJointly: false,
      useFixedIndexContract: false,
    });
    expect(model.rothConversion[0]?.growthRate).toBeCloseTo(0.1);
    expect(model.rothPathStartingQualifiedBalance).toBe(model.startingBalance);
  });

  it("when income is not from conversion account, IRA distributions are RMD-only in retirement", () => {
    const model = buildRothConversionModel({
      ...baseInput,
      annualSocialSecurityGross: 0,
      marriedFilingJointly: false,
      retirementIncomeFromConversionAccount: false,
      endAge: 75,
    });
    const retiredWithRmd = model.stayTraditional.find((r) => r.age === 73);
    expect(retiredWithRmd).toBeDefined();
    if (!retiredWithRmd) return;
    expect(retiredWithRmd.portfolioIncomeShortfall).toBe(0);
    expect(retiredWithRmd.nonIraRetirementIncome).toBe(Math.floor(80_000 * Math.pow(1.03, 6)));
    expect(retiredWithRmd.totalIraDistribution).toBe(retiredWithRmd.rmd);
    expect(retiredWithRmd.totalOrdinaryForIllustration).toBe(retiredWithRmd.totalIraDistribution);
    expect(retiredWithRmd.totalOrdinaryForIllustration).toBeLessThan(retiredWithRmd.retirementNeedAnnual);
  });

  it("pre-retirement tax base uses inclusive AGI only, not stacked SS or IRA flows", () => {
    const model = buildRothConversionModel({
      ...baseInput,
      annualAdjustedGrossIncomePreRetirement: 200_000,
      annualSocialSecurityGross: 30_000,
      socialSecurityStartAge: 65,
      marriedFilingJointly: false,
      currentAge: 65,
      retirementAge: 67,
      endAge: 72,
    });
    const pre = model.stayTraditional.find((r) => r.age === 65);
    expect(pre).toBeDefined();
    if (!pre) return;
    expect(pre.socialSecurityAnnualGross).toBe(30_000);
    expect(pre.totalOrdinaryForIllustration).toBe(200_000);
    expect(
      illustratedOrdinaryIncomeBase({
        retired: false,
        agiAnnual: 200_000,
        retirementNeedAnnual: 80_000,
      })
    ).toBe(200_000);
  });

  it("high retirement need does not block pre-retirement conversions when AGI is below bracket ceiling", () => {
    const agi = 420_000;
    const model = buildRothConversionModel({
      totalAccountValue: 1_000_000,
      currentAge: 60,
      retirementAge: 67,
      retirementSpendableIncomeAnnual: 400_000,
      federalTaxBracketId: "35",
      marriedFilingJointly: true,
      annualAdjustedGrossIncomePreRetirement: agi,
      protectInitialInvestment: false,
      retirementIncomeFromConversionAccount: true,
      endAge: 65,
    });
    const year1 = model.rothConversion[0];
    expect(year1).toBeDefined();
    if (!year1) return;

    const ded = standardDeductionBreakdownIllustration({
      filing: "married",
      calendarYearOffset: 0,
      clientAge: 60,
      spouseAge: null,
    });
    const expectedCap = maxRothConversionGrossThisYear({
      otherGrossOrdinaryIncome: agi,
      tradBalanceAvailableAfterRmd: 1_000_000 * 1.1,
      statedBracketId: "35",
      deduction: { filing: "married", calendarYearOffset: 0, clientAge: 60, spouseAge: null },
    });

    expect(year1.grossConversion).toBeGreaterThan(0);
    expect(year1.capFromBracketConversion).toBe(expectedCap);
    expect(expectedCap).toBeGreaterThan(300_000);
    expect(ded.total).toBeGreaterThan(0);
  });

  it("when income is from conversion account, IRA funds retirement shortfall", () => {
    const model = buildRothConversionModel({
      ...baseInput,
      annualSocialSecurityGross: 0,
      marriedFilingJointly: false,
      retirementIncomeFromConversionAccount: true,
      endAge: 75,
    });
    const retired = model.stayTraditional.find((r) => r.age === 67);
    expect(retired).toBeDefined();
    if (!retired) return;
    expect(retired.portfolioIncomeShortfall).toBe(80_000);
    expect(retired.nonIraRetirementIncome).toBe(0);
    expect(retired.totalIraDistribution).toBeGreaterThanOrEqual(80_000);
    const retiredRoth = model.rothConversion.find((r) => r.age === 67 && !r.rothOnlyPhase);
    expect(retiredRoth?.portfolioIncomeWithdrawal).toBe(80_000);
  });

  it("income holdout sleeve funds retirement withdrawals before conversion sleeve depletes", () => {
    const model = buildRothConversionModel({
      ...baseInput,
      totalAccountValue: 300_000,
      stayTraditionalStartingBalance: 500_000,
      incomeHoldoutReserve: 200_000,
      annualSocialSecurityGross: 0,
      marriedFilingJointly: false,
      endAge: 70,
    });
    expect(model.incomeHoldoutReserve).toBe(200_000);
    expect(model.totalTraditionalPool).toBe(500_000);
    expect(model.conversionPremium).toBe(300_000);
    expect(model.startingBalance).toBe(500_000);
    expect(model.stayTraditional[0]?.yearStartBalance).toBe(500_000);
    expect(model.rothConversion[0]?.yearStartTraditional).toBe(300_000);
    const retiredRoth = model.rothConversion.find((r) => r.age === 67 && !r.rothOnlyPhase);
    expect(retiredRoth?.portfolioIncomeWithdrawal).toBe(80_000);
    expect(retiredRoth?.balanceBeforeConversion).toBeGreaterThan(0);
  });

  it("applies 65+ additional standard deduction in tax years", () => {
    const under65 = buildRothConversionModel({
      ...baseInput,
      currentAge: 64,
      endAge: 64,
      marriedFilingJointly: false,
      annualAdjustedGrossIncomePreRetirement: 100_000,
    });
    const at65 = buildRothConversionModel({
      ...baseInput,
      currentAge: 65,
      endAge: 65,
      marriedFilingJointly: false,
      annualAdjustedGrossIncomePreRetirement: 100_000,
    });
    expect(at65.stayTraditional[0]!.additionalDeduction65Plus).toBe(1_600);
    expect(at65.stayTraditional[0]!.illustrativeFederalTax).toBeLessThan(
      under65.stayTraditional[0]!.illustrativeFederalTax
    );
  });

  it("retired tax base uses IRA flows and taxable SS, not gross retirement need", () => {
    const model = buildRothConversionModel({
      ...baseInput,
      currentAge: 73,
      retirementAge: 67,
      retirementSpendableIncomeAnnual: 400_000,
      annualSocialSecurityGross: 55_000,
      socialSecurityStartAge: 67,
      marriedFilingJointly: true,
      endAge: 74,
    });
    const row = model.stayTraditional.find((r) => r.age === 73);
    expect(row).toBeDefined();
    if (!row) return;
    expect(row.totalOrdinaryForIllustration).toBeLessThan(row.retirementNeedAnnual);
    expect(row.totalOrdinaryForIllustration).toBeGreaterThan(row.rmd);
  });

  it("applies state tax when state of residence is provided", () => {
    const model = buildRothConversionModel({
      ...baseInput,
      currentAge: 65,
      retirementAge: 67,
      endAge: 65,
      marriedFilingJointly: false,
      annualAdjustedGrossIncomePreRetirement: 150_000,
      stateOfResidence: "PA",
      retirementIncomeFromConversionAccount: false,
    });
    expect(model.stayTraditional[0]!.illustrativeStateTax).toBeGreaterThan(0);
  });

  it("FIC: premium bonus inflates Roth-path starting balance only", () => {
    const model = buildRothConversionModel({
      totalAccountValue: 800_000,
      currentAge: 65,
      retirementAge: 80,
      retirementSpendableIncomeAnnual: 60_000,
      federalTaxBracketId: "22",
      marriedFilingJointly: false,
      useFixedIndexContract: true,
      contractEstimatedRateOfReturnPct: "4",
      ficPremiumBonusPct: "11",
      retirementIncomeFromConversionAccount: true,
    });
    expect(model.startingBalance).toBe(800_000);
    expect(model.rothPathStartingQualifiedBalance).toBeCloseTo(888_000);
    expect(model.rothConversion[0]?.yearStartTraditional).toBeCloseTo(888_000);
    expect(model.stayTraditional[0]?.yearStartBalance).toBeCloseTo(800_000);
  });

  it("FIC: trailing bonus + surrender yields contract+trail, then contract, then current allocation rate", () => {
    /** Offsets 0–2: 4%+4%; 3–9: 4%; from 10+: 10% */
    const rates = [0, 1, 2, 3, 9, 10].map((off) =>
      computeFicRothGrowthRateForYear({
        yearOffset: off,
        surrenderYears: 10,
        trailBonusYears: 3,
        contractRateAnnual: 0.04,
        trailingBonusAnnual: 0.04,
        postSurrenderRateAnnual: 0.1,
      })
    );
    expect(rates[0]).toBeCloseTo(0.08);
    expect(rates[1]).toBeCloseTo(0.08);
    expect(rates[2]).toBeCloseTo(0.08);
    expect(rates[3]).toBeCloseTo(0.04);
    expect(rates[4]).toBeCloseTo(0.04);
    expect(rates[5]).toBeCloseTo(0.1);

    const model = buildRothConversionModel({
      totalAccountValue: 100_000,
      currentAge: 65,
      retirementAge: 80,
      retirementSpendableIncomeAnnual: 40_000,
      federalTaxBracketId: "22",
      marriedFilingJointly: false,
      useFixedIndexContract: true,
      contractEstimatedRateOfReturnPct: "4",
      ficTrailingBonusPct: "4",
      ficTrailBonusYears: "3",
      ficSurrenderYears: "10",
      endAge: 75,
      stayTraditionalReturn: 0.1,
      retirementIncomeFromConversionAccount: true,
    });
    const growthByAge = (a: number) => model.rothConversion.find((r) => r.age === a)?.growthRate;
    expect(growthByAge(65)).toBeCloseTo(0.08);
    expect(growthByAge(67)).toBeCloseTo(0.08);
    expect(growthByAge(68)).toBeCloseTo(0.04);
    expect(growthByAge(73)).toBeCloseTo(0.04);
    expect(growthByAge(74)).toBeCloseTo(0.04);
    expect(growthByAge(75)).toBeCloseTo(0.1);
  });

  it("protect off: depletes traditional by retirement with bracket-max conversions (FIA-style)", () => {
    const model = buildRothConversionModel({
      totalAccountValue: 1_170_419,
      currentAge: 60,
      retirementAge: 67,
      retirementSpendableIncomeAnnual: 85_000,
      federalTaxBracketId: "32",
      marriedFilingJointly: true,
      annualAdjustedGrossIncomePreRetirement: 250_000,
      protectInitialInvestment: false,
      useFixedIndexContract: true,
      contractEstimatedRateOfReturnPct: "4",
      ficPremiumBonusPct: "10",
      retirementIncomeFromConversionAccount: true,
      endAge: 72,
    });
    const atRetire = model.rothConversion.find((r) => r.age === 67);
    expect(atRetire).toBeDefined();
    if (!atRetire) return;
    expect(atRetire.endTraditionalBalance).toBeLessThanOrEqual(1);
    expect(atRetire.rothOnlyPhase || atRetire.endTraditionalBalance <= 1).toBe(true);
  });

  it("protect on: same pace as bracket max — not amortization-sized conversions at age 67", () => {
    const shared = {
      totalAccountValue: 800_000,
      currentAge: 60,
      retirementAge: 67,
      retirementSpendableIncomeAnnual: 85_000,
      federalTaxBracketId: "32",
      marriedFilingJointly: true,
      annualAdjustedGrossIncomePreRetirement: 250_000,
      useFixedIndexContract: true,
      contractEstimatedRateOfReturnPct: "4",
      retirementIncomeFromConversionAccount: true,
      endAge: 72,
    };
    const withProtect = buildRothConversionModel({ ...shared, protectInitialInvestment: true });
    const withoutProtect = buildRothConversionModel({ ...shared, protectInitialInvestment: false });
    const protectAt67 = withProtect.rothConversion.find((r) => r.age === 67);
    const offAt67 = withoutProtect.rothConversion.find((r) => r.age === 67);
    expect(protectAt67).toBeDefined();
    expect(offAt67).toBeDefined();
    if (!protectAt67 || !offAt67) return;
    if (protectAt67.grossConversion > 0 && protectAt67.yearStartTraditional > 0) {
      const amortStyleCap = protectAt67.balanceBeforeConversion / (72 - 67 + 1);
      expect(protectAt67.grossConversion).toBeGreaterThan(amortStyleCap * 2);
    }
  });

  it("same premium, protect on vs off — identical grossConversion per year", () => {
    const shared = {
      ...baseInput,
      totalAccountValue: 800_000,
      currentAge: 60,
      retirementAge: 67,
      annualAdjustedGrossIncomePreRetirement: 250_000,
      federalTaxBracketId: "32",
      marriedFilingJointly: true,
      useFixedIndexContract: true,
      contractEstimatedRateOfReturnPct: "4",
      endAge: 72,
    };
    const withProtect = buildRothConversionModel({ ...shared, protectInitialInvestment: true });
    const withoutProtect = buildRothConversionModel({ ...shared, protectInitialInvestment: false });
    for (const row of withProtect.rothConversion) {
      const offRow = withoutProtect.rothConversion.find((r) => r.age === row.age);
      expect(offRow?.grossConversion).toBe(row.grossConversion);
    }
  });

  it("maxGrossConversionRespectingRothFloor returns 0 when no gross keeps Roth above floor", () => {
    const ded = standardDeductionBreakdownIllustration({
      filing: "single",
      calendarYearOffset: 0,
      clientAge: 65,
    });
    const cap = maxGrossConversionRespectingRothFloor({
      rothBalanceAfterGrowth: 100_000,
      maxGross: 500_000,
      otherGrossOrdinaryForBracketCap: 80_000,
      protectedPrincipalFloor: 500_000,
      deduction: { filing: "single", calendarYearOffset: 0, clientAge: 65 },
    });
    expect(cap).toBe(0);
    expect(ded.total).toBeGreaterThan(0);
  });

  it("escalates total retirement need and Social Security COLA in table rows", () => {
    const model = buildRothConversionModel({
      ...baseInput,
      annualSocialSecurityGross: 40_000,
      socialSecurityStartAge: 70,
      endAge: 72,
    });
    const age67 = model.stayTraditional.find((r) => r.age === 67)!;
    const age70 = model.stayTraditional.find((r) => r.age === 70)!;
    const age72 = model.stayTraditional.find((r) => r.age === 72)!;
    expect(age67.retirementNeedAnnual).toBe(80_000);
    expect(age67.socialSecurityAnnualGross).toBe(0);
    expect(age67.portfolioIncomeShortfall).toBe(80_000);
    expect(age70.socialSecurityAnnualGross).toBe(40_000);
    expect(age70.portfolioIncomeShortfall).toBe(Math.max(0, age70.retirementNeedAnnual - 40_000));
    expect(age72.retirementNeedAnnual).toBe(Math.floor(80_000 * Math.pow(1.03, 5)));
    expect(age72.socialSecurityAnnualGross).toBe(Math.floor(40_000 * Math.pow(1.028, 2)));
    expect(age72.reportIncomeAnnual).toBe(age72.retirementNeedAnnual);
  });

  it("anchors retirement need at current age when already past retirement age", () => {
    const model = buildRothConversionModel({
      ...baseInput,
      currentAge: 72,
      retirementAge: 67,
      retirementSpendableIncomeAnnual: 150_000,
      annualSocialSecurityGross: 0,
      endAge: 73,
    });
    const age72 = model.stayTraditional.find((r) => r.age === 72)!;
    const age73 = model.stayTraditional.find((r) => r.age === 73)!;
    expect(age72.retirementNeedAnnual).toBe(150_000);
    expect(age73.retirementNeedAnnual).toBe(Math.floor(150_000 * Math.pow(1.03, 1)));
  });

  it("does not double-count Social Security in Roth conversion bracket stack when retired", () => {
    const model = buildRothConversionModel({
      ...baseInput,
      annualSocialSecurityGross: 30_000,
      socialSecurityStartAge: 67,
      annualAdjustedGrossIncomePreRetirement: 0,
      endAge: 67,
    });
    const row = model.rothConversion.find((r) => r.age === 67 && !r.rothOnlyPhase);
    expect(row).toBeDefined();
    if (!row) return;
    expect(row.retirementIncomeAnnual).toBe(80_000);
    expect(row.portfolioIncomeWithdrawal).toBe(50_000);
  });

  it("external conversion tax pay: net Roth equals gross conversion", () => {
    const shared = {
      ...baseInput,
      totalAccountValue: 400_000,
      currentAge: 65,
      endAge: 65,
      marriedFilingJointly: false,
      annualAdjustedGrossIncomePreRetirement: 80_000,
      stateOfResidence: "PA",
    };
    const fromAccount = buildRothConversionModel({
      ...shared,
      payConversionTaxFrom: "conversion_account",
    });
    const external = buildRothConversionModel({
      ...shared,
      payConversionTaxFrom: "external",
    });
    const rowAcct = fromAccount.rothConversion[0]!;
    const rowExt = external.rothConversion[0]!;
    expect(rowExt.grossConversion).toBe(rowAcct.grossConversion);
    expect(rowExt.netConversionToRoth).toBe(rowExt.grossConversion);
    expect(rowExt.netConversionToRoth).toBeGreaterThan(rowAcct.netConversionToRoth);
  });

  it("total deductions override increases bracket headroom and lowers federal tax", () => {
    const baseline = buildRothConversionModel({
      ...baseInput,
      currentAge: 65,
      endAge: 65,
      marriedFilingJointly: false,
      annualAdjustedGrossIncomePreRetirement: 120_000,
    });
    const withOverride = buildRothConversionModel({
      ...baseInput,
      currentAge: 65,
      endAge: 65,
      marriedFilingJointly: false,
      annualAdjustedGrossIncomePreRetirement: 120_000,
      totalDeductionsAnnual: "50000",
    });
    expect(withOverride.rothConversion[0]!.capFromBracketConversion).toBeGreaterThan(
      baseline.rothConversion[0]!.capFromBracketConversion
    );
    expect(withOverride.stayTraditional[0]!.illustrativeFederalTax).toBeLessThan(
      baseline.stayTraditional[0]!.illustrativeFederalTax
    );
  });

  it("RMD start age 75 for birth year 1960+: no RMD before age 75", () => {
    const model = buildRothConversionModel({
      ...baseInput,
      currentAge: 66,
      endAge: 76,
      clientDob: "1960-06-01",
      rmdStartAge: 75,
    });
    const at74 = model.stayTraditional.find((r) => r.age === 74)!;
    const at75 = model.stayTraditional.find((r) => r.age === 75)!;
    expect(at74.rmd).toBe(0);
    expect(at75.rmd).toBeGreaterThan(0);
  });

  it("Joint RMD table when MFJ spouse is more than 10 years younger", () => {
    const uniform = buildRothConversionModel({
      totalAccountValue: 1_000_000,
      currentAge: 73,
      endAge: 73,
      retirementAge: 80,
      retirementSpendableIncomeAnnual: 60_000,
      federalTaxBracketId: "22",
      marriedFilingJointly: true,
      spouseStartAge: 63,
      retirementIncomeFromConversionAccount: false,
    });
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
    expect(joint.stayTraditional[0]!.rmd).toBeLessThan(uniform.stayTraditional[0]!.rmd);
    expect(joint.stayTraditional[0]!.rmd).toBeCloseTo(1_000_000 / 28.9, 0);
  });

  it("IRMAA uses 2-year lookback: pre-Medicare conversion does not surcharge until lookback catches up", () => {
    const model = buildRothConversionModel({
      ...baseInput,
      currentAge: 63,
      retirementAge: 63,
      annualAdjustedGrossIncomePreRetirement: 80_000,
      endAge: 68,
      marriedFilingJointly: false,
    });
    const age63 = model.rothConversion.find((r) => r.age === 63);
    const age64 = model.rothConversion.find((r) => r.age === 64);
    const age65 = model.rothConversion.find((r) => r.age === 65);
    const age67 = model.rothConversion.find((r) => r.age === 67);

    expect(age63?.irmaaSurchargeAnnual).toBe(0);
    expect(age64?.irmaaSurchargeAnnual).toBe(0);
    expect(age65?.grossConversion ?? 0).toBeGreaterThan(0);
    expect(age67).toBeDefined();
    if (!age65 || !age67) return;

    const sameYearIrmaaAt67 = age67.irmaaSurchargeAnnual;
    expect(sameYearIrmaaAt67).toBeGreaterThanOrEqual(0);
    expect(model.assumptions.some((a) => a.includes("2-year MAGI lookback"))).toBe(true);
  });
});
