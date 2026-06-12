import type { RothComparisonVisualData } from "@/lib/roth-comparison-visuals";

import { formatRothMoneyCompact } from "@/lib/roth-visual-theme";

import { PDF_REPORT_THEME, cleanText } from "@/lib/roth-report-pdf/theme";

import { MARGIN_X, type PdfReportLayout } from "@/lib/roth-report-pdf/layout";



type LegendItem = { key: string; label: string; value: number; friction?: boolean };



const PANEL_PAD = 16;

const BAR_H = 160;

const BAR_W = 72;

const LEGEND_FS = 7.5;

const LEGEND_ROW_H = 15;

const LEGEND_SWATCH = 7;

const LEGEND_GAP = 10;

const DELTA_COL_W = 68;

const TITLE_BLOCK_H = 32;



function buildStayLegend(data: RothComparisonVisualData): LegendItem[] {

  const items: LegendItem[] = [

    { key: "heirs", label: "Heir inheritance (after assumed tax)", value: data.stayHeirsLegacy },

    { key: "income", label: "Spendable income retained", value: data.stayAfterTaxIncome },

    { key: "taxes", label: "Taxes and Medicare surcharges", value: data.stayTaxesAndIrmaa, friction: true },

  ];

  if (data.stayHeirsTaxOnDeath > 0) {

    items.push({

      key: "heirTax",

      label: `Heir tax on death (${data.assumedHeirTaxRatePct}% assumed default)`,

      value: data.stayHeirsTaxOnDeath,

      friction: true,

    });

  }

  return items;

}



function buildRothLegend(data: RothComparisonVisualData): LegendItem[] {

  return [

    { key: "heirs", label: "Heir inheritance (after assumed tax)", value: data.rothHeirsLegacy },

    { key: "income", label: "Spendable income retained", value: data.rothAfterTaxIncome },

    { key: "taxes", label: "Taxes and Medicare surcharges", value: data.rothTaxesAndIrmaa, friction: true },

  ];

}



function segmentFillColor(key: string, friction?: boolean) {

  if (friction) return PDF_REPORT_THEME.taxes;

  if (key === "heirs") return PDF_REPORT_THEME.heirs;

  if (key === "income") return PDF_REPORT_THEME.rothFill;

  return PDF_REPORT_THEME.taxes;

}



function drawBar(

  layout: PdfReportLayout,

  barX: number,

  barBottom: number,

  segments: LegendItem[]

) {

  const stackSegs = segments.filter((s) => !s.friction);

  const frictionSegs = segments.filter((s) => s.friction);

  const frictionTotal = frictionSegs.reduce((s, seg) => s + Math.max(0, seg.value), 0);

  const wealthTotal =

    stackSegs.reduce((s, seg) => s + Math.max(0, seg.value), 0) + frictionTotal || 1;

  const frictionH = frictionTotal > 0 ? (frictionTotal / wealthTotal) * BAR_H * 0.36 : 0;

  const stackH = BAR_H - frictionH;



  layout.page.drawRectangle({

    x: barX,

    y: barBottom,

    width: BAR_W,

    height: BAR_H,

    color: PDF_REPORT_THEME.staySoft,

    borderColor: PDF_REPORT_THEME.rule,

    borderWidth: 0.6,

  });



  if (frictionTotal > 0) {

    let frictionCursor = barBottom;

    for (const seg of frictionSegs) {

      const h = Math.max(3, (seg.value / frictionTotal) * frictionH);

      layout.page.drawRectangle({

        x: barX,

        y: frictionCursor,

        width: BAR_W,

        height: h,

        color: PDF_REPORT_THEME.taxesLight,

      });

      layout.page.drawRectangle({

        x: barX,

        y: frictionCursor + h - Math.min(4, h),

        width: BAR_W,

        height: Math.min(4, h),

        color: PDF_REPORT_THEME.taxes,

      });

      frictionCursor += h;

    }

  }



  const stackSum = stackSegs.reduce((s, seg) => s + Math.max(0, seg.value), 0) || 1;

  let cursor = barBottom + frictionH;

  for (const seg of stackSegs) {

    const h = Math.max(3, (seg.value / stackSum) * stackH);

    layout.page.drawRectangle({

      x: barX,

      y: cursor,

      width: BAR_W,

      height: h,

      color: segmentFillColor(seg.key, seg.friction),

    });

    cursor += h;

  }

}



function drawColumnLegend(

  layout: PdfReportLayout,

  colX: number,

  colW: number,

  legendTop: number,

  items: LegendItem[],

  extraNote?: string

) {

  const pad = 6;

  const legendLeft = colX + pad;

  const legendRight = colX + colW - pad;

  const swatchX = legendLeft;

  const labelX = legendLeft + LEGEND_SWATCH + 5;

  const labelMaxW = legendRight - labelX - 52;



  let ly = legendTop;

  for (const item of items) {

    const color = segmentFillColor(item.key, item.friction);

    layout.page.drawRectangle({

      x: swatchX,

      y: ly - LEGEND_SWATCH,

      width: LEGEND_SWATCH,

      height: LEGEND_SWATCH,

      color,

    });



    const label = cleanText(item.label);

    let displayLabel = label;

    while (displayLabel.length > 3 && layout.widthOf(displayLabel, LEGEND_FS) > labelMaxW) {

      displayLabel = `${displayLabel.slice(0, -4)}…`;

    }

    layout.page.drawText(displayLabel, {

      x: labelX,

      y: ly - LEGEND_SWATCH + 1,

      size: LEGEND_FS,

      font: layout.regular,

      color: PDF_REPORT_THEME.muted,

    });



    const value = formatRothMoneyCompact(item.value);

    layout.drawTextRight(legendRight, ly - LEGEND_SWATCH + 1, value, LEGEND_FS, layout.bold, PDF_REPORT_THEME.ink);

    ly -= LEGEND_ROW_H;

  }



  if (extraNote) {

    layout.page.drawText(cleanText(extraNote), {

      x: legendLeft,

      y: ly - LEGEND_SWATCH + 1,

      size: LEGEND_FS,

      font: layout.regular,

      color: PDF_REPORT_THEME.brandBlue,

    });

  }

}



function drawColumnHeader(

  layout: PdfReportLayout,

  colX: number,

  colW: number,

  topY: number,

  title: string,

  titleColor: typeof PDF_REPORT_THEME.stay,

  totalLabel: string

) {

  layout.page.drawText(cleanText(title), {

    x: colX + colW / 2 - layout.widthOf(title, 8, layout.bold) / 2,

    y: topY,

    size: 8,

    font: layout.bold,

    color: titleColor,

  });

  layout.page.drawText(cleanText(totalLabel), {

    x: colX + colW / 2 - layout.widthOf(totalLabel, 13, layout.bold) / 2,

    y: topY - 16,

    size: 13,

    font: layout.bold,

    color: titleColor,

  });

}



export function drawWealthAllocation(layout: PdfReportLayout, data: RothComparisonVisualData) {

  layout.beginDedicatedPage();

  layout.drawFigureCaption("FIGURE 1  |  Wealth allocation");

  layout.drawTitle("Lifetime value breakdown", 13);

  layout.drawPara(

    "Each bar splits lifetime value into spendable income retained and heir inheritance. The current path also shows lifetime taxes and Medicare surcharges and an assumed heir tax on death.",

    7.5,

    PDF_REPORT_THEME.muted

  );



  const stayLegend = buildStayLegend(data);

  const rothLegend = buildRothLegend(data);

  const stayLegendRows = stayLegend.length;

  const rothLegendRows = rothLegend.length + 1;

  const maxLegendRows = Math.max(stayLegendRows, rothLegendRows);

  const legendBlockH = maxLegendRows * LEGEND_ROW_H + 6;



  const panelH = PANEL_PAD * 2 + TITLE_BLOCK_H + BAR_H + LEGEND_GAP + legendBlockH + 8;

  const panelTop = layout.y;

  layout.drawPanel(MARGIN_X, panelTop, layout.contentWidth, panelH, true);



  const contentTop = panelTop - PANEL_PAD;

  const headerY = contentTop;

  const barBottom = headerY - TITLE_BLOCK_H - BAR_H;

  const legendTop = barBottom - LEGEND_GAP;



  const showBalanceComparison = data.showStartingBalanceComparison;
  const centerColW = showBalanceComparison ? DELTA_COL_W : 0;
  const sideColW = (layout.contentWidth - centerColW) / 2;

  const stayColX = MARGIN_X;

  const rothColX = MARGIN_X + sideColW + centerColW;



  const stayTotal = formatRothMoneyCompact(data.stayAfterTaxIncome + data.stayHeirsLegacy);

  const rothTotal = formatRothMoneyCompact(data.rothAfterTaxIncome + data.rothHeirsLegacy);



  drawColumnHeader(layout, stayColX, sideColW, headerY, "Current path", PDF_REPORT_THEME.stay, stayTotal);

  drawBar(layout, stayColX + (sideColW - BAR_W) / 2, barBottom, stayLegend);

  drawColumnLegend(layout, stayColX, sideColW, legendTop, stayLegend);



  if (showBalanceComparison) {
    const deltaX = MARGIN_X + sideColW + centerColW / 2;
    const centerY = barBottom + BAR_H / 2;

    layout.page.drawText(cleanText("->"), {
      x: deltaX - layout.widthOf("->", 11) / 2,
      y: centerY + 42,
      size: 11,
      font: layout.regular,
      color: PDF_REPORT_THEME.muted,
    });

    const stayBalance = formatRothMoneyCompact(data.stayTraditionalStartingBalance);
    layout.page.drawText(cleanText(stayBalance), {
      x: deltaX - layout.widthOf(stayBalance, 9, layout.bold) / 2,
      y: centerY + 24,
      size: 9,
      font: layout.bold,
      color: PDF_REPORT_THEME.stay,
    });

    const stayCaption = "Current path account value";
    layout.page.drawText(cleanText(stayCaption), {
      x: deltaX - layout.widthOf(stayCaption, 4.8, layout.bold) / 2,
      y: centerY + 10,
      size: 4.8,
      font: layout.bold,
      color: PDF_REPORT_THEME.muted,
    });

    layout.page.drawText(cleanText("vs"), {
      x: deltaX - layout.widthOf("vs", 5.5, layout.bold) / 2,
      y: centerY - 2,
      size: 5.5,
      font: layout.bold,
      color: PDF_REPORT_THEME.muted,
    });

    const rothPremium = formatRothMoneyCompact(data.rothConversionPremium);
    layout.page.drawText(cleanText(rothPremium), {
      x: deltaX - layout.widthOf(rothPremium, 9, layout.bold) / 2,
      y: centerY - 18,
      size: 9,
      font: layout.bold,
      color: PDF_REPORT_THEME.roth,
    });

    const rothCaption = "Roth conversion amount";
    layout.page.drawText(cleanText(rothCaption), {
      x: deltaX - layout.widthOf(rothCaption, 4.8, layout.bold) / 2,
      y: centerY - 32,
      size: 4.8,
      font: layout.bold,
      color: PDF_REPORT_THEME.muted,
    });
  }



  drawColumnHeader(

    layout,

    rothColX,

    sideColW,

    headerY,

    "Roth conversion path",

    PDF_REPORT_THEME.roth,

    rothTotal

  );

  drawBar(layout, rothColX + (sideColW - BAR_W) / 2, barBottom, rothLegend);

  drawColumnLegend(

    layout,

    rothColX,

    sideColW,

    legendTop,

    rothLegend,

    "Tax-free to heirs (illustrated)"

  );



  layout.y = panelTop - panelH - 12;

}

