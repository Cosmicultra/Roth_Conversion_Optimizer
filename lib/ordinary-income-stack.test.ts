import { describe, expect, it } from "vitest";
import { buildOrdinaryIncomeStack } from "@/lib/ordinary-income-stack";

describe("ordinary-income-stack", () => {
  it("pre-retirement uses inclusive AGI only", () => {
    const stack = buildOrdinaryIncomeStack({
      retired: false,
      agiAnnual: 420_000,
      grossSocialSecurityBenefits: 0,
      iraOrdinaryDistributions: 50_000,
      filing: "married",
    });
    expect(stack.otherGrossOrdinaryBeforeConversion).toBe(420_000);
  });

  it("retired uses taxable SS plus IRA distributions not gross need", () => {
    const stack = buildOrdinaryIncomeStack({
      retired: true,
      agiAnnual: 0,
      grossSocialSecurityBenefits: 55_000,
      iraOrdinaryDistributions: 200_000,
      filing: "married",
    });
    expect(stack.otherGrossOrdinaryBeforeConversion).toBeLessThan(400_000);
    expect(stack.otherGrossOrdinaryBeforeConversion).toBeGreaterThan(200_000);
    expect(stack.iraOrdinaryDistributions).toBe(200_000);
  });
});
