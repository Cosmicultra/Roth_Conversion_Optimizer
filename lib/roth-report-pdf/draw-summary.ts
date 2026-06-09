import type { RothComparisonVisualData } from "@/lib/roth-comparison-visuals";
import {
  formatRothDeltaCompact,
  formatRothMoneyCompact,
  formatRothPct,
} from "@/lib/roth-visual-theme";
import { PDF_REPORT_THEME, REPORT_DISCLAIMER_SHORT, cleanText, wrapPlainText } from "@/lib/roth-report-pdf/theme";
import { MARGIN_X, type PdfReportLayout } from "@/lib/roth-report-pdf/layout";

type KpiCard = { label: string; value: string; helper: string; accent?: boolean };

function drawKpiCard(layout: PdfReportLayout, x: number, topY: number, w: number, h: number, card: KpiCard) {
  layout.drawPanel(x, topY, w, h, card.accent);
  layout.page.drawText(cleanText(card.label), {
    x: x + 10,
    y: topY - 15,
    size: 6.5,
    font: layout.regular,
    color: PDF_REPORT_THEME.muted,
  });
  layout.page.drawText(cleanText(card.value), {
    x: x + 10,
    y: topY - 32,
    size: 12,
    font: layout.bold,
    color: card.accent ? PDF_REPORT_THEME.roth : PDF_REPORT_THEME.ink,
  });
  const lines = wrapPlainText((t) => layout.widthOf(t, 6.5), card.helper, 6.5, w - 20);
  let hy = topY - 46;
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
    clientName ? `Lifetime wealth — ${clientName}` : "Lifetime wealth comparison",
    13
  );
  layout.drawPara(
    `At the end of the modeled horizon, the Roth path leaves ${data.wealthDelta >= 0 ? "more" : "less"} after-tax wealth than staying in traditional IRAs.`,
    7.5,
    PDF_REPORT_THEME.muted
  );

  const gap = 10;
  const cardW = layout.cardWidth(3, gap);
  const cardH = 62;
  const row1Y = layout.y;

  const wealthCards: KpiCard[] = [
    {
      label: "Current path",
      value: formatRothMoneyCompact(data.stayEndingWealth),
      helper: "Ending after-tax wealth without conversion",
    },
    {
      label: "Difference",
      value: formatRothDeltaCompact(data.wealthDelta),
      helper: `${formatRothPct(data.wealthDeltaPct, true)} vs. current path`,
      accent: data.wealthDelta >= 0,
    },
    {
      label: "Roth path",
      value: formatRothMoneyCompact(data.rothEndingWealth),
      helper: "Ending after-tax wealth with conversion",
      accent: true,
    },
  ];
  wealthCards.forEach((card, i) => {
    drawKpiCard(layout, MARGIN_X + i * (cardW + gap), row1Y, cardW, cardH, card);
  });
  layout.y = row1Y - cardH - 18;

  layout.checkNewPage(200);
  layout.y -= 10;
  layout.drawSectionHeading("Where the difference comes from");

  const kpiCards: KpiCard[] = [
    {
      label: "Total wealth delta",
      value: formatRothDeltaCompact(data.wealthDelta),
      helper: formatRothPct(data.wealthDeltaPct, true) + " at end of plan",
    },
    {
      label: "Tax savings",
      value: formatRothDeltaCompact(data.taxSavings),
      helper: "Lifetime federal illustrative tax",
    },
    {
      label: "IRMAA savings",
      value: formatRothDeltaCompact(data.irmaaSavings),
      helper: "Medicare surcharges avoided",
    },
    {
      label: "Heirs legacy delta",
      value: formatRothDeltaCompact(data.heirsLegacyDelta),
      helper: `${data.assumedHeirTaxRatePct}% heir tax vs. Roth tax-free`,
    },
    {
      label: "Income trade-off",
      value: formatRothDeltaCompact(data.afterTaxIncomeDelta),
      helper: "After-tax income kept in-plan",
    },
    {
      label: "Conversion premium",
      value: formatRothMoneyCompact(data.conversionAmountTotal),
      helper: `${data.filingLabel}, ${data.maxBracketPct}% ceiling`,
    },
  ];

  for (let row = 0; row < 2; row++) {
    const rowY = layout.y;
    for (let col = 0; col < 3; col++) {
      drawKpiCard(layout, MARGIN_X + col * (cardW + gap), rowY, cardW, cardH, kpiCards[row * 3 + col]!);
    }
    layout.y = rowY - cardH - 10;
  }

  layout.y -= 4;
  layout.drawPara(REPORT_DISCLAIMER_SHORT, 7, PDF_REPORT_THEME.muted);
}
