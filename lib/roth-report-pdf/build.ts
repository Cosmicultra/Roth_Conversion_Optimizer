import { PDFDocument, StandardFonts } from "pdf-lib";
import { clientDisplayName } from "@/lib/roth-client";
import { embedAwaReportLogo } from "@/lib/roth-report-pdf/load-logo";
import { buildRothComparisonVisualData } from "@/lib/roth-comparison-visuals";
import { buildRothReportModelBundle } from "@/lib/roth-report-pdf/model-bundle";
import { PdfReportLayout } from "@/lib/roth-report-pdf/layout";
import { drawExecutiveSummary } from "@/lib/roth-report-pdf/draw-summary";
import { drawWealthAllocation } from "@/lib/roth-report-pdf/draw-allocation";
import { drawBracketStrategy } from "@/lib/roth-report-pdf/draw-bracket";
import { drawPaginatedTable } from "@/lib/roth-report-pdf/draw-tables";
import { drawDisclosures } from "@/lib/roth-report-pdf/draw-disclosures";
import { money } from "@/lib/roth-report-pdf/theme";

/**
 * Builds the AWA Roth Conversion Analysis PDF bytes (graphics, tables, disclosures).
 * @throws Error with advisor-facing message when inputs are invalid.
 */
export async function buildRothReportPdfBytes(body: unknown): Promise<Uint8Array> {
  const { client, model, need, age, totalValue } = buildRothReportModelBundle(body);

  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const logoImage = await embedAwaReportLogo(pdfDoc);

  const clientName = clientDisplayName(client as { firstName?: string; lastName?: string; name?: string }) || "Client";
  const reportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const layout = new PdfReportLayout({
    pdfDoc,
    regular,
    bold,
    logoImage,
    clientLabel: `${clientName}  |  Age ${age}`,
    footerLabel: clientName,
  });

  layout.initFirstPage(
    "Roth Conversion Analysis",
    `${clientName}  |  Age ${age}`,
    `Qualified balance (illustrative): ${money(totalValue)}`,
    `Report date: ${reportDate}`
  );

  const visualData = buildRothComparisonVisualData(model);
  drawExecutiveSummary(layout, visualData, clientName);

  drawWealthAllocation(layout, visualData);
  drawBracketStrategy(layout, visualData, model.federalBracketId);

  const stayEndBal =
    model.stayTraditional.length > 0
      ? model.stayTraditional[model.stayTraditional.length - 1]!.endBalance
      : 0;

  const stayHeaders = ["Yr", "Age", "Start Bal", "Income", "Tax", "End Bal", "RMD", "IRMAA"];
  const stayW = [26, 26, 70, 66, 58, 66, 56, 52];
  const stayIncomeColumnSum = model.stayTraditional.reduce((sum, row) => sum + row.reportIncomeAnnual, 0);
  const stayBody = model.stayTraditional.map((r) => [
    String(r.calendarYearOffset),
    String(r.age),
    money(r.yearStartBalance),
    money(r.reportIncomeAnnual),
    money(r.illustrativeFederalTax + r.illustrativeStateTax),
    money(r.endBalance),
    money(r.rmd),
    money(r.irmaaSurchargeAnnual),
  ]);
  const stayFooter: string[] = [
    "Total",
    "",
    "",
    money(stayIncomeColumnSum),
    money(model.stayTraditionalTotals.totalTaxAttributableToRmds),
    money(stayEndBal),
    money(model.stayTraditionalTotals.totalRmdWithdrawals),
    money(model.stayTraditionalTotals.totalIrmaaPaid),
  ];
  drawPaginatedTable(
    layout,
    "Current allocation  |  10% growth, RMDs from age 73",
    stayHeaders,
    [...stayBody, stayFooter],
    stayW
  );

  const rothHeaders = ["Yr", "Age", "Trad Bal", "Income", "Gross", "Tax", "Net", "Roth Bal", "RMD", "IRMAA"];
  const rothW = [22, 24, 54, 50, 50, 46, 46, 54, 44, 44];
  const rothIncomeColumnSum = model.rothConversion.reduce((sum, row) => sum + row.reportIncomeAnnual, 0);
  const rothBody = model.rothConversion.map((r) => [
    String(r.sequence),
    String(r.age),
    r.rothOnlyPhase ? money(0) : money(r.yearStartTraditional),
    money(r.reportIncomeAnnual),
    r.rothOnlyPhase ? money(0) : money(r.grossConversion),
    r.rothOnlyPhase ? money(0) : money(r.illustrativeTaxOnConversion),
    r.rothOnlyPhase ? money(0) : money(r.netConversionToRoth),
    money(r.totalRothBalance),
    r.rothOnlyPhase ? money(0) : money(r.rmdTraditional),
    r.rothOnlyPhase ? money(0) : money(r.irmaaSurchargeAnnual),
  ]);
  const rothFooter: string[] = [
    "Total",
    "",
    "",
    money(rothIncomeColumnSum),
    money(model.rothConversionTotals.totalGrossConversion),
    money(model.rothConversionTotals.totalConversionTaxPaid),
    money(model.rothConversionTotals.totalNetConversionToRoth),
    money(model.rothConversionTotals.endingTotalRothBalance),
    money(model.rothConversionTotals.totalRmdTraditional),
    money(model.rothConversionTotals.totalIrmaaPaid),
  ];
  drawPaginatedTable(layout, "Roth conversion path", rothHeaders, [...rothBody, rothFooter], rothW);

  drawDisclosures(layout, model, need);

  return pdfDoc.save();
}
