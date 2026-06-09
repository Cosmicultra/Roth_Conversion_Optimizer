import fs from "fs/promises";
import path from "path";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import type { PDFDocument, PDFImage } from "pdf-lib";

/** Matches PDF_REPORT_THEME.headerBg / heroBg (#14141d). */
const HEADER_BG = { r: 0x14, g: 0x14, b: 0x1d };

function isPng(bytes: Uint8Array) {
  return bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
}

function isJpeg(bytes: Uint8Array) {
  return bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

function isNearHeaderBlack(r: number, g: number, b: number) {
  return r < 52 && g < 52 && b < 60;
}

function recolorLogoForHeader(source: Uint8Array): Uint8Array | null {
  try {
    let width = 0;
    let height = 0;
    let rgba: Uint8Array;

    if (isJpeg(source)) {
      const decoded = jpeg.decode(source, { useTArray: true });
      width = decoded.width;
      height = decoded.height;
      rgba = decoded.data;
    } else if (isPng(source)) {
      const decoded = PNG.sync.read(Buffer.from(source));
      width = decoded.width;
      height = decoded.height;
      rgba = new Uint8Array(decoded.data);
    } else {
      return null;
    }

    for (let i = 0; i < rgba.length; i += 4) {
      const r = rgba[i]!;
      const g = rgba[i + 1]!;
      const b = rgba[i + 2]!;
      if (isNearHeaderBlack(r, g, b)) {
        rgba[i] = HEADER_BG.r;
        rgba[i + 1] = HEADER_BG.g;
        rgba[i + 2] = HEADER_BG.b;
        rgba[i + 3] = 255;
      }
    }

    const png = new PNG({ width, height });
    png.data = Buffer.from(rgba);
    return PNG.sync.write(png);
  } catch {
    return null;
  }
}

async function readFirstExisting(paths: string[]) {
  for (const filePath of paths) {
    try {
      return await fs.readFile(filePath);
    } catch {
      continue;
    }
  }
  return null;
}

/** Embeds the AWA logo with header-matched background for page 1. */
export async function embedAwaReportLogo(pdfDoc: PDFDocument): Promise<PDFImage | null> {
  const logoPaths = [
    path.join(process.cwd(), "lib", "roth-report-pdf", "assets", "awa-logo.jpg"),
    path.join(process.cwd(), "lib", "roth-report-pdf", "assets", "awa-logo.png"),
    path.join(process.cwd(), "public", "awa-logo.jpg"),
    path.join(process.cwd(), "public", "awa-logo.png"),
  ];

  const bytes = await readFirstExisting(logoPaths);
  if (!bytes) return null;

  const recolored = recolorLogoForHeader(bytes);
  if (recolored) {
    try {
      return await pdfDoc.embedPng(recolored);
    } catch {
      // fall through to direct embed
    }
  }

  try {
    if (isPng(bytes)) return await pdfDoc.embedPng(bytes);
    if (isJpeg(bytes)) return await pdfDoc.embedJpg(bytes);
  } catch {
    return null;
  }

  return null;
}

