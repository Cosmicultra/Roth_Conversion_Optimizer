import { describe, expect, it } from "vitest";
import type { RothClient } from "@/lib/roth-client";
import { buildRothConversionModelForAdvisorUi } from "./roth-conversion-ui-model";
import { emptyRothWorksheet } from "./roth-worksheet";

const clientFixture = (): RothClient => ({
  firstName: "",
  lastName: "",
  dob: "",
  age: "65",
  federalTaxBracket: "22",
  adjustedGrossIncomeAnnual: "",
  retirementAge: "67",
  spouseRetirementAge: "67",
  retirementSpendableIncomeAnnual: "80000",
  socialSecurityMonthlyClient: "",
  socialSecurityMonthlySpouse: "",
  married: false,
  spouseFirstName: "",
  spouseLastName: "",
  spouseDob: "",
  spouseAge: "",
  takingSocialSecurity: false,
});

describe("buildRothConversionModelForAdvisorUi", () => {
  it("mirrors PDF route inputs: age, need, and qualified balance", () => {
    const client = clientFixture();

    const ws = {
      ...emptyRothWorksheet(),
      useEntireQualifiedBalance: true,
      qualifiedAssetValue: "500000",
      useFixedIndexContract: false as const,
      retirementIncomeFromConversionAccount: true as const,
      fic: { ...emptyRothWorksheet().fic, maxTaxRatePct: "22" },
    };

    const out = buildRothConversionModelForAdvisorUi(client, ws, 500_000, 500_000);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.model.startingBalance).toBe(500_000);
    expect(out.model.conversionPremium).toBe(500_000);
    expect(out.model.stayTraditional[0]?.age).toBe(65);
    expect(out.model.rothConversionTotals.totalGrossConversion).toBeGreaterThan(0);
  });

  it("rejects when retirement income is blank", () => {
    const client = clientFixture();
    client.retirementSpendableIncomeAnnual = "";
    const out = buildRothConversionModelForAdvisorUi(client, emptyRothWorksheet(), 500_000);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error).toMatch(/total retirement income need/i);
  });

  it("stay-traditional uses full qualified pool while Roth path uses conversion premium only", () => {
    const client = clientFixture();
    const ws = {
      ...emptyRothWorksheet(),
      useEntireQualifiedBalance: false,
      specificConversionAmount: "250000",
      useFixedIndexContract: false as const,
      retirementIncomeFromConversionAccount: true as const,
      fic: { ...emptyRothWorksheet().fic, maxTaxRatePct: "22" },
    };

    const out = buildRothConversionModelForAdvisorUi(client, ws, 250_000, 500_000);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.model.conversionPremium).toBe(250_000);
    expect(out.model.stayTraditional[0]?.yearStartBalance).toBe(500_000);
  });
});
