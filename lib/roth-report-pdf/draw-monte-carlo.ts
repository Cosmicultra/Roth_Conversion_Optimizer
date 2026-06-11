import {
  formatRothMoneyCompact,
  formatRothPct,
} from "@/lib/roth-visual-theme";
import type { RothMonteCarloResult } from "@/lib/roth-monte-carlo";
import { MARGIN_X, type PdfReportLayout } from "@/lib/roth-report-pdf/layout";
import { PDF_REPORT_THEME, cleanText, money, wrapPlainText } from "@/lib/roth-report-pdf/theme";

export function drawMonteCarloSummary(layout: PdfReportLayout, result: RothMonteCarloResult) {
  layout.checkNewPage(220);
  layout.drawFigureCaption("VOLATILITY STRESS TEST (SUPPLEMENTAL)");
  layout.drawTitle("Monte Carlo comparison", 12);
  layout.drawPara(
    "Supplemental stress test only. Fixed-return year-by-year tables in this report remain the primary illustration.",
    7.5,
    PDF_REPORT_THEME.muted
  );

  const rowY = layout.y;
  const colW = layout.cardWidth(2, 12);
  const cardH = 58;

  const cards = [
    {
      label: "Roth wins",
      value: formatRothPct(result.rothWinPct),
      helper: `${result.simulationCount.toLocaleString()} randomized paths`,
    },
    {
      label: "Stay-traditional wins",
      value: formatRothPct(result.stayWinPct),
      helper: "Volatile market on current allocation",
    },
    {
      label: "Median wealth delta",
      value: formatRothMoneyCompact(result.medianWealthDelta),
      helper: "Roth median minus stay-traditional",
    },
    {
      label: "Median ending wealth",
      value: `${formatRothMoneyCompact(result.rothEndingMedian)} vs ${formatRothMoneyCompact(result.stayEndingMedian)}`,
      helper: "At modeled horizon",
    },
  ];

  for (let i = 0; i < cards.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN_X + col * (colW + 12);
    const y = rowY - row * (cardH + 10);
    const card = cards[i]!;
    layout.drawPanel(x, y, colW, cardH);
    layout.page.drawText(cleanText(card.label), {
      x: x + 10,
      y: y - 14,
      size: 6.5,
      font: layout.regular,
      color: PDF_REPORT_THEME.muted,
    });
    layout.page.drawText(cleanText(card.value), {
      x: x + 10,
      y: y - 30,
      size: 10,
      font: layout.bold,
      color: PDF_REPORT_THEME.ink,
    });
    layout.page.drawText(cleanText(card.helper), {
      x: x + 10,
      y: y - 44,
      size: 6.5,
      font: layout.regular,
      color: PDF_REPORT_THEME.muted,
    });
  }

  layout.y = rowY - 2 * (cardH + 10) - 16;

  const headers = ["Path", "Down markets", "Typical markets", "Up markets"];
  const widths = [120, 90, 90, 90];
  const rows = [
    [
      "Current allocation",
      money(result.stayEndingP10),
      money(result.stayEndingP50),
      money(result.stayEndingP90),
    ],
    ["Roth conversion", money(result.rothEndingP10), money(result.rothEndingP50), money(result.rothEndingP90)],
  ];

  layout.drawFigureCaption("ENDING WEALTH PERCENTILES");
  let tableY = layout.y;
  const rowH = 18;
  for (let c = 0; c < headers.length; c++) {
    layout.page.drawText(cleanText(headers[c]!), {
      x: MARGIN_X + widths.slice(0, c).reduce((s, w) => s + w, 0),
      y: tableY,
      size: 7,
      font: layout.bold,
      color: PDF_REPORT_THEME.ink,
    });
  }
  tableY -= rowH;
  for (const row of rows) {
    let cx = MARGIN_X;
    for (let c = 0; c < row.length; c++) {
      layout.page.drawText(cleanText(row[c]!), {
        x: cx,
        y: tableY,
        size: 7,
        font: layout.regular,
        color: PDF_REPORT_THEME.ink,
      });
      cx += widths[c]!;
    }
    tableY -= rowH;
  }
  layout.y = tableY - 8;

  const footnote = [
    result.disclaimer,
    `Assumptions: index mean ${(result.config.indexMeanAnnual * 100).toFixed(1)}%/yr, volatility ${(result.config.indexVolAnnual * 100).toFixed(1)}%/yr.`,
    `Median stay-traditional years with negative returns: ${result.stayNegativeReturnYearsMedian.toFixed(0)}; median FIC 0%-credit years: ${result.ficZeroCreditYearsMedian.toFixed(0)}.`,
  ].join(" ");

  const lines = wrapPlainText((t) => layout.widthOf(t, 6.5), footnote, 6.5, layout.contentWidth);
  for (const ln of lines) {
    layout.checkNewPage();
    layout.page.drawText(cleanText(ln), {
      x: MARGIN_X,
      y: layout.y,
      size: 6.5,
      font: layout.regular,
      color: PDF_REPORT_THEME.muted,
    });
    layout.y -= 9;
  }
}
