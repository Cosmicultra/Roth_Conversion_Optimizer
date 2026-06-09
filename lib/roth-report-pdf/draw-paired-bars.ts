import { PDF_REPORT_THEME, PAIRED_BAR_INTRO_TEXT, cleanText, money, wrapPlainText } from "@/lib/roth-report-pdf/theme";
import { MARGIN_X, type PdfReportLayout } from "@/lib/roth-report-pdf/layout";
import type { RGB } from "pdf-lib";

const METRIC_BLOCK_H = 52;

function drawScenarioBarBlock(
  layout: PdfReportLayout,
  topY: number,
  metric: string,
  stayVal: number,
  rothVal: number
): number {
  const barMaxW = layout.contentWidth - 150;
  const barH = 9;
  const scaleMax = Math.max(stayVal, rothVal, 1);
  let y = topY;

  const titleLines = wrapPlainText((t) => layout.widthOf(t, 8), metric, 8, layout.contentWidth);
  for (const ln of titleLines.slice(0, 2)) {
    layout.page.drawText(cleanText(ln), {
      x: MARGIN_X,
      y,
      size: 8,
      font: layout.bold,
      color: PDF_REPORT_THEME.ink,
    });
    y -= 11;
  }

  const drawBar = (label: string, val: number, fill: RGB, track: RGB) => {
    layout.page.drawText(cleanText(label), {
      x: MARGIN_X + 4,
      y,
      size: 6.5,
      font: layout.regular,
      color: PDF_REPORT_THEME.muted,
    });
    const trackX = MARGIN_X + 52;
    const w = Math.max(2, (val / scaleMax) * barMaxW);
    const barBottomY = y - barH + 1;
    layout.page.drawRectangle({
      x: trackX,
      y: barBottomY,
      width: barMaxW,
      height: barH,
      color: track,
    });
    layout.page.drawRectangle({ x: trackX, y: barBottomY, width: w, height: barH, color: fill });
    layout.drawTextRight(trackX + barMaxW + 78, barBottomY + 2, money(val), 7.5, layout.bold, PDF_REPORT_THEME.ink);
    y -= barH + 8;
  };

  drawBar("Stay", stayVal, PDF_REPORT_THEME.stay, PDF_REPORT_THEME.staySoft);
  drawBar("Roth", rothVal, PDF_REPORT_THEME.roth, PDF_REPORT_THEME.rothSoft);

  return y - 6;
}

export type PairedBarMetric = {
  label: string;
  stayVal: number;
  rothVal: number;
};

const PAIRED_BLOCK_H = 420;

export function drawPairedBarComparison(layout: PdfReportLayout, metrics: PairedBarMetric[]) {
  layout.checkNewPage(PAIRED_BLOCK_H);
  layout.sectionGap();
  layout.drawFigureCaption("FIGURE 3  |  Scenario comparison");
  layout.drawTitle("Pathway differences", 13);
  for (const ln of wrapPlainText((t) => layout.widthOf(t, 7), PAIRED_BAR_INTRO_TEXT, 7, layout.contentWidth)) {
    layout.page.drawText(cleanText(ln), {
      x: MARGIN_X,
      y: layout.y,
      size: 7,
      font: layout.regular,
      color: PDF_REPORT_THEME.muted,
    });
    layout.y -= 9;
  }
  layout.y -= 6;

  for (const metric of metrics) {
    layout.checkNewPage(METRIC_BLOCK_H + 20);
    layout.y = drawScenarioBarBlock(layout, layout.y, metric.label, metric.stayVal, metric.rothVal);
  }

  layout.drawPara(
    "Ending balances differ: traditional IRA balance is not the same as aggregated Roth under the modeled paths.",
    6.5,
    PDF_REPORT_THEME.muted
  );
}
