import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import type { RothClient } from "@/lib/roth-client";
import { emptyRothWorksheet } from "@/lib/roth-worksheet";
import { PORTRAIT_H, PORTRAIT_W } from "@/lib/roth-report-pdf/layout";
import { buildRothReportModelBundle, buildRothReportPdfBytes } from "@/lib/roth-report-pdf";

function validReportBody() {
  const client: RothClient = {
    firstName: "Jane",
    lastName: "Advisor",
    dob: "",
    age: "65",
    federalTaxBracket: "22",
    adjustedGrossIncomeAnnual: "120000",
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
  };

  const rothWorksheet = {
    ...emptyRothWorksheet(),
    useEntireQualifiedBalance: true,
    qualifiedAssetValue: "500000",
    useFixedIndexContract: false as const,
    retirementIncomeFromConversionAccount: true as const,
    fic: { ...emptyRothWorksheet().fic, maxTaxRatePct: "22" },
  };

  return {
    client,
    totalValue: 500_000,
    fullQualifiedPool: 500_000,
    traditionalQualifiedTotal: 500_000,
    portfolioStatementTotal: 0,
    rothWorksheet,
    socialSecurity: {},
  };
}

describe("buildRothReportPdfBytes", () => {
  it("returns a valid PDF with multiple pages", async () => {
    const bytes = await buildRothReportPdfBytes(validReportBody());
    expect(bytes.length).toBeGreaterThan(1000);
    const header = String.fromCharCode(...bytes.slice(0, 4));
    expect(header).toBe("%PDF");

    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(4);
    for (const page of doc.getPages()) {
      const { width, height } = page.getSize();
      expect(width).toBe(PORTRAIT_W);
      expect(height).toBe(PORTRAIT_H);
    }
  });
});

describe("buildRothReportModelBundle", () => {
  it("rejects clients under age 60", () => {
    const body = validReportBody();
    body.client.age = "58";
    expect(() => buildRothReportModelBundle(body)).toThrow(/age 60/i);
  });

  it("requires conversion account income answer", () => {
    const body = validReportBody();
    body.rothWorksheet = {
      ...emptyRothWorksheet(),
      retirementIncomeFromConversionAccount: null,
    };
    expect(() => buildRothReportModelBundle(body)).toThrow(/conversion account/i);
  });
});
