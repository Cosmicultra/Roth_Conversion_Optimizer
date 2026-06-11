import {
  PDFDocument,
  type PDFImage,
  type PDFPage,
  type PDFFont,
  type RGB,
} from "pdf-lib";
import { AWA_BRAND_NAME, PDF_REPORT_THEME, cleanText, wrapPlainText } from "@/lib/roth-report-pdf/theme";

export const PORTRAIT_W = 612;
export const PORTRAIT_H = 792;
export const MARGIN_X = 36;
export const HEADER_H = 32;
export const FOOTER_H = 28;
export const HERO_H = 72;
/** Taller page-1 header strip so the AWA logo can render larger. */
export const COVER_HEADER_H = 42;
export const COVER_LOGO_RIGHT_ZONE_W = 250;
export const COVER_H = COVER_HEADER_H + HERO_H;

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
    return this.pageHeight - chrome - 14;
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

  logoDimensions(maxH: number) {
    if (!this.logoImage) return null;
    const logoH = maxH;
    const aspect = this.logoImage.width / this.logoImage.height;
    return { w: logoH * aspect, h: logoH };
  }

  /** Page 1 only — logo centered vertically in the cover band, right-aligned zone. */
  drawCoverPageLogo(coverBandTop: number) {
    if (!this.logoImage) return;

    const coverBottom = coverBandTop - COVER_H;
    const logoH = (COVER_HEADER_H - 4) * 3;
    const dims = this.logoDimensions(logoH);
    if (!dims) return;

    const zoneLeft = this.pageWidth - MARGIN_X - COVER_LOGO_RIGHT_ZONE_W;
    const x = zoneLeft + (COVER_LOGO_RIGHT_ZONE_W - dims.w) / 2;
    const y = coverBottom + (COVER_H - dims.h) / 2;

    this.page.drawImage(this.logoImage, {
      x,
      y,
      width: dims.w,
      height: dims.h,
    });
  }

  paintFooter() {
    this.page.drawLine({
      start: { x: 0, y: FOOTER_H },
      end: { x: this.pageWidth, y: FOOTER_H },
      thickness: 1,
      color: PDF_REPORT_THEME.surface,
    });
    this.page.drawRectangle({
      x: 0,
      y: 0,
      width: this.pageWidth,
      height: FOOTER_H,
      color: PDF_REPORT_THEME.footerBg,
    });
    const footerText = cleanText(`${AWA_BRAND_NAME}  |  ${this.footerLabel}  |  Page ${this.pageIndex}`);
    this.page.drawText(footerText, {
      x: MARGIN_X,
      y: 9,
      size: 7,
      font: this.regular,
      color: PDF_REPORT_THEME.mutedOnDark,
    });
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
      const headerTop = this.pageHeight - 3;
      const headerBottom = headerTop - HEADER_H;
      this.page.drawRectangle({
        x: 0,
        y: headerBottom,
        width: this.pageWidth,
        height: HEADER_H,
        color: PDF_REPORT_THEME.headerBg,
      });

      const headerTextY = headerBottom + 11;

      this.page.drawText(cleanText(AWA_BRAND_NAME), {
        x: MARGIN_X,
        y: headerTextY,
        size: 8,
        font: this.bold,
        color: PDF_REPORT_THEME.textOnDark,
      });
      const clientW = this.widthOf(this.clientLabel, 7);
      this.page.drawText(cleanText(this.clientLabel), {
        x: this.pageWidth - MARGIN_X - clientW,
        y: headerTextY,
        size: 7,
        font: this.regular,
        color: PDF_REPORT_THEME.mutedOnDark,
      });
    }

    this.paintFooter();
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

  beginDedicatedPage() {
    this.newPage(true);
    this.y = this.contentTop(true) - 4;
  }

  beginDisclosuresPage() {
    this.newPage(true);
    this.y = this.contentTop(true) - 4;
  }

  sectionGap(gap = 14) {
    const freshPageY = this.contentTop(true) - 4;
    if (this.y < freshPageY - 40) {
      this.y -= gap;
    }
  }

  /** Page 1: seamless cover band (no gap between header and hero). */
  initFirstPage(title: string, subtitle: string, balanceLine: string, dateLine: string) {
    this.page.drawRectangle({
      x: 0,
      y: 0,
      width: this.pageWidth,
      height: this.pageHeight,
      color: PDF_REPORT_THEME.pageBg,
    });

    const coverTop = this.pageHeight - 3;
    const coverBottom = coverTop - COVER_H;

    this.page.drawRectangle({
      x: 0,
      y: coverTop - 3,
      width: this.pageWidth,
      height: 3,
      color: PDF_REPORT_THEME.accent,
    });
    this.page.drawRectangle({
      x: 0,
      y: coverBottom,
      width: this.pageWidth,
      height: COVER_H,
      color: PDF_REPORT_THEME.heroBg,
    });
    this.page.drawRectangle({
      x: 0,
      y: coverBottom,
      width: 4,
      height: COVER_H,
      color: PDF_REPORT_THEME.accent,
    });

    const textX = MARGIN_X + 12;
    const titleSize = 21;
    const subtitleSize = 9.5;
    const metaSize = 8;
    const dateSize = 7.5;
    const titleGap = 14;
    const metaGap = 11;
    const textBlockH =
      titleSize + titleGap + subtitleSize + metaGap + metaSize + metaGap + dateSize;
    const textBlockBottom = coverBottom + (COVER_H - textBlockH) / 2;

    this.drawCoverPageLogo(coverTop);

    this.page.drawText(cleanText(title), {
      x: textX,
      y: textBlockBottom + dateSize + metaGap + metaSize + metaGap + subtitleSize + titleGap,
      size: titleSize,
      font: this.bold,
      color: PDF_REPORT_THEME.textOnDark,
    });
    this.page.drawText(cleanText(subtitle), {
      x: textX,
      y: textBlockBottom + dateSize + metaGap + metaSize + metaGap,
      size: subtitleSize,
      font: this.regular,
      color: PDF_REPORT_THEME.mutedOnDark,
    });
    this.page.drawText(cleanText(balanceLine), {
      x: textX,
      y: textBlockBottom + dateSize + metaGap,
      size: metaSize,
      font: this.regular,
      color: PDF_REPORT_THEME.mutedOnDark,
    });
    this.page.drawText(cleanText(dateLine), {
      x: textX,
      y: textBlockBottom,
      size: dateSize,
      font: this.regular,
      color: PDF_REPORT_THEME.mutedOnDark,
    });

    this.paintFooter();
    this.y = coverBottom - 16;
  }

  drawPanel(x: number, topY: number, w: number, h: number, accent = false) {
    this.page.drawRectangle({
      x,
      y: topY - h,
      width: w,
      height: h,
      color: PDF_REPORT_THEME.cardBg,
      borderColor: accent ? PDF_REPORT_THEME.brandBlue : PDF_REPORT_THEME.rule,
      borderWidth: accent ? 0.7 : 0.5,
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
    this.y -= 12;
  }

  drawSectionHeading(label: string, size = 10.5) {
    this.checkNewPage(88);
    this.page.drawRectangle({
      x: MARGIN_X,
      y: this.y - 2,
      width: 3,
      height: 14,
      color: PDF_REPORT_THEME.accent,
    });
    this.page.drawText(cleanText(label), {
      x: MARGIN_X + 10,
      y: this.y,
      size,
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
    this.y -= 4;
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
    this.y -= size + 8;
  }

  drawTextRight(xRight: number, y: number, text: string, size: number, font: PDFFont, color: RGB) {
    const t = cleanText(text);
    const w = font.widthOfTextAtSize(t, size);
    this.page.drawText(t, { x: xRight - w, y, size, font, color });
  }
}
