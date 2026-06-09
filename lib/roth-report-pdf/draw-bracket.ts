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



function drawZoneCard(

  layout: PdfReportLayout,

  x: number,

  topY: number,

  w: number,

  h: number,

  title: string,

  body: string,

  accent: typeof PDF_REPORT_THEME.convertZone

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

    { kind: "swatch" as const, color: PDF_REPORT_THEME.convertZone, label: "Convert in this zone" },

    { kind: "line" as const, label: "Your ceiling" },

    { kind: "swatch" as const, color: PDF_REPORT_THEME.avoidZone, label: "Avoid crossing into next bracket" },

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



export function drawBracketStrategy(

  layout: PdfReportLayout,

  data: RothComparisonVisualData,

  federalBracketId: string

) {

  layout.beginDedicatedPage();

  layout.drawFigureCaption("FIGURE 2  |  Bracket strategy");

  layout.drawTitle("Marginal tax bracket management", 13);

  layout.drawPara(

    `Each conversion year, we fill room up to your ${data.maxBracketPct}% bracket ceiling (${formatRothMoneyFull(data.grossIncomeCeiling)} illustrative gross income) — then stop before income would cross into a higher bracket. ${data.filingLabel}.`,

    7.5,

    PDF_REPORT_THEME.muted

  );



  const KEY_LEGEND_H = 14;

  const STRIP_H = 36;

  const CEILING_BOX_H = 54;

  const ZONE_H = 56;

  const RATE_FOOTER_H = 58;

  const GAP = 12;

  const panelPad = 16;

  const nextBracket = nextBracketPct(data.maxBracketPct);



  const panelH =

    panelPad * 2 +

    KEY_LEGEND_H +

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

  const stopPct = Math.min(0.96, Math.max(0.04, data.stopLinePosition));

  const convertW = stripW * stopPct;

  const ceilingX = stripX + convertW;



  let cursor = panelTop - panelPad;



  drawKeyLegendRow(layout, stripX, stripW, cursor - 4);

  cursor -= KEY_LEGEND_H + GAP;



  const stripY = cursor - STRIP_H;

  cursor -= STRIP_H + GAP;



  layout.page.drawRectangle({

    x: stripX,

    y: stripY,

    width: convertW,

    height: STRIP_H,

    color: PDF_REPORT_THEME.convertZone,

    opacity: 0.95,

  });

  layout.page.drawRectangle({

    x: stripX + convertW,

    y: stripY,

    width: stripW - convertW,

    height: STRIP_H,

    color: PDF_REPORT_THEME.avoidZoneLight,

  });

  layout.page.drawRectangle({

    x: stripX,

    y: stripY,

    width: stripW,

    height: STRIP_H,

    borderColor: PDF_REPORT_THEME.rule,

    borderWidth: 0.6,

  });



  for (let i = 0; i < 8; i++) {

    layout.page.drawLine({

      start: { x: ceilingX, y: stripY + 3 + i * 4 },

      end: { x: ceilingX, y: stripY + 5 + i * 4 },

      thickness: 1.1,

      color: PDF_REPORT_THEME.stay,

    });

  }



  if (stopPct >= 0.18) {

    layout.page.drawText(cleanText("Convert"), {

      x: stripX + 12,

      y: stripY + 12,

      size: 8,

      font: layout.bold,

      color: PDF_REPORT_THEME.onFillDark,

    });

  }

  if (stopPct <= 0.82) {

    layout.page.drawText(cleanText("Avoid"), {

      x: stripX + convertW + 12,

      y: stripY + 12,

      size: 8,

      font: layout.bold,

      color: PDF_REPORT_THEME.avoidZone,

    });

  }



  const ceilingBoxW = Math.min(320, layout.contentWidth - 48);

  const ceilingBoxX = MARGIN_X + (layout.contentWidth - ceilingBoxW) / 2;

  const ceilingBoxTop = cursor;

  layout.drawPanel(ceilingBoxX, ceilingBoxTop, ceilingBoxW, CEILING_BOX_H);



  const ceilingTitle = "Your conversion ceiling";

  layout.page.drawText(cleanText(ceilingTitle), {

    x: ceilingBoxX + ceilingBoxW / 2 - layout.widthOf(ceilingTitle, 6.5, layout.bold) / 2,

    y: ceilingBoxTop - 12,

    size: 6.5,

    font: layout.bold,

    color: PDF_REPORT_THEME.muted,

  });

  const ceilingAmount = formatRothMoneyFull(data.grossIncomeCeiling);

  layout.page.drawText(cleanText(ceilingAmount), {

    x: ceilingBoxX + ceilingBoxW / 2 - layout.widthOf(ceilingAmount, 16, layout.bold) / 2,

    y: ceilingBoxTop - 30,

    size: 16,

    font: layout.bold,

    color: PDF_REPORT_THEME.ink,

  });

  const ceilingSub = `Illustrative gross income limit — top of your ${data.maxBracketPct}% marginal bracket${nextBracket ? ` (before ${nextBracket}%)` : ""}`;

  const ceilingSubLines = wrapPlainText(

    (t) => layout.widthOf(t, 6.5),

    ceilingSub,

    6.5,

    ceilingBoxW - 20

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

    "Convert zone",

    `Roth conversions are sized to keep illustrative gross income at or below ${formatRothMoneyFull(data.grossIncomeCeiling)} — the top of your ${data.maxBracketPct}% marginal bracket.`,

    PDF_REPORT_THEME.convertZone

  );

  drawZoneCard(

    layout,

    MARGIN_X + 12 + zoneCardW,

    zoneTop,

    zoneCardW,

    ZONE_H,

    "Your ceiling",

    `This is the stop line on the bar above. Conversions use available room each year without pushing ordinary income into the next bracket${nextBracket ? ` (${nextBracket}%)` : ""}.`,

    PDF_REPORT_THEME.stay

  );

  drawZoneCard(

    layout,

    MARGIN_X + 18 + zoneCardW * 2,

    zoneTop,

    zoneCardW,

    ZONE_H,

    "Avoid zone",

    "Income above the ceiling would cross into a higher marginal rate. The plan avoids converting so much that you spill into this zone.",

    PDF_REPORT_THEME.avoidZone

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



  layout.page.drawText(cleanText("Effective tax + IRMAA rate"), {

    x: leftX,

    y: footerTop - 14,

    size: 6.5,

    font: layout.bold,

    color: PDF_REPORT_THEME.muted,

  });

  const fromLine = `From ${formatEffectiveRate(data.stayEffectiveTaxIrmaaRate)} down to ${formatEffectiveRate(data.rothEffectiveTaxIrmaaRate)}`;

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

  layout.page.drawText(cleanText("Current"), {

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

  layout.page.drawText(cleanText("Roth plan"), {

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

      ? `A ${formatEffectiveRate(data.effectiveRateDeltaPts)} point decrease in your illustrative effective tax and IRMAA rate over the modeled lifetime.`

      : "Effective rate change is illustrative only — confirm with your tax professional.";

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

