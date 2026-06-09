import { describe, expect, it } from "vitest";
import type { RothClient } from "@/lib/roth-client";
import { emptyRothClient } from "@/lib/roth-client";
import { assessRothConversionFeasibility, bracketExhaustedMessage } from "./roth-conversion-feasibility";
import { emptyRothWorksheet } from "./roth-worksheet";

const clientFixture = (): RothClient => ({
  ...emptyRothClient(),
  age: "65",
  federalTaxBracket: "22",
  adjustedGrossIncomeAnnual: "75000",
  retirementAge: "67",
  spouseRetirementAge: "67",
  retirementSpendableIncomeAnnual: "80000",
});

const worksheetFixture = () => ({
  ...emptyRothWorksheet(),
  useEntireQualifiedBalance: true,
  qualifiedAssetValue: "500000",
  useFixedIndexContract: false as const,
  retirementIncomeFromConversionAccount: true as const,
  fic: { ...emptyRothWorksheet().fic, maxTaxRatePct: "22" },
});

describe("assessRothConversionFeasibility", () => {
  it("returns ok when conversions are possible", () => {
    const result = assessRothConversionFeasibility(clientFixture(), worksheetFixture(), 500_000, 500_000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.model.rothConversionTotals.totalGrossConversion).toBeGreaterThan(0);
  });

  it("returns bracket_exhausted when retirement income fills the max tax bracket", () => {
    const client = clientFixture();
    client.age = "70";
    client.adjustedGrossIncomeAnnual = "50000";
    client.retirementAge = "65";
    client.retirementSpendableIncomeAnnual = "300000";
    const result = assessRothConversionFeasibility(client, worksheetFixture(), 500_000, 500_000);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("bracket_exhausted");
    expect(result.message).toBe(bracketExhaustedMessage("22"));
  });

  it("detects bracket exhaustion for clients under 60 when minClientAge is lowered", () => {
    const client = clientFixture();
    client.age = "55";
    client.retirementAge = "55";
    client.retirementSpendableIncomeAnnual = "300000";
    const result = assessRothConversionFeasibility(client, worksheetFixture(), 500_000, 500_000, {
      minClientAge: 18,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("bracket_exhausted");
  });

  it("returns build_failed when model inputs are invalid", () => {
    const client = clientFixture();
    client.retirementSpendableIncomeAnnual = "";
    const result = assessRothConversionFeasibility(client, worksheetFixture(), 500_000, 500_000);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("build_failed");
  });
});

describe("bracketExhaustedMessage", () => {
  it("includes the selected bracket in the message", () => {
    expect(bracketExhaustedMessage("24")).toContain("24%");
    expect(bracketExhaustedMessage("24")).toMatch(/higher maximum tax bracket/i);
  });
});
