import { describe, expect, it } from "vitest";
import {
  escalatedAnnualAmount,
  portfolioIncomeShortfallForAge,
  retirementNeedForAge,
  RETIREMENT_NEED_INFLATION_ANNUAL,
  SOCIAL_SECURITY_COLA_ANNUAL,
} from "@/lib/retirement-income-escalation";

describe("escalatedAnnualAmount", () => {
  it("returns base in year 0", () => {
    expect(escalatedAnnualAmount(100_000, 0.03, 0)).toBe(100_000);
  });

  it("compounds and floors to whole dollars", () => {
    expect(escalatedAnnualAmount(100_000, 0.03, 5)).toBe(Math.floor(100_000 * Math.pow(1.03, 5)));
    expect(escalatedAnnualAmount(40_000, 0.028, 3)).toBe(Math.floor(40_000 * Math.pow(1.028, 3)));
  });

  it("returns 0 for non-positive base", () => {
    expect(escalatedAnnualAmount(0, 0.03, 5)).toBe(0);
  });
});

describe("portfolioIncomeShortfallForAge", () => {
  it("uses full inflated need before SS starts", () => {
    const y2 = portfolioIncomeShortfallForAge({
      age: 69,
      retireAge: 67,
      ssStartAge: 70,
      baseNeed: 120_000,
      baseSS: 40_000,
      fundNeedFromIra: true,
    });
    expect(y2.retirementNeedAnnual).toBe(
      escalatedAnnualAmount(120_000, RETIREMENT_NEED_INFLATION_ANNUAL, 2)
    );
    expect(y2.socialSecurityAnnualGross).toBe(0);
    expect(y2.portfolioIncomeShortfall).toBe(y2.retirementNeedAnnual);
  });

  it("subtracts inflated SS once benefits begin", () => {
    const y3 = portfolioIncomeShortfallForAge({
      age: 70,
      retireAge: 67,
      ssStartAge: 70,
      baseNeed: 120_000,
      baseSS: 40_000,
      fundNeedFromIra: true,
    });
    expect(y3.socialSecurityAnnualGross).toBe(40_000);
    expect(y3.portfolioIncomeShortfall).toBe(Math.max(0, y3.retirementNeedAnnual - 40_000));
  });

  it("returns zero shortfall when not funding from IRA", () => {
    const out = portfolioIncomeShortfallForAge({
      age: 70,
      retireAge: 67,
      ssStartAge: 67,
      baseNeed: 120_000,
      baseSS: 40_000,
      fundNeedFromIra: false,
    });
    expect(out.portfolioIncomeShortfall).toBe(0);
  });

  it("anchors need inflation at illustration start when already retired", () => {
    const atStart = portfolioIncomeShortfallForAge({
      age: 72,
      retireAge: 67,
      ssStartAge: 72,
      baseNeed: 150_000,
      baseSS: 70_000,
      fundNeedFromIra: true,
      illustrationStartAge: 72,
    });
    expect(atStart.retirementNeedAnnual).toBe(150_000);
    expect(atStart.socialSecurityAnnualGross).toBe(70_000);
    expect(atStart.portfolioIncomeShortfall).toBe(80_000);

    const nextYear = portfolioIncomeShortfallForAge({
      age: 73,
      retireAge: 67,
      ssStartAge: 72,
      baseNeed: 150_000,
      baseSS: 70_000,
      fundNeedFromIra: true,
      illustrationStartAge: 72,
    });
    expect(nextYear.retirementNeedAnnual).toBe(
      escalatedAnnualAmount(150_000, RETIREMENT_NEED_INFLATION_ANNUAL, 1)
    );
    expect(nextYear.socialSecurityAnnualGross).toBe(
      escalatedAnnualAmount(70_000, SOCIAL_SECURITY_COLA_ANNUAL, 1)
    );
  });

  it("returns zero need before illustration start when already retired", () => {
    expect(
      retirementNeedForAge({
        age: 68,
        retireAge: 67,
        baseNeed: 150_000,
        needInflationAnchorAge: 72,
      })
    ).toBe(0);
  });
});
