import type { RothComparisonVisualData } from "@/lib/roth-comparison-visuals";
import { formatEffectiveRate, formatRothMoneyFull } from "@/lib/roth-visual-theme";
import { PDF_REPORT_THEME, cleanText } from "@/lib/roth-report-pdf/theme";
import { MARGIN_X, type PdfReportLayout } from "@/lib/roth-report-pdf/layout";

export function drawBracketStrategy(
  layout: PdfReportLayout,
  data: RothComparisonVisualData,
  federalBracketId: string
) {
  layout.checkNewPage(200);
  layout.sectionGap();
  layout.drawFigureCaption("FIGURE 2  |  Bracket strategy");
  layout.drawTitle("Conversion ceiling and effective rates", 13);
  layout.drawPara(
    `${data.filingLabel}  |  Stated ceiling: ${federalBracketId}%  |  Gross income cap: ${formatRothMoneyFull(data.grossIncomeCeiling)}`,
    7.5,
    PDF_REPORT_THEME.muted
  );

  const panelTop = layout.y;
  const panelH = 118;
  layout.drawPanel(MARGIN_X, panelTop, layout.contentWidth, panelH);

  const stripX = MARGIN_X + 16;
  const stripW = layout.contentWidth - 32;
  const stripH = 20;
  const stripY = panelTop - 52;
  const stopPct = Math.min(0.98, Math.max(0.02, data.stopLinePosition));
  const convertW = stripW * stopPct;

  layout.page.drawRectangle({
    x: stripX,
    y: stripY,
    width: convertW,
    height: stripH,
    color: PDF_REPORT_THEME.convertZone,
    opacity: 0.9,
  });
  layout.page.drawRectangle({
    x: stripX + convertW,
    y: stripY,
    width: stripW - convertW,
    height: stripH,
    color: PDF_REPORT_THEME.avoidZoneLight,
  });
  layout.page.drawRectangle({
    x: stripX,
    y: stripY,
    width: stripW,
    height: stripH,
    borderColor: PDF_REPORT_THEME.ruleStrong,
    borderWidth: 0.5,
  });

  const ceilingX = stripX + convertW;
  for (let i = 0; i < 5; i++) {
    layout.page.drawLine({
      start: { x: ceilingX, y: stripY + 2 + i * 4 },
      end: { x: ceilingX, y: stripY + 4 + i * 4 },
      thickness: 1,
      color: PDF_REPORT_THEME.ink,
    });
  }

  layout.page.drawText(cleanText("Convert"), {
    x: stripX + 6,
    y: stripY + 6,
    size: 7,
    font: layout.bold,
    color: PDF_REPORT_THEME.ink,
  });
  layout.page.drawText(cleanText("Avoid"), {
    x: stripX + convertW + 6,
    y: stripY + 6,
    size: 7,
    font: layout.bold,
    color: PDF_REPORT_THEME.avoidZone,
  });

  const keyTicks = data.bracketStrip.filter((_, i, arr) => i === 0 || i === arr.length - 1 || arr[i]!.ratePct === 22 || arr[i]!.ratePct === 24);
  for (const tick of keyTicks) {
    const px = stripX + tick.position * stripW;
    layout.page.drawLine({
      start: { x: px, y: stripY + stripH },
      end: { x: px, y: stripY + stripH + 5 },
      thickness: 0.6,
      color: PDF_REPORT_THEME.muted,
    });
    const label = `${tick.ratePct}%`;
    layout.page.drawText(cleanText(label), {
      x: px - layout.widthOf(label, 6) / 2,
      y: stripY + stripH + 8,
      size: 6,
      font: layout.regular,
      color: PDF_REPORT_THEME.muted,
    });
  }

  layout.page.drawText(cleanText(`Ceiling ${formatRothMoneyFull(data.grossIncomeCeiling)}`), {
    x: ceilingX - layout.widthOf(`Ceiling ${formatRothMoneyFull(data.grossIncomeCeiling)}`, 7, layout.bold) / 2,
    y: stripY - 10,
    size: 7,
    font: layout.bold,
    color: PDF_REPORT_THEME.ink,
  });

  const rateCardW = (layout.contentWidth - 16) / 2;
  const rateCardH = 44;
  const rateTop = panelTop - panelH + 8;

  layout.drawPanel(MARGIN_X + 8, rateTop, rateCardW, rateCardH);
  layout.page.drawText(cleanText("Current path rate"), {
    x: MARGIN_X + 18,
    y: rateTop - 14,
    size: 6.5,
    font: layout.regular,
    color: PDF_REPORT_THEME.muted,
  });
  layout.page.drawText(cleanText(formatEffectiveRate(data.stayEffectiveTaxIrmaaRate)), {
    x: MARGIN_X + 18,
    y: rateTop - 32,
    size: 13,
    font: layout.bold,
    color: PDF_REPORT_THEME.stay,
  });

  layout.drawPanel(MARGIN_X + 16 + rateCardW, rateTop, rateCardW, rateCardH, true);
  layout.page.drawText(cleanText("Roth path rate"), {
    x: MARGIN_X + 26 + rateCardW,
    y: rateTop - 14,
    size: 6.5,
    font: layout.regular,
    color: PDF_REPORT_THEME.muted,
  });
  layout.page.drawText(cleanText(formatEffectiveRate(data.rothEffectiveTaxIrmaaRate)), {
    x: MARGIN_X + 26 + rateCardW,
    y: rateTop - 32,
    size: 13,
    font: layout.bold,
    color: PDF_REPORT_THEME.roth,
  });
  layout.page.drawText(cleanText(`Delta ${formatEffectiveRate(data.effectiveRateDeltaPts)} pts`), {
    x: MARGIN_X + 26 + rateCardW,
    y: rateTop - rateCardH - 2,
    size: 6.5,
    font: layout.regular,
    color: PDF_REPORT_THEME.muted,
  });

  layout.y = panelTop - panelH - 14;
}
