import type { RothComparisonVisualData } from "@/lib/roth-comparison-visuals";
import {
  buildImpactDrivers,
  type ImpactDriverTone,
} from "@/lib/roth-impact-drivers";
import { buildWealthComparisonScale } from "@/lib/roth-wealth-comparison-scale";
import {
  formatRothDeltaCompact,
  formatRothMoneyCompact,
  formatRothPct,
} from "@/lib/roth-visual-theme";
import { PDF_REPORT_THEME, REPORT_DISCLAIMER_SHORT, cleanText, wrapPlainText } from "@/lib/roth-report-pdf/theme";
import { MARGIN_X, type PdfReportLayout } from "@/lib/roth-report-pdf/layout";
import type { RGB } from "pdf-lib";

function toneColor(tone: ImpactDriverTone): RGB {
  if (tone === "positive") return PDF_REPORT_THEME.brandBlue;
  if (tone === "negative") return PDF_REPORT_THEME.negative;
  return PDF_REPORT_THEME.ink;
}

function deltaColor(tone: ImpactDriverTone): RGB {
  if (tone === "positive") return PDF_REPORT_THEME.brandBlue;
  if (tone === "negative") return PDF_REPORT_THEME.negative;
  return PDF_REPORT_THEME.ink;
}

const DRIVER_TABLE_ROW_H = 16;
const COMBINED_BAR_H = 5;

function drawWealthComparisonHero(layout: PdfReportLayout, data: RothComparisonVisualData) {
  const scale = buildWealthComparisonScale(data);
  const pad = 12;
  const innerW = layout.contentWidth - pad * 2;
  const ribbonH = 48;
  const inlineH = 14;
  const barBlockH = COMBINED_BAR_H + 8;
  const heroH = pad * 2 + ribbonH + 10 + inlineH + barBlockH + 12;

  const heroTop = layout.y;
  layout.drawPanel(MARGIN_X, heroTop, layout.contentWidth, heroH);

  const ribbonTop = heroTop - pad;
  const ribbonX = MARGIN_X + pad;
  layout.drawPanel(ribbonX, ribbonTop, innerW, ribbonH, true);

  const planDeltaLabel = "Plan delta";
  layout.page.drawText(cleanText(planDeltaLabel), {
    x: ribbonX + innerW / 2 - layout.widthOf(planDeltaLabel, 6.5, layout.bold) / 2,
    y: ribbonTop - 12,
    size: 6.5,
    font: layout.bold,
    color: PDF_REPORT_THEME.brandBlue,
  });

  const deltaVal = formatRothDeltaCompact(scale.wealthDelta);
  layout.page.drawText(cleanText(deltaVal), {
    x: ribbonX + innerW / 2 - layout.widthOf(deltaVal, 18, layout.bold) / 2,
    y: ribbonTop - 28,
    size: 18,
    font: layout.bold,
    color: deltaColor(scale.deltaTone),
  });

  const pctVal = formatRothPct(scale.wealthDeltaPct, true);
  layout.page.drawText(cleanText(pctVal), {
    x: ribbonX + innerW / 2 - layout.widthOf(pctVal, 8) / 2,
    y: ribbonTop - 40,
    size: 8,
    font: layout.regular,
    color: deltaColor(scale.deltaTone),
  });

  const stayLabel = formatRothMoneyCompact(scale.stayEndingWealth);
  const rothLabel = formatRothMoneyCompact(scale.rothEndingWealth);
  const inlineLine = `Traditional ${stayLabel}  ->  Roth ${rothLabel}`;
  layout.page.drawText(cleanText(inlineLine), {
    x: ribbonX + innerW / 2 - layout.widthOf(inlineLine, 8) / 2,
    y: ribbonTop - ribbonH - 12,
    size: 8,
    font: layout.regular,
    color: PDF_REPORT_THEME.ink,
  });

  const barY = ribbonTop - ribbonH - inlineH - COMBINED_BAR_H - 4;
  const barX = ribbonX;
  layout.page.drawRectangle({
    x: barX,
    y: barY,
    width: innerW,
    height: COMBINED_BAR_H,
    color: PDF_REPORT_THEME.zebra,
  });

  const stayEnd = Math.min(100, Math.max(0, scale.stayBarWidthPct));
  const rothEnd = Math.min(100, Math.max(0, scale.rothBarWidthPct));
  const gainStart = Math.min(stayEnd, rothEnd);
  const gainEnd = Math.max(stayEnd, rothEnd);
  const gainColor =
    scale.deltaTone === "positive"
      ? PDF_REPORT_THEME.convertZone
      : scale.deltaTone === "negative"
        ? PDF_REPORT_THEME.negative
        : PDF_REPORT_THEME.stay;

  if (stayEnd > 0) {
    layout.page.drawRectangle({
      x: barX,
      y: barY,
      width: (innerW * stayEnd) / 100,
      height: COMBINED_BAR_H,
      color: PDF_REPORT_THEME.stay,
    });
  }
  if (gainEnd > gainStart) {
    layout.page.drawRectangle({
      x: barX + (innerW * gainStart) / 100,
      y: barY,
      width: (innerW * (gainEnd - gainStart)) / 100,
      height: COMBINED_BAR_H,
      color: gainColor,
    });
  }

  layout.page.drawText(cleanText("End-of-plan after-tax wealth · illustrative only"), {
    x: barX,
    y: barY - 10,
    size: 6,
    font: layout.regular,
    color: PDF_REPORT_THEME.muted,
  });

  layout.y = heroTop - heroH - 14;
}

function drawImpactDriversTable(layout: PdfReportLayout, data: RothComparisonVisualData) {
  const drivers = buildImpactDrivers(data);
  const chartPad = 12;
  const headerH = 16;
  const chartH = chartPad * 2 + headerH + drivers.length * DRIVER_TABLE_ROW_H + 8;

  const chartTop = layout.y;
  layout.drawPanel(MARGIN_X, chartTop, layout.contentWidth, chartH);

  layout.page.drawText(cleanText("Sorted by illustrative impact"), {
    x: MARGIN_X + chartPad,
    y: chartTop - chartPad - 2,
    size: 6.5,
    font: layout.regular,
    color: PDF_REPORT_THEME.muted,
  });

  const headerY = chartTop - chartPad - 14;
  layout.page.drawText(cleanText("Driver"), {
    x: MARGIN_X + chartPad,
    y: headerY,
    size: 6.5,
    font: layout.bold,
    color: PDF_REPORT_THEME.muted,
  });
  layout.page.drawText(cleanText("Change"), {
    x: MARGIN_X + layout.contentWidth - chartPad - layout.widthOf("Change", 6.5, layout.bold),
    y: headerY,
    size: 6.5,
    font: layout.bold,
    color: PDF_REPORT_THEME.muted,
  });

  layout.page.drawLine({
    start: { x: MARGIN_X + chartPad, y: headerY - 4 },
    end: { x: MARGIN_X + layout.contentWidth - chartPad, y: headerY - 4 },
    thickness: 0.5,
    color: PDF_REPORT_THEME.rule,
  });

  let rowY = headerY - 12;
  for (let i = 0; i < drivers.length; i++) {
    const driver = drivers[i]!;
    const isTop = i === 0;

    if (isTop) {
      layout.page.drawRectangle({
        x: MARGIN_X + chartPad,
        y: rowY - DRIVER_TABLE_ROW_H + 4,
        width: 2,
        height: DRIVER_TABLE_ROW_H - 2,
        color: PDF_REPORT_THEME.brandBlue,
      });
    }

    layout.page.drawText(cleanText(driver.label), {
      x: MARGIN_X + chartPad + (isTop ? 6 : 0),
      y: rowY,
      size: isTop ? 7.5 : 7,
      font: layout.bold,
      color: isTop ? PDF_REPORT_THEME.ink : PDF_REPORT_THEME.muted,
    });

    layout.drawTextRight(
      MARGIN_X + layout.contentWidth - chartPad,
      rowY,
      driver.valueFormatted,
      isTop ? 9.5 : 8.5,
      layout.bold,
      toneColor(driver.tone),
    );

    rowY -= DRIVER_TABLE_ROW_H;
  }

  layout.y = chartTop - chartH - 10;

  const footnote = `Conversion premium modeled: ${formatRothMoneyCompact(data.conversionAmountTotal)} · ${data.filingLabel}, ${data.maxBracketPct}% ceiling`;
  layout.drawPara(footnote, 6.5, PDF_REPORT_THEME.muted);
}

export function drawExecutiveSummary(
  layout: PdfReportLayout,
  data: RothComparisonVisualData,
  clientName: string
) {
  layout.drawFigureCaption("EXECUTIVE SUMMARY");
  layout.drawTitle(
    clientName ? `After-tax wealth at plan end for ${clientName}` : "After-tax wealth at plan end",
    13
  );
  layout.drawPara(
    `At the end of the modeled horizon, the Roth conversion path leaves ${data.wealthDelta >= 0 ? "more" : "less"} after-tax wealth than staying in traditional IRAs.`,
    7.5,
    PDF_REPORT_THEME.muted
  );

  drawWealthComparisonHero(layout, data);

  layout.checkNewPage(200);
  layout.drawSectionHeading("What drives the gap");
  drawImpactDriversTable(layout, data);

  layout.y -= 6;
  const calloutH = 36;
  const calloutTop = layout.y;
  layout.drawPanel(MARGIN_X, calloutTop, layout.contentWidth, calloutH);
  const disclaimerLines = wrapPlainText(
    (t) => layout.widthOf(t, 6.5),
    REPORT_DISCLAIMER_SHORT,
    6.5,
    layout.contentWidth - 20
  );
  let dy = calloutTop - 14;
  for (const ln of disclaimerLines.slice(0, 2)) {
    layout.page.drawText(cleanText(ln), {
      x: MARGIN_X + 10,
      y: dy,
      size: 6.5,
      font: layout.regular,
      color: PDF_REPORT_THEME.muted,
    });
    dy -= 9;
  }
  layout.y = calloutTop - calloutH - 8;
}
