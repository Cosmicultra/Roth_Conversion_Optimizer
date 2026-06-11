import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import type { RothClient } from "@/lib/roth-client";
import { emptyRothWorksheet } from "@/lib/roth-worksheet";
import { PORTRAIT_H, PORTRAIT_W } from "@/lib/roth-report-pdf/layout";
import { AWA_BRAND_NAME } from "@/lib/roth-report-pdf/theme";
import {
  buildMonteCarloReportDisclosureParagraphs,
  MONTE_CARLO_DISCLAIMER,
} from "@/lib/roth-monte-carlo";
import { buildRothReportModelBundle, buildRothReportPdfBytes } from "@/lib/roth-report-pdf";
import { embedAwaReportLogo } from "@/lib/roth-report-pdf/load-logo";

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

  it("uses AWA branding constants for report chrome", () => {
    expect(AWA_BRAND_NAME).toBe("Assured Wealth Advisors");
  });

  it("embeds the AWA logo for report headers", async () => {
    const doc = await PDFDocument.create();
    const logo = await embedAwaReportLogo(doc);
    expect(logo).not.toBeNull();
    expect(logo!.width).toBeGreaterThan(100);
    expect(logo!.height).toBeGreaterThan(100);
  });

  it("generates a larger PDF without the removed pathway figure section", async () => {
    const bytes = await buildRothReportPdfBytes(validReportBody());
    expect(bytes.length).toBeGreaterThan(5000);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeLessThanOrEqual(6);
  });

  it("includes Monte Carlo section and disclosures when monteCarlo payload is present", async () => {
    const monteCarlo = {
      rothWinPct: 72,
      stayWinPct: 26,
      tiePct: 2,
      rothEndingMedian: 1_200_000,
      stayEndingMedian: 900_000,
      medianWealthDelta: 300_000,
      rothEndingP10: 800_000,
      rothEndingP50: 1_200_000,
      rothEndingP90: 1_600_000,
      stayEndingP10: 500_000,
      stayEndingP50: 900_000,
      stayEndingP90: 1_100_000,
      stayNegativeReturnYearsMedian: 4,
      ficZeroCreditYearsMedian: 3,
      simulationCount: 1000,
      config: { simulationCount: 1000, indexMeanAnnual: 0.1, indexVolAnnual: 0.16 },
      disclaimer: MONTE_CARLO_DISCLAIMER,
    };
    const body = { ...validReportBody(), monteCarlo };
    const disclosures = buildMonteCarloReportDisclosureParagraphs(monteCarlo);
    expect(disclosures.some((p) => /Monte Carlo comparison is supplemental only/i.test(p))).toBe(true);

    const baselineBytes = await buildRothReportPdfBytes(validReportBody());
    const bytes = await buildRothReportPdfBytes(body);
    expect(bytes.length).toBeGreaterThan(baselineBytes.length);
    expect(bytes.length).toBeGreaterThan(5000);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(4);
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

  it("parses optional monteCarlo from payload", () => {
    const bundle = buildRothReportModelBundle(validReportBody());
    expect(bundle.monteCarlo).toBeNull();
    const withMc = buildRothReportModelBundle({
      ...validReportBody(),
      monteCarlo: { rothWinPct: 60, stayWinPct: 40, simulationCount: 500 },
    });
    expect(withMc.monteCarlo?.rothWinPct).toBe(60);
    expect(withMc.monteCarlo?.simulationCount).toBe(500);
  });
});
