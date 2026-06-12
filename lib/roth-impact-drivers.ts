import type { RothComparisonVisualData } from "@/lib/roth-comparison-visuals";
import { formatRothDeltaCompact } from "@/lib/roth-visual-theme";

export type ImpactDriverTone = "positive" | "negative" | "neutral";

export type ImpactDriver = {
  id: string;
  label: string;
  rawValue: number;
  valueFormatted: string;
  helper: string;
  tone: ImpactDriverTone;
};

export function deltaTone(n: number): ImpactDriverTone {
  if (n > 500) return "positive";
  if (n < -500) return "negative";
  return "neutral";
}

/**
 * Builds illustrative drivers of the plan delta (excludes total wealth — shown in hero).
 * Sorted by |impact| descending.
 */
export function buildImpactDrivers(data: RothComparisonVisualData): ImpactDriver[] {
  const drivers: ImpactDriver[] = [
    {
      id: "tax",
      label: "Tax savings",
      rawValue: data.taxSavings,
      valueFormatted: formatRothDeltaCompact(data.taxSavings),
      helper: "Federal illustrative tax avoided over the modeled lifetime",
      tone: deltaTone(data.taxSavings),
    },
    {
      id: "irmaa",
      label: "IRMAA change",
      rawValue: data.irmaaSavings,
      valueFormatted: formatRothDeltaCompact(data.irmaaSavings),
      helper: "Medicare IRMAA surcharges avoided (illustrative)",
      tone: deltaTone(data.irmaaSavings),
    },
    {
      id: "heirs",
      label: "Heir inheritance change",
      rawValue: data.heirsLegacyDelta,
      valueFormatted: formatRothDeltaCompact(data.heirsLegacyDelta),
      helper: `Current path net after ${data.assumedHeirTaxRatePct}% assumed heir tax vs. Roth tax-free to heirs`,
      tone: deltaTone(data.heirsLegacyDelta),
    },
    {
      id: "income",
      label: "Income kept during the plan",
      rawValue: data.afterTaxIncomeDelta,
      valueFormatted: formatRothDeltaCompact(data.afterTaxIncomeDelta),
      helper: "After-tax income retained during the plan. A lower number can mean more went to heirs.",
      tone: deltaTone(data.afterTaxIncomeDelta),
    },
  ];

  return drivers.sort((a, b) => Math.abs(b.rawValue) - Math.abs(a.rawValue));
}

export function impactDriverAccentColor(tone: ImpactDriverTone): string {
  if (tone === "positive") return "#fbbf24";
  if (tone === "negative") return "#f87171";
  return "#64748b";
}
