import { describe, expect, it } from "vitest";
import {
  provisionalIncomeForSocialSecurity,
  taxableSocialSecurityBenefits,
} from "@/lib/social-security-taxation";

describe("social-security-taxation", () => {
  it("returns zero taxable SS when provisional income is below tier 1", () => {
    expect(
      taxableSocialSecurityBenefits({
        filing: "married",
        grossSocialSecurityBenefits: 30_000,
        otherOrdinaryIncome: 10_000,
      })
    ).toBe(0);
  });

  it("taxes a portion of SS for MFJ with high other income", () => {
    const taxable = taxableSocialSecurityBenefits({
      filing: "married",
      grossSocialSecurityBenefits: 55_000,
      otherOrdinaryIncome: 300_000,
    });
    expect(taxable).toBeGreaterThan(0);
    expect(taxable).toBeLessThanOrEqual(0.85 * 55_000);
    expect(provisionalIncomeForSocialSecurity({
      grossSocialSecurityBenefits: 55_000,
      otherOrdinaryIncome: 300_000,
    })).toBe(300_000 + 27_500);
  });

  it("uses single thresholds", () => {
    const low = taxableSocialSecurityBenefits({
      filing: "single",
      grossSocialSecurityBenefits: 20_000,
      otherOrdinaryIncome: 20_000,
    });
    const high = taxableSocialSecurityBenefits({
      filing: "single",
      grossSocialSecurityBenefits: 20_000,
      otherOrdinaryIncome: 80_000,
    });
    expect(high).toBeGreaterThan(low);
  });
});
