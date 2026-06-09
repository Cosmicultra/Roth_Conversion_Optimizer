import { rgb, type RGB } from "pdf-lib";
import { ROTH_VISUAL_COLORS } from "@/lib/roth-visual-theme";

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

/** PDF palette — app elevated surfaces (#14141d) + readable text on light backgrounds. */
export const PDF_REPORT_THEME = {
  headerBg: hexToRgb("#14141d"),
  footerBg: hexToRgb("#101017"),
  heroBg: hexToRgb("#14141d"),
  surface: hexToRgb("#1a1a24"),
  accent: hexToRgb(ROTH_VISUAL_COLORS.accent),
  accentBorder: hexToRgb("#3a3115"),
  pageBg: hexToRgb("#f8fafc"),
  cardBg: hexToRgb("#ffffff"),
  ink: hexToRgb("#1e293b"),
  muted: hexToRgb(ROTH_VISUAL_COLORS.muted),
  textOnDark: hexToRgb("#e2e8f0"),
  mutedOnDark: hexToRgb("#94a3b8"),
  /** Readable on white — never use amber for body/value text. */
  brandBlue: hexToRgb("#1d4ed8"),
  brandBlueDark: hexToRgb("#1e3a8a"),
  rule: hexToRgb("#e2e8f0"),
  ruleStrong: hexToRgb("#cbd5e1"),
  zebra: hexToRgb("#f1f5f9"),
  stay: hexToRgb(ROTH_VISUAL_COLORS.stay),
  staySoft: hexToRgb("#e2e8f0"),
  /** Amber fills for chart segments only. */
  rothFill: hexToRgb(ROTH_VISUAL_COLORS.roth),
  rothSoft: hexToRgb("#eff6ff"),
  /** Blue text for Roth / positive values on light backgrounds. */
  roth: hexToRgb("#1d4ed8"),
  positive: hexToRgb("#1d4ed8"),
  negative: hexToRgb(ROTH_VISUAL_COLORS.taxes),
  heirs: hexToRgb(ROTH_VISUAL_COLORS.heirs),
  income: hexToRgb(ROTH_VISUAL_COLORS.income),
  taxes: hexToRgb(ROTH_VISUAL_COLORS.taxes),
  taxesLight: hexToRgb("#fee2e2"),
  convertZone: hexToRgb(ROTH_VISUAL_COLORS.convertZone),
  avoidZone: hexToRgb(ROTH_VISUAL_COLORS.avoidZone),
  avoidZoneLight: hexToRgb("#fee2e2"),
  tableHeaderBg: hexToRgb("#14141d"),
  tableHeaderText: hexToRgb("#e2e8f0"),
  tableHeaderRule: hexToRgb(ROTH_VISUAL_COLORS.accent),
  white: rgb(1, 1, 1),
  onFillDark: hexToRgb("#0c0c0f"),
} as const;

export const AWA_BRAND_NAME = "Assured Wealth Advisors";

export const DISCLOSURE_FONT = {
  title: 20,
  section: 8.5,
  body: 6,
  lineGap: 8,
} as const;

export function cleanText(value: unknown) {
  return String(value || "")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function money(n: number) {
  return (
    "$" +
    n.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })
  );
}

export function wrapPlainText(
  lineMeasurer: (s: string) => number,
  text: string,
  size: number,
  maxW: number
): string[] {
  const words = cleanText(text).split(" ");
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    const trial = line ? `${line} ${w}` : w;
    if (lineMeasurer(trial) > maxW) {
      if (line) out.push(line);
      line = w;
    } else {
      line = trial;
    }
  }
  if (line) out.push(line);
  return out;
}

export const ROTH_REPORT_SCOPE_DISCLOSURE =
  "This report compares an illustrative current-allocation path with a modeled Roth conversion path. Assumptions, inputs, limitations, and other disclosures follow below.";

export const REPORT_DISCLAIMER_SHORT =
  "Hypothetical illustration only — not tax, legal, investment, or Medicare advice. Values update with worksheet inputs; confirm material facts with counsel and an independent CPA before recommending transactions.";
