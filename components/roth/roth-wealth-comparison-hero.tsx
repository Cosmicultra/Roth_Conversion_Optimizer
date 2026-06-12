"use client";

import { useMemo } from "react";
import type { RothComparisonVisualData } from "@/lib/roth-comparison-visuals";
import { buildWealthComparisonScale } from "@/lib/roth-wealth-comparison-scale";
import {
  formatRothDeltaCompact,
  formatRothMoneyCompact,
  formatRothPct,
  ROTH_VISUAL_COLORS,
} from "@/lib/roth-visual-theme";
import { cn } from "@/lib/utils";

type RothWealthComparisonHeroProps = {
  data: RothComparisonVisualData;
  clientName?: string;
  className?: string;
};

function deltaValueClass(tone: "positive" | "negative" | "neutral"): string {
  if (tone === "positive") return "text-[#fbbf24]";
  if (tone === "negative") return "text-[#f87171]";
  return "text-[#e2e8f0]";
}

function CombinedScaleBar({
  stayBarWidthPct,
  rothBarWidthPct,
  deltaTone,
}: {
  stayBarWidthPct: number;
  rothBarWidthPct: number;
  deltaTone: "positive" | "negative" | "neutral";
}) {
  const stayEnd = Math.min(100, Math.max(0, stayBarWidthPct));
  const rothEnd = Math.min(100, Math.max(0, rothBarWidthPct));
  const gainStart = Math.min(stayEnd, rothEnd);
  const gainEnd = Math.max(stayEnd, rothEnd);
  const gainColor =
    deltaTone === "positive"
      ? ROTH_VISUAL_COLORS.roth
      : deltaTone === "negative"
        ? ROTH_VISUAL_COLORS.taxes
        : ROTH_VISUAL_COLORS.stay;

  return (
    <div className="relative h-2 w-full overflow-hidden rounded-sm bg-[#1a1a24]" aria-hidden>
      {stayEnd > 0 ? (
        <div
          className="absolute inset-y-0 left-0 rounded-sm"
          style={{ width: `${stayEnd}%`, backgroundColor: ROTH_VISUAL_COLORS.stay }}
        />
      ) : null}
      {gainEnd > gainStart ? (
        <div
          className="absolute inset-y-0 rounded-sm"
          style={{
            left: `${gainStart}%`,
            width: `${gainEnd - gainStart}%`,
            backgroundColor: gainColor,
          }}
        />
      ) : null}
    </div>
  );
}

export function RothWealthComparisonHero({ data, clientName, className }: RothWealthComparisonHeroProps) {
  const scale = useMemo(() => buildWealthComparisonScale(data), [data]);

  const headline = clientName ?? "After-tax wealth at plan end";

  const ariaLabel = `Plan delta ${formatRothDeltaCompact(scale.wealthDelta)} (${formatRothPct(scale.wealthDeltaPct, true)}). Traditional path ${formatRothMoneyCompact(scale.stayEndingWealth)}. Roth conversion path ${formatRothMoneyCompact(scale.rothEndingWealth)}.`;

  return (
    <div
      className={cn("rounded-none border border-[#1e1e2e] bg-[#14141d] p-4 md:p-5", className)}
      aria-labelledby="roth-lifetime-heading"
    >
      <p className="ap-eyebrow">After-tax wealth at plan end</p>
      <h3 id="roth-lifetime-heading" className="mt-2 font-serif text-xl font-semibold text-[#e2e8f0] md:text-2xl">
        {headline}
      </h3>
      <p className="mt-2 text-sm text-[#64748b]">
        At the end of the modeled horizon, the Roth conversion path leaves{" "}
        {data.wealthDelta >= 0 ? "more" : "less"} after-tax wealth than staying in traditional IRAs.
      </p>

      <div
        className="mt-5 rounded-none border border-[#1e3a5f] bg-[#0c1520] px-4 py-4 text-center"
        role="img"
        aria-label={ariaLabel}
      >
        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--ap-cyan)]">Plan delta</p>
        <p
          className={cn(
            "mt-1 font-serif text-3xl font-bold tabular-nums md:text-4xl",
            deltaValueClass(scale.deltaTone),
          )}
        >
          {formatRothDeltaCompact(scale.wealthDelta)}
        </p>
        <p className={cn("mt-0.5 text-sm tabular-nums", deltaValueClass(scale.deltaTone))}>
          {formatRothPct(scale.wealthDeltaPct, true)}
        </p>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm">
          <span className="text-[#64748b]">Traditional</span>
          <span className="font-serif font-bold tabular-nums text-[#e2e8f0]">
            {formatRothMoneyCompact(scale.stayEndingWealth)}
          </span>
          <span className="text-[#475569]" aria-hidden>
            →
          </span>
          <span className="text-[#64748b]">Roth</span>
          <span className="font-serif font-bold tabular-nums text-[#fbbf24]">
            {formatRothMoneyCompact(scale.rothEndingWealth)}
          </span>
        </div>
        <CombinedScaleBar
          stayBarWidthPct={scale.stayBarWidthPct}
          rothBarWidthPct={scale.rothBarWidthPct}
          deltaTone={scale.deltaTone}
        />
      </div>

      <p className="mt-3 text-xs text-[#475569]">End-of-plan after-tax wealth · illustrative only</p>
    </div>
  );
}
