import { ROTH_ASSUMPTION_VERSION } from "@/lib/roth-conversion-analysis";
import {
  RETIREMENT_NEED_INFLATION_ANNUAL,
  SOCIAL_SECURITY_COLA_ANNUAL,
} from "@/lib/retirement-income-escalation";
import type { RothConversionModelResult } from "@/lib/roth-conversion-analysis";
import { PDF_REPORT_THEME, ROTH_REPORT_SCOPE_DISCLOSURE, cleanText, money, wrapPlainText } from "@/lib/roth-report-pdf/theme";
import { MARGIN_X, type PdfReportLayout } from "@/lib/roth-report-pdf/layout";

const DISCLAIMER_TEXT =
  "Hypothetical illustration only: not tax, legal, investment, or Medicare advice. Actual outcomes depend on statutes, filings, withholding, Roth basis rules, beneficiary designations, enrollment timing for Medicare-related surcharges, and market results. Confirm all material facts with counsel and an independent CPA prior to recommending or executing transactions.";

export function drawDisclosures(
  layout: PdfReportLayout,
  model: RothConversionModelResult,
  need: number
) {
  layout.checkNewPage(120);
  layout.sectionGap();
  layout.page.drawText(cleanText("Disclosures"), {
    x: MARGIN_X,
    y: layout.y,
    size: 22,
    font: layout.bold,
    color: PDF_REPORT_THEME.ink,
  });
  layout.y -= 28;
  layout.page.drawLine({
    start: { x: MARGIN_X - 4, y: layout.y + 8 },
    end: { x: layout.pageWidth - MARGIN_X, y: layout.y + 8 },
    thickness: 0.6,
    color: PDF_REPORT_THEME.rule,
  });
  layout.y -= 14;

  layout.drawPara(ROTH_REPORT_SCOPE_DISCLOSURE, 8, PDF_REPORT_THEME.muted);

  layout.drawSectionHeading("Roth path qualifiers (tables)");
  layout.drawPara(model.rothGrowthAssumptionLabel, 8, PDF_REPORT_THEME.muted);

  layout.drawSectionHeading("Assumptions and inputs");
  for (const a of model.assumptions) {
    layout.drawPara(a, 8);
  }
  layout.drawPara(
    `Assumption version: ${ROTH_ASSUMPTION_VERSION}. Federal marginal band used as conversion ceiling (illustration): ${model.federalBracketId}%  |  Ordinary tax: pre-retirement inclusive AGI; after retirement taxable Social Security plus IRA distributions (not gross retirement need). Federal brackets (2025) and deduction ${money(model.standardDeductionAnnual)} (overridden when total deductions are entered on intake). State tax when selected uses 2025 state brackets; blank state = no state tax. Conversion tax is withheld from conversion proceeds unless external pay is selected (see assumptions). Protect initial investment, when on, requires ending total Roth at or above the conversion premium after the traditional sleeve is depleted. FIC surrender years, when set, bound the conversion deadline together with pre-RMD and horizon rules. IRMAA is illustrative only (no two-year lookback).  Total retirement income need (gross, includes Social Security): ${money(need)}/year at retirement with ${(RETIREMENT_NEED_INFLATION_ANNUAL * 100).toFixed(1)}% annual inflation.  Report table Income column: AGI-only before retirement age; inflated total need at/after retirement age.${
      model.annualAgiPreRetirementIllustration > 0
        ? ` Illustrated AGI from intake: ${money(model.annualAgiPreRetirementIllustration)}/year (inclusive ordinary-income base before retirement for bracket cap, tax, and IRMAA; not stacked with future retirement need or modeled IRA flows).`
        : ""
    }${
      model.annualSocialSecurityGross > 0
        ? ` Gross Social Security at benefit start: about ${money(model.annualSocialSecurityGross)}/year with ${(SOCIAL_SECURITY_COLA_ANNUAL * 100).toFixed(1)}% illustrative COLA; IRA funds the gap while converting when applicable.`
        : ""
    }`,
    8,
    PDF_REPORT_THEME.muted
  );

  layout.drawSectionHeading("Important limitations");
  const discSize = 6.85;
  const discLineH = 9;
  const discLines = wrapPlainText((t) => layout.widthOf(t, discSize), DISCLAIMER_TEXT, discSize, 534);
  for (const line of discLines) {
    layout.checkNewPage(72);
    layout.page.drawText(line, {
      x: MARGIN_X,
      y: layout.y,
      size: discSize,
      font: layout.regular,
      color: PDF_REPORT_THEME.muted,
    });
    layout.y -= discLineH;
  }
}
