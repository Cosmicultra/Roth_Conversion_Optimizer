import type { RothComparisonVisualData } from "@/lib/roth-comparison-visuals";
import { deltaTone, type ImpactDriverTone } from "@/lib/roth-impact-drivers";

export type WealthComparisonScale = {
  stayEndingWealth: number;
  rothEndingWealth: number;
  wealthDelta: number;
  wealthDeltaPct: number;
  scaleMax: number;
  stayBarWidthPct: number;
  rothBarWidthPct: number;
  deltaTone: ImpactDriverTone;
};

function barWidthPct(value: number, scaleMax: number): number {
  if (scaleMax <= 0) return 0;
  const pct = (Math.max(0, value) / scaleMax) * 100;
  return Math.round(Math.min(100, pct) * 10) / 10;
}

export function buildWealthComparisonScale(data: RothComparisonVisualData): WealthComparisonScale {
  const scaleMax = Math.max(data.stayEndingWealth, data.rothEndingWealth, 1);

  return {
    stayEndingWealth: data.stayEndingWealth,
    rothEndingWealth: data.rothEndingWealth,
    wealthDelta: data.wealthDelta,
    wealthDeltaPct: data.wealthDeltaPct,
    scaleMax,
    stayBarWidthPct: barWidthPct(data.stayEndingWealth, scaleMax),
    rothBarWidthPct: barWidthPct(data.rothEndingWealth, scaleMax),
    deltaTone: deltaTone(data.wealthDelta),
  };
}
