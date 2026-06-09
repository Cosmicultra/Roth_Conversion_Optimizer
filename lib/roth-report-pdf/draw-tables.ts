import { PDF_REPORT_THEME, cleanText } from "@/lib/roth-report-pdf/theme";
import { MARGIN_X, type PdfReportLayout } from "@/lib/roth-report-pdf/layout";

function isMoneyCell(cell: string) {
  const t = cleanText(cell);
  return t.startsWith("$") || t === "Total";
}

function fitColWidths(requested: number[], targetWidth: number, colCount: number): number[] {
  const sum = requested.reduce((a, b) => a + b, 0);
  if (sum <= 0) return requested;
  const minCol = colCount >= 10 ? 22 : 26;
  const scaled = requested.map((w) => Math.max(minCol, Math.floor((w / sum) * targetWidth)));
  const drift = targetWidth - scaled.reduce((a, b) => a + b, 0);
  scaled[scaled.length - 1]! += drift;
  return scaled;
}

function truncateToWidth(
  layout: PdfReportLayout,
  text: string,
  maxW: number,
  size: number,
  font = layout.regular
) {
  let t = cleanText(text);
  if (font.widthOfTextAtSize(t, size) <= maxW) return t;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > maxW) {
    t = t.slice(0, -1);
  }
  return `${t}…`;
}

function tableTypography(colCount: number) {
  if (colCount >= 10) return { fs: 7, headerH: 24, rowH: 13.5, gap: 2 };
  return { fs: 7.5, headerH: 24, rowH: 14, gap: 2 };
}

export function drawPaginatedTable(
  layout: PdfReportLayout,
  sectionTitle: string,
  headers: string[],
  rows: string[][],
  colWidths: number[],
  numericFromCol = 2,
  forceNewPage = true
) {
  if (forceNewPage) {
    layout.beginDedicatedPage();
  } else {
    layout.checkNewPage(80);
    layout.sectionGap();
  }
  layout.drawSectionHeading(sectionTitle);

  const x0 = MARGIN_X;
  const fitted = fitColWidths(colWidths, layout.contentWidth, headers.length);
  const tableW = fitted.reduce((a, b) => a + b, 0);
  const { fs, headerH, rowH, gap } = tableTypography(headers.length);

  const drawHeaderRow = () => {
    const headerTop = layout.y;
    const headerBottom = headerTop - headerH;

    layout.page.drawRectangle({
      x: x0,
      y: headerBottom,
      width: tableW,
      height: headerH,
      color: PDF_REPORT_THEME.tableHeaderBg,
    });
    layout.page.drawRectangle({
      x: x0,
      y: headerTop - 2,
      width: tableW,
      height: 2,
      color: PDF_REPORT_THEME.tableHeaderRule,
    });

    const textY = headerBottom + (headerH - fs) / 2 + 1;

    let cx = x0;
    for (let i = 0; i < headers.length; i++) {
      const colW = fitted[i]!;
      const label = truncateToWidth(layout, headers[i]!, colW - 6, fs, layout.bold);

      if (i >= numericFromCol) {
        layout.drawTextRight(cx + colW - 3, textY, label, fs, layout.bold, PDF_REPORT_THEME.tableHeaderText);
      } else {
        layout.page.drawText(label, {
          x: cx + 3,
          y: textY,
          size: fs,
          font: layout.bold,
          color: PDF_REPORT_THEME.tableHeaderText,
        });
      }
      cx += colW;
    }

    layout.y = headerBottom - gap;
  };

  const drawBodyRow = (row: string[], rIdx: number) => {
    const rowTop = layout.y;
    const rowBottom = rowTop - rowH;
    const isTotal = row.some((c) => cleanText(c) === "Total");

    if (isTotal) {
      layout.page.drawRectangle({
        x: x0,
        y: rowBottom,
        width: tableW,
        height: rowH,
        color: PDF_REPORT_THEME.rothSoft,
      });
      layout.page.drawLine({
        start: { x: x0, y: rowTop + 2 },
        end: { x: x0 + tableW, y: rowTop + 2 },
        thickness: 0.8,
        color: PDF_REPORT_THEME.brandBlue,
      });
    } else if (rIdx % 2 === 0) {
      layout.page.drawRectangle({
        x: x0,
        y: rowBottom,
        width: tableW,
        height: rowH,
        color: PDF_REPORT_THEME.zebra,
      });
    }

    const textY = rowBottom + (rowH - fs) / 2 + 1;
    let cx = x0;
    for (let c = 0; c < row.length; c++) {
      const colW = fitted[c]!;
      const cell = truncateToWidth(layout, row[c] ?? "", colW - 6, fs);
      const font = isTotal ? layout.bold : layout.regular;
      if (isMoneyCell(cell) || c >= numericFromCol) {
        layout.drawTextRight(cx + colW - 3, textY, cell, fs, font, PDF_REPORT_THEME.ink);
      } else {
        layout.page.drawText(cell, {
          x: cx + 3,
          y: textY,
          size: fs,
          font,
          color: PDF_REPORT_THEME.ink,
        });
      }
      cx += colW;
    }

    layout.y = rowBottom - gap;
  };

  drawHeaderRow();

  let rIdx = 0;
  for (const row of rows) {
    if (layout.y < layout.contentBottom() + rowH + 10) {
      layout.newPage(true);
      layout.drawSectionHeading(`${sectionTitle} (continued)`);
      drawHeaderRow();
    }
    drawBodyRow(row, rIdx);
    rIdx++;
  }

  layout.y -= 8;
}
