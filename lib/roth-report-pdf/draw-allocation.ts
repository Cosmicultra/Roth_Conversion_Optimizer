import type { RothComparisonVisualData } from "@/lib/roth-comparison-visuals";
import { formatRothMoneyFull } from "@/lib/roth-visual-theme";
import { PDF_REPORT_THEME, cleanText, hexToRgb } from "@/lib/roth-report-pdf/theme";
import { MARGIN_X, type PdfReportLayout } from "@/lib/roth-report-pdf/layout";
import { ROTH_VISUAL_COLORS } from "@/lib/roth-visual-theme";

type StackSegment = { label: string; value: number; color: string; shortLabel: string };

function buildStaySegments(data: RothComparisonVisualData): StackSegment[] {
  const segments: StackSegment[] = [
    { label: "Legacy to heirs (net)", shortLabel: "Heirs", value: data.stayHeirsLegacy, color: ROTH_VISUAL_COLORS.heirs },
    { label: "Income you keep", shortLabel: "Income", value: data.stayAfterTaxIncome, color: ROTH_VISUAL_COLORS.income },
    { label: "Taxes + IRMAA", shortLabel: "Tax/IRMAA", value: data.stayTaxesAndIrmaa, color: ROTH_VISUAL_COLORS.taxes },
  ];
  if (data.stayHeirsTaxOnDeath > 0) {
    segments.push({
      label: `Heir tax on death (${data.assumedHeirTaxRatePct}%)`,
      shortLabel: "Heir tax",
      value: data.stayHeirsTaxOnDeath,
      color: ROTH_VISUAL_COLORS.taxes,
    });
  }
  return segments;
}

function buildRothSegments(data: RothComparisonVisualData): StackSegment[] {
  return [
    { label: "Legacy to heirs (net)", shortLabel: "Heirs", value: data.rothHeirsLegacy, color: ROTH_VISUAL_COLORS.heirs },
    { label: "Income you keep", shortLabel: "Income", value: data.rothAfterTaxIncome, color: ROTH_VISUAL_COLORS.income },
    { label: "Taxes + IRMAA", shortLabel: "Tax/IRMAA", value: data.rothTaxesAndIrmaa, color: ROTH_VISUAL_COLORS.taxes },
  ];
}

function drawColumn(
  layout: PdfReportLayout,
  x: number,
  panelTop: number,
  colW: number,
  title: string,
  titleColor: ReturnType<typeof hexToRgb>,
  segments: StackSegment[]
) {
  const barW = 68;
  const maxH = 92;
  const barX = x + (colW - barW) / 2;
  const bottomY = panelTop - 118;

  layout.page.drawText(cleanText(title), {
    x: x + colW / 2 - layout.widthOf(title, 9, layout.bold) / 2,
    y: panelTop - 22,
    size: 9,
    font: layout.bold,
    color: titleColor,
  });

  const total = segments.reduce((s, seg) => s + Math.max(0, seg.value), 0) || 1;
  const scale = maxH / total;

  layout.page.drawRectangle({
    x: barX,
    y: bottomY,
    width: barW,
    height: maxH,
    color: PDF_REPORT_THEME.staySoft,
    borderColor: PDF_REPORT_THEME.ruleStrong,
    borderWidth: 0.4,
  });

  let cursor = bottomY;
  for (const seg of segments) {
    const h = Math.max(2, seg.value * scale);
    layout.page.drawRectangle({
      x: barX,
      y: cursor,
      width: barW,
      height: h,
      color: hexToRgb(seg.color),
    });
    cursor += h;
  }

  layout.page.drawText(cleanText(formatRothMoneyFull(total)), {
    x: barX + barW / 2 - layout.widthOf(formatRothMoneyFull(total), 7, layout.bold) / 2,
    y: bottomY - 12,
    size: 7,
    font: layout.bold,
    color: PDF_REPORT_THEME.ink,
  });

  let ly = panelTop - 128;
  for (const seg of segments) {
    layout.page.drawRectangle({
      x: x + 8,
      y: ly - 6,
      width: 7,
      height: 7,
      color: hexToRgb(seg.color),
    });
    layout.page.drawText(cleanText(`${seg.shortLabel}: ${formatRothMoneyFull(seg.value)}`), {
      x: x + 18,
      y: ly - 5,
      size: 6.5,
      font: layout.regular,
      color: PDF_REPORT_THEME.ink,
    });
    ly -= 11;
  }
}

const ALLOCATION_BLOCK_H = 280;

export function drawWealthAllocation(layout: PdfReportLayout, data: RothComparisonVisualData) {
  layout.checkNewPage(ALLOCATION_BLOCK_H);
  layout.sectionGap();
  layout.drawFigureCaption("FIGURE 1  |  Wealth allocation");
  layout.drawTitle("Where lifetime dollars go", 13);
  layout.drawPara(
    "Stacked bars show allocation among heirs, spendable income, taxes/IRMAA, and (current path only) assumed heir tax at death.",
    7,
    PDF_REPORT_THEME.muted
  );

  const panelTop = layout.y;
  const panelH = 210;
  layout.drawPanel(MARGIN_X, panelTop, layout.contentWidth, panelH);

  const colW = layout.contentWidth / 2;
  const staySegments = buildStaySegments(data);
  const rothSegments = buildRothSegments(data);

  drawColumn(layout, MARGIN_X, panelTop, colW, "Current path", PDF_REPORT_THEME.stay, staySegments);
  drawColumn(
    layout,
    MARGIN_X + colW,
    panelTop,
    colW,
    "Roth conversion",
    PDF_REPORT_THEME.roth,
    rothSegments
  );

  layout.y = panelTop - panelH - 12;
}
