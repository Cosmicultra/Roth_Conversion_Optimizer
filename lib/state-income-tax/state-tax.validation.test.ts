import { describe, expect, it } from "vitest";
import { ALL_STATE_CODES, STATE_TAX_PROFILES } from "@/lib/state-income-tax/profiles";
import { allStateCodes, stateIncomeTaxOnTaxable, resolveStateProfile } from "@/lib/state-income-tax/compute";

describe("state-income-tax validation", () => {
  it("includes all 51 jurisdictions", () => {
    expect(allStateCodes().length).toBe(51);
    expect(ALL_STATE_CODES.length).toBe(51);
    for (const code of ALL_STATE_CODES) {
      expect(STATE_TAX_PROFILES[code]).toBeDefined();
      expect(resolveStateProfile(code)?.code).toBe(code);
    }
  });

  it("TX has no state income tax", () => {
    expect(stateIncomeTaxOnTaxable(500_000, resolveStateProfile("TX"), "single")).toBe(0);
  });

  it("CA progressive tax is positive on high income", () => {
    const tax = stateIncomeTaxOnTaxable(300_000, resolveStateProfile("CA"), "married");
    expect(tax).toBeGreaterThan(10_000);
  });

  it("PA flat tax applies", () => {
    const tax = stateIncomeTaxOnTaxable(100_000, resolveStateProfile("PA"), "single");
    expect(tax).toBeCloseTo(100_000 * 0.0307, 0);
  });
});
