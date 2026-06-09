import { PDF_REPORT_THEME, cleanText } from "@/lib/roth-report-pdf/theme";

import { MARGIN_X, type PdfReportLayout } from "@/lib/roth-report-pdf/layout";



function isMoneyCell(cell: string) {

  const t = cleanText(cell);

  return t.startsWith("$") || t === "Total";

}



function fitColWidths(requested: number[], targetWidth: number): number[] {

  const sum = requested.reduce((a, b) => a + b, 0);

  if (sum <= 0) return requested;

  const scaled = requested.map((w) => Math.max(22, Math.floor((w / sum) * targetWidth)));

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



export function drawPaginatedTable(

  layout: PdfReportLayout,

  sectionTitle: string,

  headers: string[],

  rows: string[][],

  colWidths: number[]

) {

  layout.checkNewPage(100);

  layout.sectionGap();

  layout.drawSectionHeading(sectionTitle);



  const x0 = MARGIN_X;

  const fitted = fitColWidths(colWidths, layout.contentWidth);

  const tableW = fitted.reduce((a, b) => a + b, 0);

  const fs = fitted.length >= 10 ? 6 : 6.5;

  const rowH = 11;



  const drawHeaderRow = () => {

    const headerBandH = 18;

    const bandBottom = layout.y - headerBandH;

    layout.page.drawRectangle({

      x: x0,

      y: bandBottom,

      width: tableW,

      height: headerBandH,

      color: PDF_REPORT_THEME.tableHeaderBg,

    });

    layout.page.drawRectangle({

      x: x0,

      y: bandBottom,

      width: tableW,

      height: 2,

      color: PDF_REPORT_THEME.accent,

    });

    let cx = x0;

    for (let i = 0; i < headers.length; i++) {

      const colW = fitted[i]!;

      const label = truncateToWidth(layout, headers[i]!, colW - 6, fs, layout.bold);

      layout.page.drawText(label, {

        x: cx + 3,

        y: layout.y - 2,

        size: fs,

        font: layout.bold,

        color: PDF_REPORT_THEME.tableHeaderText,

      });

      cx += colW;

    }

    layout.y -= headerBandH;

  };



  drawHeaderRow();



  let rIdx = 0;

  for (const row of rows) {

    if (layout.y < layout.contentBottom() + rowH + 8) {

      layout.newPage(true);

      layout.drawSectionHeading(`${sectionTitle} (continued)`);

      drawHeaderRow();

    }



    const isTotal = row.some((c) => cleanText(c) === "Total");

    if (rIdx % 2 === 0 && !isTotal) {

      layout.page.drawRectangle({

        x: x0,

        y: layout.y - rowH + 8,

        width: tableW,

        height: rowH + 1,

        color: PDF_REPORT_THEME.zebra,

      });

    }



    let cx = x0;

    for (let c = 0; c < row.length; c++) {

      const colW = fitted[c]!;

      const cell = truncateToWidth(layout, row[c] ?? "", colW - 6, fs);

      const font = isTotal ? layout.bold : layout.regular;

      if (isMoneyCell(cell) || c >= 2) {

        layout.drawTextRight(cx + colW - 3, layout.y, cell, fs, font, PDF_REPORT_THEME.ink);

      } else {

        layout.page.drawText(cell, {

          x: cx + 3,

          y: layout.y,

          size: fs,

          font,

          color: PDF_REPORT_THEME.ink,

        });

      }

      cx += colW;

    }

    rIdx++;

    layout.y -= rowH;

  }



  layout.y -= 10;

}


