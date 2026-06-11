import { ROTH_ASSUMPTION_VERSION } from "@/lib/roth-conversion-analysis";
import {
  RETIREMENT_NEED_INFLATION_ANNUAL,
  SOCIAL_SECURITY_COLA_ANNUAL,
} from "@/lib/retirement-income-escalation";
import type { RothConversionModelResult } from "@/lib/roth-conversion-analysis";
import { buildMonteCarloReportDisclosureParagraphs, type RothMonteCarloResult } from "@/lib/roth-monte-carlo";
import {
  DISCLOSURE_FONT,
  PDF_REPORT_THEME,
  ROTH_REPORT_SCOPE_DISCLOSURE,
  cleanText,
  money,
  wrapPlainText,
} from "@/lib/roth-report-pdf/theme";
import { MARGIN_X, type PdfReportLayout } from "@/lib/roth-report-pdf/layout";

const DISCLAIMER_TEXT =
  "Hypothetical illustration only: not tax, legal, investment, or Medicare advice. Actual outcomes depend on statutes, filings, withholding, Roth basis rules, beneficiary designations, enrollment timing for Medicare-related surcharges, and market results. Confirm all material facts with counsel and an independent CPA prior to recommending or executing transactions.";

function drawDisclosurePara(layout: PdfReportLayout, text: string, color = PDF_REPORT_THEME.muted) {
  const size = DISCLOSURE_FONT.body;
  const lines = wrapPlainText((t) => layout.widthOf(t, size), text, size, layout.contentWidth);
  for (const line of lines) {
    if (layout.y < layout.contentBottom() + DISCLOSURE_FONT.lineGap + 4) {
      layout.newPage(true);
      layout.y = layout.contentTop(true) - 6;
    }
    layout.page.drawText(line, {
      x: MARGIN_X,
      y: layout.y,
      size,
      font: layout.regular,
      color,
    });
    layout.y -= DISCLOSURE_FONT.lineGap;
  }
  layout.y -= 2;
}

function drawDisclosureHeading(layout: PdfReportLayout, label: string) {
  if (layout.y < layout.contentBottom() + 40) {
    layout.newPage(true);
    layout.y = layout.contentTop(true) - 6;
  }
  layout.drawSectionHeading(label, DISCLOSURE_FONT.section);
}

export function drawDisclosures(
  layout: PdfReportLayout,
  model: RothConversionModelResult,
  need: number,
  monteCarlo?: RothMonteCarloResult | null
) {
  layout.beginDisclosuresPage();

  layout.page.drawText(cleanText("Disclosures"), {
    x: MARGIN_X,
    y: layout.y,
    size: DISCLOSURE_FONT.title,
    font: layout.bold,
    color: PDF_REPORT_THEME.ink,
  });
  layout.y -= DISCLOSURE_FONT.title + 6;
  layout.page.drawLine({
    start: { x: MARGIN_X, y: layout.y + 6 },
    end: { x: layout.pageWidth - MARGIN_X, y: layout.y + 6 },
    thickness: 0.6,
    color: PDF_REPORT_THEME.rule,
  });
  layout.y -= 12;

  drawDisclosurePara(layout, ROTH_REPORT_SCOPE_DISCLOSURE);

  drawDisclosureHeading(layout, "Roth path qualifiers (tables)");
  drawDisclosurePara(layout, model.rothGrowthAssumptionLabel);

  drawDisclosureHeading(layout, "Assumptions and inputs");
  for (const a of model.assumptions) {
    drawDisclosurePara(layout, a, PDF_REPORT_THEME.ink);
  }
  drawDisclosurePara(
    layout,
    `Assumption version: ${ROTH_ASSUMPTION_VERSION}. Federal marginal band used as conversion ceiling (illustration): ${model.federalBracketId}%  |  Ordinary tax: pre-retirement inclusive AGI; after retirement taxable Social Security plus IRA distributions (not gross retirement need). Federal brackets (2025) and deduction ${money(model.standardDeductionAnnual)} (overridden when total deductions are entered on intake). State tax when selected uses 2025 state brackets; blank state = no state tax. Conversion tax is withheld from conversion proceeds unless external pay is selected (see assumptions). Protect initial investment, when on, requires ending total Roth at or above the conversion premium after the traditional sleeve is depleted. FIC surrender years, when set, bound the conversion deadline together with pre-RMD and horizon rules. IRMAA is illustrative only (2-year MAGI lookback; ages 65–66 use AGI proxy when provided).  ${
      model.variableRetirementIncomeSchedule.length > 0
        ? `Variable retirement income ages ${model.variableRetirementIncomeSchedule[0]!.age}–${model.variableRetirementIncomeSchedule[model.variableRetirementIncomeSchedule.length - 1]!.age} (entered amounts); ${(RETIREMENT_NEED_INFLATION_ANNUAL * 100).toFixed(1)}% annual inflation from the last variable year amount thereafter.`
        : `Total retirement income need (gross, includes Social Security): ${money(need)}/year at retirement with ${(RETIREMENT_NEED_INFLATION_ANNUAL * 100).toFixed(1)}% annual inflation.`
    }  Report table Income column: AGI-only before retirement age; inflated total need at/after retirement age.${
      model.annualAgiPreRetirementIllustration > 0
        ? ` Illustrated AGI from intake: ${money(model.annualAgiPreRetirementIllustration)}/year (inclusive ordinary-income base before retirement for bracket cap, tax, and IRMAA; not stacked with future retirement need or modeled IRA flows).`
        : ""
    }${
      model.annualSocialSecurityGross > 0
        ? ` Gross Social Security at benefit start: about ${money(model.annualSocialSecurityGross)}/year with ${(SOCIAL_SECURITY_COLA_ANNUAL * 100).toFixed(1)}% illustrative COLA; IRA funds the gap while converting when applicable.`
        : ""
    }`
  );

  if (monteCarlo) {
    drawDisclosureHeading(layout, "Monte Carlo comparison (supplemental)");
    for (const paragraph of buildMonteCarloReportDisclosureParagraphs(monteCarlo)) {
      drawDisclosurePara(layout, paragraph, PDF_REPORT_THEME.ink);
    }
  }

  drawDisclosureHeading(layout, "Important limitations");
  drawDisclosurePara(layout, DISCLAIMER_TEXT);
}
