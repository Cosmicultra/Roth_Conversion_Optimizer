import { rgb, type RGB } from "pdf-lib";
import { ROTH_VISUAL_COLORS } from "@/lib/roth-visual-theme";

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

export const PDF_REPORT_THEME = {
  headerBg: hexToRgb("#101017"),
  footerBg: hexToRgb("#0c0c0f"),
  accent: hexToRgb(ROTH_VISUAL_COLORS.roth),
  accentBorder: hexToRgb("#3a3115"),
  pageBg: hexToRgb("#f8fafc"),
  cardBg: hexToRgb("#ffffff"),
  ink: hexToRgb("#1e293b"),
  muted: hexToRgb(ROTH_VISUAL_COLORS.muted),
  textOnDark: hexToRgb("#e2e8f0"),
  mutedOnDark: hexToRgb("#94a3b8"),
  rule: hexToRgb("#e2e8f0"),
  ruleStrong: hexToRgb("#1e1e2e"),
  zebra: hexToRgb("#f1f5f9"),
  stay: hexToRgb(ROTH_VISUAL_COLORS.stay),
  staySoft: hexToRgb("#e2e8f0"),
  roth: hexToRgb(ROTH_VISUAL_COLORS.roth),
  rothSoft: hexToRgb("#fef3c7"),
  heirs: hexToRgb(ROTH_VISUAL_COLORS.heirs),
  income: hexToRgb(ROTH_VISUAL_COLORS.income),
  taxes: hexToRgb(ROTH_VISUAL_COLORS.taxes),
  convertZone: hexToRgb(ROTH_VISUAL_COLORS.convertZone),
  avoidZone: hexToRgb(ROTH_VISUAL_COLORS.avoidZone),
  avoidZoneLight: hexToRgb("#fee2e2"),
  tableHeaderBg: hexToRgb("#101017"),
  tableHeaderText: hexToRgb("#e2e8f0"),
  white: rgb(1, 1, 1),
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

export const PAIRED_BAR_INTRO_TEXT =
  "Paired bars use a common scale within each metric (longer bar equals larger modeled value). Illustrative only — not predictive of actual taxes, Medicare surcharges, or investment returns. Current path legacy applies an assumed default beneficiary ordinary income tax on death; Roth legacy is illustrated tax-free to heirs (not estate tax).";

export const ROTH_REPORT_SCOPE_DISCLOSURE =
  "This report compares an illustrative current-allocation path with a modeled Roth conversion path. Assumptions, inputs, limitations, and other disclosures follow below.";

export const REPORT_DISCLAIMER_SHORT =
  "Hypothetical illustration only — not tax, legal, investment, or Medicare advice. Values update with worksheet inputs; confirm material facts with counsel and an independent CPA before recommending transactions.";
