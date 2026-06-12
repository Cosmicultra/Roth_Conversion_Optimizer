import type { RothComparisonVisualData } from "@/lib/roth-comparison-visuals";

import { formatEffectiveRate, formatRothMoneyFull } from "@/lib/roth-visual-theme";

import { PDF_REPORT_THEME, cleanText, wrapPlainText } from "@/lib/roth-report-pdf/theme";

import { MARGIN_X, type PdfReportLayout } from "@/lib/roth-report-pdf/layout";

const BRACKET_ORDER = [10, 12, 22, 24, 32, 35, 37] as const;

function nextBracketPct(current: number): number | null {
  const idx = BRACKET_ORDER.indexOf(current as (typeof BRACKET_ORDER)[number]);
  if (idx < 0 || idx >= BRACKET_ORDER.length - 1) return null;
  return BRACKET_ORDER[idx + 1]!;
}

function targetBracketIndex(maxBracketPct: number): number {
  const idx = BRACKET_ORDER.indexOf(maxBracketPct as (typeof BRACKET_ORDER)[number]);
  return idx >= 0 ? idx : BRACKET_ORDER.length - 1;
}

function drawZoneCard(
  layout: PdfReportLayout,
  x: number,
  topY: number,
  w: number,
  h: number,
  title: string,
  body: string,
  accent: typeof PDF_REPORT_THEME.convertZone,
) {
  layout.drawPanel(x, topY, w, h);
  layout.page.drawRectangle({ x: x + 10, y: topY - 14, width: 7, height: 7, color: accent });
  layout.page.drawText(cleanText(title), {
    x: x + 22,
    y: topY - 13,
    size: 7.5,
    font: layout.bold,
    color: PDF_REPORT_THEME.ink,
  });
  const lines = wrapPlainText((t) => layout.widthOf(t, 7), body, 7, w - 22);
  let by = topY - 27;
  for (const ln of lines.slice(0, 3)) {
    layout.page.drawText(cleanText(ln), {
      x: x + 10,
      y: by,
      size: 7,
      font: layout.regular,
      color: PDF_REPORT_THEME.muted,
    });
    by -= 10;
  }
}

function drawKeyLegendRow(layout: PdfReportLayout, stripX: number, stripW: number, topY: number) {
  const fs = 6.5;
  const items = [
    { kind: "swatch" as const, color: PDF_REPORT_THEME.convertZone, label: "Within target bracket" },
    { kind: "line" as const, label: "Income cap" },
    { kind: "swatch" as const, color: PDF_REPORT_THEME.avoidZoneLight, label: "Higher bracket bands" },
  ];

  const widths = items.map((item) => {
    const labelW = layout.widthOf(item.label, fs);
    return item.kind === "line" ? 4 + 6 + labelW : 10 + 6 + labelW;
  });
  const gap = 18;
  const totalW = widths.reduce((s, w) => s + w, 0) + gap * (items.length - 1);
  let x = stripX + (stripW - totalW) / 2;

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (item.kind === "swatch") {
      layout.page.drawRectangle({ x, y: topY - 6, width: 10, height: 6, color: item.color });
      x += 16;
    } else {
      layout.page.drawLine({
        start: { x, y: topY - 6 },
        end: { x, y: topY },
        thickness: 1,
        color: PDF_REPORT_THEME.stay,
      });
      x += 10;
    }
    layout.page.drawText(cleanText(item.label), {
      x,
      y: topY - 5,
      size: fs,
      font: layout.bold,
      color: PDF_REPORT_THEME.muted,
    });
    x += layout.widthOf(item.label, fs) + gap;
  }
}

function drawDiscreteBracketBands(
  layout: PdfReportLayout,
  stripX: number,
  stripY: number,
  stripW: number,
  stripH: number,
  targetIdx: number,
) {
  const cellGap = 3;
  const cellW = (stripW - cellGap * (BRACKET_ORDER.length - 1)) / BRACKET_ORDER.length;

  for (let i = 0; i < BRACKET_ORDER.length; i++) {
    const rate = BRACKET_ORDER[i]!;
    const isTarget = i <= targetIdx;
    const cellX = stripX + i * (cellW + cellGap);

    layout.page.drawRectangle({
      x: cellX,
      y: stripY,
      width: cellW,
      height: stripH,
      color: isTarget ? PDF_REPORT_THEME.convertZone : PDF_REPORT_THEME.avoidZoneLight,
    });
    layout.page.drawRectangle({
      x: cellX,
      y: stripY,
      width: cellW,
      height: stripH,
      borderColor: isTarget ? PDF_REPORT_THEME.accentBorder : PDF_REPORT_THEME.taxesLight,
      borderWidth: 0.5,
    });

    const rateLabel = `${rate}%`;
    layout.page.drawText(cleanText(rateLabel), {
      x: cellX + cellW / 2 - layout.widthOf(rateLabel, 8, layout.bold) / 2,
      y: stripY + stripH / 2 - 3,
      size: 8,
      font: layout.bold,
      color: isTarget ? PDF_REPORT_THEME.onFillDark : PDF_REPORT_THEME.avoidZone,
    });
  }

  const capX = stripX + (targetIdx + 1) * (cellW + cellGap) - cellGap / 2;
  layout.page.drawLine({
    start: { x: capX, y: stripY - 2 },
    end: { x: capX, y: stripY + stripH + 2 },
    thickness: 1.5,
    color: PDF_REPORT_THEME.stay,
  });
}

export function drawBracketStrategy(
  layout: PdfReportLayout,
  data: RothComparisonVisualData,
  _federalBracketId: string,
) {
  layout.beginDedicatedPage();
  layout.drawFigureCaption("FIGURE 2  |  Bracket strategy");
  layout.drawTitle("Staying within your target bracket", 13);
  layout.drawPara(
    `Year by year, conversions use available room in your ${data.maxBracketPct}% bracket (${formatRothMoneyFull(data.grossIncomeCeiling)} illustrative gross income) without pushing ordinary income into the next rate band. ${data.filingLabel}.`,
    7.5,
    PDF_REPORT_THEME.muted,
  );

  const KEY_LEGEND_H = 14;
  const STRIP_H = 36;
  const CAP_CALLOUT_H = 22;
  const CEILING_BOX_H = 54;
  const ZONE_H = 56;
  const RATE_FOOTER_H = 58;
  const GAP = 12;
  const panelPad = 16;
  const nextBracket = nextBracketPct(data.maxBracketPct);
  const targetIdx = targetBracketIndex(data.maxBracketPct);

  const panelH =
    panelPad * 2 +
    KEY_LEGEND_H +
    GAP +
    CAP_CALLOUT_H +
    GAP +
    STRIP_H +
    GAP +
    CEILING_BOX_H +
    GAP +
    ZONE_H +
    GAP +
    RATE_FOOTER_H +
    (data.conversionAmountTotal > 0 ? 14 : 0);

  const panelTop = layout.y;
  layout.drawPanel(MARGIN_X, panelTop, layout.contentWidth, panelH, true);

  const stripX = MARGIN_X + 20;
  const stripW = layout.contentWidth - 40;

  let cursor = panelTop - panelPad;

  drawKeyLegendRow(layout, stripX, stripW, cursor - 4);
  cursor -= KEY_LEGEND_H + GAP;

  const capAmount = formatRothMoneyFull(data.grossIncomeCeiling);
  const capLabel = "Income cap";
  const capLineW = layout.widthOf(capLabel, 6, layout.bold) + 8 + layout.widthOf(capAmount, 9, layout.bold);
  const capLineX = stripX + stripW * ((targetIdx + 1) / BRACKET_ORDER.length) - capLineW / 2;
  layout.page.drawText(cleanText(capLabel), {
    x: capLineX,
    y: cursor - 6,
    size: 6,
    font: layout.bold,
    color: PDF_REPORT_THEME.muted,
  });
  layout.page.drawText(cleanText(capAmount), {
    x: capLineX + layout.widthOf(capLabel, 6, layout.bold) + 8,
    y: cursor - 6,
    size: 9,
    font: layout.bold,
    color: PDF_REPORT_THEME.ink,
  });
  cursor -= CAP_CALLOUT_H + GAP;

  const stripY = cursor - STRIP_H;
  drawDiscreteBracketBands(layout, stripX, stripY, stripW, STRIP_H, targetIdx);
  cursor -= STRIP_H + GAP;

  const ceilingBoxW = Math.min(320, layout.contentWidth - 48);
  const ceilingBoxX = MARGIN_X + (layout.contentWidth - ceilingBoxW) / 2;
  const ceilingBoxTop = cursor;
  layout.drawPanel(ceilingBoxX, ceilingBoxTop, ceilingBoxW, CEILING_BOX_H);

  const ceilingTitle = "Illustrative gross income cap";
  layout.page.drawText(cleanText(ceilingTitle), {
    x: ceilingBoxX + ceilingBoxW / 2 - layout.widthOf(ceilingTitle, 6.5, layout.bold) / 2,
    y: ceilingBoxTop - 12,
    size: 6.5,
    font: layout.bold,
    color: PDF_REPORT_THEME.muted,
  });
  layout.page.drawText(cleanText(capAmount), {
    x: ceilingBoxX + ceilingBoxW / 2 - layout.widthOf(capAmount, 16, layout.bold) / 2,
    y: ceilingBoxTop - 30,
    size: 16,
    font: layout.bold,
    color: PDF_REPORT_THEME.ink,
  });
  const ceilingSub = `Modeled limit at the top of the ${data.maxBracketPct}% marginal bracket${nextBracket ? ` (before ${nextBracket}%)` : ""}`;
  const ceilingSubLines = wrapPlainText(
    (t) => layout.widthOf(t, 6.5),
    ceilingSub,
    6.5,
    ceilingBoxW - 20,
  );
  let subY = ceilingBoxTop - 44;
  for (const ln of ceilingSubLines.slice(0, 2)) {
    layout.page.drawText(cleanText(ln), {
      x: ceilingBoxX + ceilingBoxW / 2 - layout.widthOf(ln, 6.5) / 2,
      y: subY,
      size: 6.5,
      font: layout.regular,
      color: PDF_REPORT_THEME.muted,
    });
    subY -= 9;
  }

  cursor -= CEILING_BOX_H + GAP;
  const zoneTop = cursor;
  const zoneCardW = (layout.contentWidth - 28) / 3;

  drawZoneCard(
    layout,
    MARGIN_X + 6,
    zoneTop,
    zoneCardW,
    ZONE_H,
    "Target bracket band",
    `Roth conversions are sized to keep illustrative gross income at or below ${formatRothMoneyFull(data.grossIncomeCeiling)}, the top of your ${data.maxBracketPct}% marginal bracket.`,
    PDF_REPORT_THEME.convertZone,
  );
  drawZoneCard(
    layout,
    MARGIN_X + 12 + zoneCardW,
    zoneTop,
    zoneCardW,
    ZONE_H,
    "Income cap",
    `This is the income cap shown on the chart. Conversions use available room each year without pushing ordinary income into the next bracket${nextBracket ? ` (${nextBracket}%)` : ""}.`,
    PDF_REPORT_THEME.stay,
  );
  drawZoneCard(
    layout,
    MARGIN_X + 18 + zoneCardW * 2,
    zoneTop,
    zoneCardW,
    ZONE_H,
    "Higher bracket bands",
    "Income above your selected bracket would cross into a higher marginal rate. The plan avoids converting so much that you push income above your target bracket.",
    PDF_REPORT_THEME.avoidZone,
  );

  cursor -= ZONE_H + GAP;
  const footerTop = cursor;
  const footerBottom = footerTop - RATE_FOOTER_H;
  layout.page.drawLine({
    start: { x: MARGIN_X + 8, y: footerTop },
    end: { x: MARGIN_X + layout.contentWidth - 8, y: footerTop },
    thickness: 0.5,
    color: PDF_REPORT_THEME.rule,
  });

  const colW = (layout.contentWidth - 24) / 3;
  const leftX = MARGIN_X + 8;
  const midX = leftX + colW;
  const rightX = midX + colW;

  layout.page.drawText(cleanText("Lifetime tax and Medicare surcharge rate"), {
    x: leftX,
    y: footerTop - 14,
    size: 6.5,
    font: layout.bold,
    color: PDF_REPORT_THEME.muted,
  });
  const fromLine = `Falls from ${formatEffectiveRate(data.stayEffectiveTaxIrmaaRate)} to ${formatEffectiveRate(data.rothEffectiveTaxIrmaaRate)}`;
  const fromLines = wrapPlainText((t) => layout.widthOf(t, 7), fromLine, 7, colW - 4);
  let fromY = footerTop - 26;
  for (const ln of fromLines.slice(0, 2)) {
    layout.page.drawText(cleanText(ln), {
      x: leftX,
      y: fromY,
      size: 7,
      font: layout.regular,
      color: PDF_REPORT_THEME.ink,
    });
    fromY -= 10;
  }

  const stayRate = formatEffectiveRate(data.stayEffectiveTaxIrmaaRate);
  const rothRate = formatEffectiveRate(data.rothEffectiveTaxIrmaaRate);
  layout.page.drawText(cleanText("Current path"), {
    x: midX + colW / 2 - layout.widthOf(stayRate, 14, layout.bold) / 2 - 28,
    y: footerTop - 14,
    size: 6.5,
    font: layout.bold,
    color: PDF_REPORT_THEME.muted,
  });
  layout.page.drawText(cleanText(stayRate), {
    x: midX + colW / 2 - layout.widthOf(stayRate, 14, layout.bold) / 2 - 28,
    y: footerTop - 34,
    size: 14,
    font: layout.bold,
    color: PDF_REPORT_THEME.stay,
  });
  layout.page.drawText(cleanText("->"), {
    x: midX + colW / 2 - 4,
    y: footerTop - 30,
    size: 12,
    font: layout.regular,
    color: PDF_REPORT_THEME.muted,
  });
  layout.page.drawText(cleanText("Roth conversion path"), {
    x: midX + colW / 2 + 16,
    y: footerTop - 14,
    size: 6.5,
    font: layout.bold,
    color: PDF_REPORT_THEME.brandBlue,
  });
  layout.page.drawText(cleanText(rothRate), {
    x: midX + colW / 2 + 16,
    y: footerTop - 34,
    size: 14,
    font: layout.bold,
    color: PDF_REPORT_THEME.roth,
  });

  const deltaNarrative =
    data.effectiveRateDeltaPts > 0
      ? `About a ${formatEffectiveRate(data.effectiveRateDeltaPts)} percentage-point reduction in combined tax and IRMAA over the modeled plan.`
      : "Rate change is illustrative only. Confirm with your tax professional.";
  const deltaLines = wrapPlainText((t) => layout.widthOf(t, 7), deltaNarrative, 7, colW - 4);
  let deltaY = footerTop - 16;
  for (const ln of deltaLines.slice(0, 3)) {
    layout.page.drawText(cleanText(ln), {
      x: rightX,
      y: deltaY,
      size: 7,
      font: layout.regular,
      color: PDF_REPORT_THEME.ink,
    });
    deltaY -= 10;
  }

  if (data.conversionAmountTotal > 0) {
    const convLine = `Total gross conversions modeled: ${formatRothMoneyFull(data.conversionAmountTotal)}.`;
    layout.page.drawText(cleanText(convLine), {
      x: MARGIN_X + 8,
      y: footerBottom + 6,
      size: 6.5,
      font: layout.regular,
      color: PDF_REPORT_THEME.muted,
    });
  }

  layout.y = panelTop - panelH - 12;
}
