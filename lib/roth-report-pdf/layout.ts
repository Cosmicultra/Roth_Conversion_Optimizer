import {

  PDFDocument,

  type PDFImage,

  type PDFPage,

  type PDFFont,

  type RGB,

} from "pdf-lib";

import { PDF_REPORT_THEME, cleanText, wrapPlainText } from "@/lib/roth-report-pdf/theme";



export const PORTRAIT_W = 612;

export const PORTRAIT_H = 792;

export const MARGIN_X = 36;

export const HEADER_H = 36;

export const FOOTER_H = 28;



export class PdfReportLayout {

  readonly pdfDoc: PDFDocument;

  readonly regular: PDFFont;

  readonly bold: PDFFont;

  readonly logoImage: PDFImage | null;

  readonly clientLabel: string;

  readonly footerLabel: string;



  page: PDFPage;

  pageWidth = PORTRAIT_W;

  pageHeight = PORTRAIT_H;

  y: number;

  pageIndex = 0;



  constructor(opts: {

    pdfDoc: PDFDocument;

    regular: PDFFont;

    bold: PDFFont;

    logoImage: PDFImage | null;

    clientLabel: string;

    footerLabel: string;

  }) {

    this.pdfDoc = opts.pdfDoc;

    this.regular = opts.regular;

    this.bold = opts.bold;

    this.logoImage = opts.logoImage;

    this.clientLabel = opts.clientLabel;

    this.footerLabel = opts.footerLabel;

    this.page = opts.pdfDoc.addPage([PORTRAIT_W, PORTRAIT_H]);

    this.pageIndex = 1;

    this.y = 0;

  }



  get contentWidth() {

    return this.pageWidth - MARGIN_X * 2;

  }



  contentTop(includeHeader: boolean) {

    const chrome = includeHeader ? HEADER_H + 3 : 0;

    return this.pageHeight - chrome - 18;

  }



  contentBottom() {

    return FOOTER_H + 14;

  }



  cardWidth(cols: number, gap = 10) {

    return (this.contentWidth - gap * (cols - 1)) / cols;

  }



  widthOf(s: string, size: number, font: PDFFont = this.regular) {

    return font.widthOfTextAtSize(s, size);

  }



  paintPageChrome(includeHeader: boolean) {

    this.page.drawRectangle({

      x: 0,

      y: 0,

      width: this.pageWidth,

      height: this.pageHeight,

      color: PDF_REPORT_THEME.pageBg,

    });



    this.page.drawRectangle({

      x: 0,

      y: this.pageHeight - 3,

      width: this.pageWidth,

      height: 3,

      color: PDF_REPORT_THEME.accent,

    });



    if (includeHeader) {

      this.page.drawRectangle({

        x: 0,

        y: this.pageHeight - HEADER_H - 3,

        width: this.pageWidth,

        height: HEADER_H,

        color: PDF_REPORT_THEME.headerBg,

      });

      this.page.drawText(cleanText("Roth Option"), {

        x: MARGIN_X,

        y: this.pageHeight - HEADER_H + 14,

        size: 10,

        font: this.bold,

        color: PDF_REPORT_THEME.textOnDark,

      });

      this.page.drawText(cleanText(this.clientLabel), {

        x: MARGIN_X,

        y: this.pageHeight - HEADER_H + 4,

        size: 7.5,

        font: this.regular,

        color: PDF_REPORT_THEME.mutedOnDark,

      });

    }



    this.page.drawLine({

      start: { x: 0, y: FOOTER_H },

      end: { x: this.pageWidth, y: FOOTER_H },

      thickness: 1,

      color: PDF_REPORT_THEME.accentBorder,

    });

    this.page.drawRectangle({

      x: 0,

      y: 0,

      width: this.pageWidth,

      height: FOOTER_H,

      color: PDF_REPORT_THEME.footerBg,

    });

    const footerText = cleanText(`Roth Option  |  ${this.footerLabel}  |  Page ${this.pageIndex}`);

    this.page.drawText(footerText, {

      x: MARGIN_X,

      y: 9,

      size: 7,

      font: this.regular,

      color: PDF_REPORT_THEME.mutedOnDark,

    });

  }



  newPortraitPage(includeHeader = true) {

    this.pageWidth = PORTRAIT_W;

    this.pageHeight = PORTRAIT_H;

    this.page = this.pdfDoc.addPage([PORTRAIT_W, PORTRAIT_H]);

    this.pageIndex += 1;

    this.y = this.contentTop(includeHeader);

    this.paintPageChrome(includeHeader);

  }



  newPage(includeHeader = true) {

    this.newPortraitPage(includeHeader);

  }



  checkNewPage(minY?: number) {

    const floor = minY ?? this.contentBottom() + 16;

    if (this.y < floor) {

      this.newPortraitPage(true);

    }

  }



  /** Breathing room between sections when continuing on the same page. */

  sectionGap(gap = 14) {

    const freshPageY = this.contentTop(true) - 4;

    if (this.y < freshPageY - 40) {

      this.y -= gap;

    }

  }



  /** Page 1: standard header/footer plus report title block. */

  initFirstPage(title: string, subtitle: string, balanceLine: string, dateLine: string) {

    this.paintPageChrome(true);



    const introH = 68;

    const topY = this.contentTop(true) - 4;

    this.drawPanel(MARGIN_X, topY, this.contentWidth, introH, true);



    this.page.drawRectangle({

      x: MARGIN_X,

      y: topY - introH,

      width: 4,

      height: introH,

      color: PDF_REPORT_THEME.accent,

    });



    const textX = MARGIN_X + 14;

    this.page.drawText(cleanText(title), {

      x: textX,

      y: topY - 20,

      size: 15,

      font: this.bold,

      color: PDF_REPORT_THEME.ink,

    });

    this.page.drawText(cleanText(subtitle), {

      x: textX,

      y: topY - 34,

      size: 9,

      font: this.regular,

      color: PDF_REPORT_THEME.muted,

    });

    this.page.drawText(cleanText(balanceLine), {

      x: textX,

      y: topY - 48,

      size: 8,

      font: this.regular,

      color: PDF_REPORT_THEME.muted,

    });

    this.page.drawText(cleanText(dateLine), {

      x: textX,

      y: topY - 60,

      size: 7.5,

      font: this.regular,

      color: PDF_REPORT_THEME.muted,

    });



    if (this.logoImage) {

      const logoW = 42;

      const logoH = 28;

      const logoX = this.pageWidth - MARGIN_X - logoW - 8;

      const logoY = topY - introH + 18;

      this.page.drawRectangle({

        x: logoX - 4,

        y: logoY - 4,

        width: logoW + 8,

        height: logoH + 8,

        color: PDF_REPORT_THEME.white,

        borderColor: PDF_REPORT_THEME.accentBorder,

        borderWidth: 0.5,

      });

      this.page.drawImage(this.logoImage, {

        x: logoX,

        y: logoY,

        width: logoW,

        height: logoH,

      });

    } else {

      this.page.drawText("AdvisorPilot", {

        x: this.pageWidth - MARGIN_X - 88,

        y: topY - introH + 28,

        size: 9,

        font: this.bold,

        color: PDF_REPORT_THEME.accent,

      });

    }



    this.y = topY - introH - 18;

  }



  drawPanel(x: number, topY: number, w: number, h: number, accent = false) {

    this.page.drawRectangle({

      x,

      y: topY - h,

      width: w,

      height: h,

      color: PDF_REPORT_THEME.cardBg,

      borderColor: accent ? PDF_REPORT_THEME.accentBorder : PDF_REPORT_THEME.rule,

      borderWidth: accent ? 0.8 : 0.5,

    });

  }



  drawFigureCaption(caption: string, size = 7) {

    this.page.drawText(cleanText(caption), {

      x: MARGIN_X,

      y: this.y,

      size,

      font: this.bold,

      color: PDF_REPORT_THEME.muted,

    });

    this.y -= 11;

  }



  drawSectionHeading(label: string) {

    this.checkNewPage(88);

    this.page.drawRectangle({

      x: MARGIN_X,

      y: this.y - 2,

      width: 3,

      height: 13,

      color: PDF_REPORT_THEME.accent,

    });

    this.page.drawText(cleanText(label), {

      x: MARGIN_X + 8,

      y: this.y,

      size: 10.5,

      font: this.bold,

      color: PDF_REPORT_THEME.ink,

    });

    this.y -= 18;

    this.page.drawLine({

      start: { x: MARGIN_X, y: this.y + 4 },

      end: { x: this.pageWidth - MARGIN_X, y: this.y + 4 },

      thickness: 0.5,

      color: PDF_REPORT_THEME.rule,

    });

    this.y -= 10;

  }



  drawPara(text: string, size = 8, color: RGB = PDF_REPORT_THEME.ink) {

    const maxW = this.contentWidth;

    const lines = wrapPlainText((t) => this.widthOf(t, size), text, size, maxW);

    for (const line of lines) {

      this.checkNewPage();

      this.page.drawText(line, { x: MARGIN_X, y: this.y, size, font: this.regular, color });

      this.y -= size + 3;

    }

    this.y -= 2;

  }



  drawTitle(text: string, size = 14) {

    this.checkNewPage(72);

    this.page.drawText(cleanText(text), {

      x: MARGIN_X,

      y: this.y,

      size,

      font: this.bold,

      color: PDF_REPORT_THEME.ink,

    });

    this.y -= size + 6;

  }



  drawTextRight(xRight: number, y: number, text: string, size: number, font: PDFFont, color: RGB) {

    const t = cleanText(text);

    const w = font.widthOfTextAtSize(t, size);

    this.page.drawText(t, { x: xRight - w, y, size, font, color });

  }

}


