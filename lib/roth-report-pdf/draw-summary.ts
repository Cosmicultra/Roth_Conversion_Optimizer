import type { RothComparisonVisualData } from "@/lib/roth-comparison-visuals";
import {
  formatRothDeltaCompact,
  formatRothMoneyCompact,
  formatRothPct,
} from "@/lib/roth-visual-theme";
import { PDF_REPORT_THEME, REPORT_DISCLAIMER_SHORT, cleanText, wrapPlainText } from "@/lib/roth-report-pdf/theme";
import { MARGIN_X, type PdfReportLayout } from "@/lib/roth-report-pdf/layout";
import type { RGB } from "pdf-lib";

type KpiCard = { label: string; value: string; helper: string; valueColor?: RGB; accent?: boolean };

function deltaTone(n: number): "positive" | "negative" | "neutral" {
  if (n > 500) return "positive";
  if (n < -500) return "negative";
  return "neutral";
}

function toneColor(tone: "positive" | "negative" | "neutral"): RGB {
  if (tone === "positive") return PDF_REPORT_THEME.brandBlue;
  if (tone === "negative") return PDF_REPORT_THEME.negative;
  return PDF_REPORT_THEME.ink;
}

function drawKpiCard(layout: PdfReportLayout, x: number, topY: number, w: number, h: number, card: KpiCard) {
  layout.drawPanel(x, topY, w, h, card.accent);
  layout.page.drawText(cleanText(card.label), {
    x: x + 10,
    y: topY - 14,
    size: 6.5,
    font: layout.regular,
    color: PDF_REPORT_THEME.muted,
  });
  layout.page.drawText(cleanText(card.value), {
    x: x + 10,
    y: topY - 30,
    size: 11,
    font: layout.bold,
    color: card.valueColor ?? PDF_REPORT_THEME.ink,
  });
  const lines = wrapPlainText((t) => layout.widthOf(t, 6.5), card.helper, 6.5, w - 20);
  let hy = topY - 44;
  for (const ln of lines.slice(0, 2)) {
    layout.page.drawText(cleanText(ln), {
      x: x + 10,
      y: hy,
      size: 6.5,
      font: layout.regular,
      color: PDF_REPORT_THEME.muted,
    });
    hy -= 9;
  }
}

export function drawExecutiveSummary(
  layout: PdfReportLayout,
  data: RothComparisonVisualData,
  clientName: string
) {
  layout.drawFigureCaption("EXECUTIVE SUMMARY");
  layout.drawTitle(
    clientName ? `Lifetime wealth comparison for ${clientName}` : "Lifetime wealth comparison",
    13
  );
  layout.drawPara(
    `At the end of the modeled horizon, the Roth conversion path leaves ${data.wealthDelta >= 0 ? "more" : "less"} after-tax wealth than staying in traditional IRAs.`,
    7.5,
    PDF_REPORT_THEME.muted
  );

  const gap = 10;
  const deltaColW = 90;
  const sideColW = (layout.contentWidth - deltaColW - gap * 2) / 2;
  const cardH = 68;
  const row1Y = layout.y;

  drawKpiCard(layout, MARGIN_X, row1Y, sideColW, cardH, {
    label: "Current path",
    value: formatRothMoneyCompact(data.stayEndingWealth),
    helper: "After-tax wealth, no conversion plan",
    valueColor: PDF_REPORT_THEME.ink,
  });

  const deltaX = MARGIN_X + sideColW + gap;
  const deltaCenterX = deltaX + deltaColW / 2;
  const deltaColor = data.wealthDelta >= 0 ? PDF_REPORT_THEME.brandBlue : PDF_REPORT_THEME.negative;
  layout.page.drawText(cleanText("Difference"), {
    x: deltaCenterX - layout.widthOf("Difference", 6.5) / 2,
    y: row1Y - 14,
    size: 6.5,
    font: layout.regular,
    color: PDF_REPORT_THEME.muted,
  });
  const deltaVal = formatRothDeltaCompact(data.wealthDelta);
  layout.page.drawText(cleanText(deltaVal), {
    x: deltaCenterX - layout.widthOf(deltaVal, 14, layout.bold) / 2,
    y: row1Y - 34,
    size: 14,
    font: layout.bold,
    color: deltaColor,
  });
  const pctVal = formatRothPct(data.wealthDeltaPct, true);
  layout.page.drawText(cleanText(pctVal), {
    x: deltaCenterX - layout.widthOf(pctVal, 7) / 2,
    y: row1Y - 48,
    size: 7,
    font: layout.regular,
    color: PDF_REPORT_THEME.muted,
  });

  drawKpiCard(layout, MARGIN_X + sideColW + gap + deltaColW + gap, row1Y, sideColW, cardH, {
    label: "Roth conversion path",
    value: formatRothMoneyCompact(data.rothEndingWealth),
    helper: "After-tax wealth, with the conversion plan",
    valueColor: PDF_REPORT_THEME.roth,
    accent: true,
  });
  layout.y = row1Y - cardH - 18;

  layout.checkNewPage(200);
  layout.drawSectionHeading("Where the difference comes from");

  const cardW = layout.cardWidth(3, gap);
  const kpiCards: KpiCard[] = [
    {
      label: "More total wealth",
      value: formatRothDeltaCompact(data.wealthDelta),
      helper: `${formatRothPct(data.wealthDeltaPct, true)} vs. current path at end of plan`,
      valueColor: toneColor(deltaTone(data.wealthDelta)),
    },
    {
      label: "Tax savings",
      value: formatRothDeltaCompact(data.taxSavings),
      helper: "Federal illustrative tax avoided over the modeled lifetime",
      valueColor: toneColor(deltaTone(data.taxSavings)),
    },
    {
      label: "IRMAA difference",
      value: formatRothDeltaCompact(data.irmaaSavings),
      helper: "Medicare IRMAA surcharges avoided (illustrative)",
      valueColor: toneColor(deltaTone(data.irmaaSavings)),
    },
    {
      label: "Net legacy to heirs",
      value: formatRothDeltaCompact(data.heirsLegacyDelta),
      helper: `Current path net after ${data.assumedHeirTaxRatePct}% assumed heir tax vs. Roth tax-free to heirs`,
      valueColor: toneColor(deltaTone(data.heirsLegacyDelta)),
    },
    {
      label: "Spendable income trade-off",
      value: formatRothDeltaCompact(data.afterTaxIncomeDelta),
      helper: "After-tax income kept during the plan",
      valueColor: toneColor(deltaTone(data.afterTaxIncomeDelta)),
    },
    {
      label: "Conversion premium",
      value: formatRothMoneyCompact(data.conversionAmountTotal),
      helper: `${data.filingLabel}, ${data.maxBracketPct}% ceiling`,
      valueColor: PDF_REPORT_THEME.ink,
    },
  ];

  const insightCardH = 58;
  for (let row = 0; row < 2; row++) {
    const rowY = layout.y;
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;
      if (idx < kpiCards.length) {
        drawKpiCard(layout, MARGIN_X + col * (cardW + gap), rowY, cardW, insightCardH, kpiCards[idx]!);
      }
    }
    layout.y = rowY - insightCardH - 10;
  }

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
