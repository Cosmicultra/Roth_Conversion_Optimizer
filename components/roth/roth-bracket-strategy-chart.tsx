"use client";

import { useId, useState } from "react";
import type { RothComparisonVisualData } from "@/lib/roth-comparison-visuals";
import { bracketZoneDescription } from "@/lib/roth-chart-segment-copy";
import { RothChartSegmentPanel, type ChartSegmentDetail } from "@/components/roth/roth-chart-segment-panel";
import {
  formatEffectiveRate,
  formatRothMoneyFull,
  ROTH_VISUAL_COLORS,
} from "@/lib/roth-visual-theme";
import { cn } from "@/lib/utils";

type RothBracketStrategyChartProps = {
  data: RothComparisonVisualData;
  className?: string;
};

type BracketZone = "convert" | "ceiling" | "avoid";

const BRACKET_ORDER = [10, 12, 22, 24, 32, 35, 37] as const;

function nextBracketPct(current: number): number | null {
  const idx = BRACKET_ORDER.indexOf(current as (typeof BRACKET_ORDER)[number]);
  if (idx < 0 || idx >= BRACKET_ORDER.length - 1) return null;
  return BRACKET_ORDER[idx + 1]!;
}

function targetBracketIndex(maxBracketPct: number): number {
  const idx = BRACKET_ORDER.indexOf(maxBracketPct as (typeof BRACKET_ORDER)[number]);
  return idx >= 0 ? idx : BRACKET_ORDER.length - 1;
}

const ZONE_META: Record<BracketZone, { title: string; accent: string }> = {
  convert: { title: "Target bracket band", accent: ROTH_VISUAL_COLORS.convertZone },
  ceiling: { title: "Income cap", accent: ROTH_VISUAL_COLORS.stopLine },
  avoid: { title: "Higher bracket bands", accent: ROTH_VISUAL_COLORS.avoidZone },
};

function zoneDetail(zone: BracketZone, data: RothComparisonVisualData): ChartSegmentDetail {
  const meta = ZONE_META[zone];
  return {
    key: zone,
    title: meta.title,
    value: zone === "ceiling" ? formatRothMoneyFull(data.grossIncomeCeiling) : undefined,
    description: bracketZoneDescription(zone, data),
    color: meta.accent,
  };
}

function ExplainerCard({
  title,
  body,
  accent,
  active,
  onHover,
}: {
  title: string;
  body: string;
  accent: string;
  active: boolean;
  onHover: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-none border bg-[#14141d] p-3 transition-colors",
        active ? "border-[#2a2a38] bg-[#1a1a24] ring-1 ring-[#2a2a38]" : "border-[#1e1e2e]",
      )}
      onMouseEnter={onHover}
    >
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
        <span className="inline-block h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: accent }} />
        {title}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-[#64748b]">{body}</p>
    </div>
  );
}

export function RothBracketStrategyChart({ data, className }: RothBracketStrategyChartProps) {
  const panelId = useId();
  const [activeZone, setActiveZone] = useState<BracketZone | null>(null);

  const nextBracket = nextBracketPct(data.maxBracketPct);
  const targetIdx = targetBracketIndex(data.maxBracketPct);
  const capMarkerPct = ((targetIdx + 1) / BRACKET_ORDER.length) * 100;

  const bindZone = (zone: BracketZone) => ({
    onMouseEnter: () => setActiveZone(zone),
    onMouseLeave: () => setActiveZone((current) => (current === zone ? null : current)),
    onFocus: () => setActiveZone(zone),
    onBlur: () => setActiveZone((current) => (current === zone ? null : current)),
    onClick: () => setActiveZone((current) => (current === zone ? null : zone)),
  });

  const activeDetail = activeZone ? zoneDetail(activeZone, data) : null;
  const isDimmed = (zone: BracketZone) => activeZone != null && activeZone !== zone;

  const ariaLabel = `Bracket-limited conversion plan: stay within ${data.maxBracketPct}% bracket at ${formatRothMoneyFull(data.grossIncomeCeiling)} illustrative gross income. Lifetime tax and Medicare surcharge rate from ${formatEffectiveRate(data.stayEffectiveTaxIrmaaRate)} to ${formatEffectiveRate(data.rothEffectiveTaxIrmaaRate)}.`;

  return (
    <section className={cn("space-y-4", className)} aria-label={ariaLabel}>
      <div>
        <p className="ap-eyebrow">Bracket-limited conversion plan</p>
        <h3 className="mt-2 font-serif text-xl font-semibold text-[#e2e8f0] md:text-2xl">
          Staying within your target bracket
        </h3>
        <p className="mt-1 text-sm italic text-[#64748b]">{data.filingLabel}</p>
        <p className="mt-2 text-sm leading-relaxed text-[#94a3b8]">
          Year by year, conversions use available room in your{" "}
          <span className="font-semibold" style={{ color: ROTH_VISUAL_COLORS.accent }}>
            {data.maxBracketPct}% bracket
          </span>{" "}
          ({formatRothMoneyFull(data.grossIncomeCeiling)} illustrative gross income) without pushing ordinary income
          into the next rate band.{" "}
          <span className="font-medium text-[#e2e8f0]">Select a band on the chart for details.</span>
        </p>
      </div>

      <div className="rounded-none border border-[#1e1e2e] bg-[#101017] p-4 md:p-6">
        <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-[0.65rem] font-semibold uppercase tracking-wide text-[#64748b]">
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 rounded-sm px-1 py-0.5 transition-colors hover:bg-[#1a1a24]",
              activeZone === "convert" && "bg-[#1a1a24] ring-1 ring-[#2a2a38]",
              isDimmed("convert") && "opacity-50",
            )}
            {...bindZone("convert")}
          >
            <span className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: ROTH_VISUAL_COLORS.convertZone }} />
            Within target bracket
          </button>
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 rounded-sm px-1 py-0.5 transition-colors hover:bg-[#1a1a24]",
              activeZone === "ceiling" && "bg-[#1a1a24] ring-1 ring-[#2a2a38]",
              isDimmed("ceiling") && "opacity-50",
            )}
            {...bindZone("ceiling")}
          >
            <span className="h-3 w-px bg-[#e2e8f0]" aria-hidden />
            Income cap
          </button>
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 rounded-sm px-1 py-0.5 transition-colors hover:bg-[#1a1a24]",
              activeZone === "avoid" && "bg-[#1a1a24] ring-1 ring-[#2a2a38]",
              isDimmed("avoid") && "opacity-50",
            )}
            {...bindZone("avoid")}
          >
            <span className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: ROTH_VISUAL_COLORS.avoidZoneLight }} />
            Higher bracket bands
          </button>
        </div>

        <div className="mx-auto max-w-3xl space-y-4">
          <div className="relative pt-8" role="group" aria-labelledby={panelId}>
            <div
              className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-none border border-[#475569] bg-[#14141d] px-2 py-1"
              style={{ left: `${capMarkerPct}%` }}
            >
              <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-[#64748b]">Income cap</p>
              <p className="text-center font-serif text-sm font-bold tabular-nums text-[#e2e8f0]">
                {formatRothMoneyFull(data.grossIncomeCeiling)}
              </p>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {BRACKET_ORDER.map((rate, idx) => {
                const isTarget = idx <= targetIdx;
                const zone: BracketZone = isTarget ? "convert" : "avoid";
                return (
                  <button
                    key={rate}
                    type="button"
                    className={cn(
                      "flex h-12 flex-col items-center justify-center rounded-sm border outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-[#fbbf24]",
                      isTarget ? "border-[#3a3115]" : "border-[#2a1414]",
                      isDimmed(zone) && "opacity-45",
                      activeZone === zone && "ring-2 ring-inset",
                      isTarget && activeZone === "convert" && "ring-[#0a0a0d]",
                      !isTarget && activeZone === "avoid" && "ring-rose-500",
                    )}
                    style={{
                      backgroundColor: isTarget ? ROTH_VISUAL_COLORS.convertZone : ROTH_VISUAL_COLORS.avoidZoneLight,
                    }}
                    aria-label={`${rate}% marginal bracket${isTarget ? ", within target band" : ", higher bracket band"}`}
                    {...bindZone(zone)}
                  >
                    <span
                      className={cn(
                        "text-xs font-bold tabular-nums",
                        isTarget ? "text-[#0a0a0d]" : "text-[#f87171]",
                      )}
                    >
                      {rate}%
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className={cn(
                "absolute bottom-0 h-12 w-3 -translate-x-1/2 cursor-pointer rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24]",
                activeZone === "ceiling" && "bg-[#e2e8f0]/10",
              )}
              style={{ left: `${capMarkerPct}%` }}
              aria-label={`Income cap at ${formatRothMoneyFull(data.grossIncomeCeiling)}`}
              {...bindZone("ceiling")}
            >
              <span
                className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-[#e2e8f0]"
                aria-hidden
              />
            </button>
          </div>

          <div id={panelId}>
            <RothChartSegmentPanel
              segment={activeDetail}
              placeholder="Select a band on the chart (target bracket, income cap, or higher brackets) for details."
            />
          </div>

          <div className="rounded-none border border-[#1e1e2e] bg-[#14141d] px-4 py-3 text-center">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#64748b]">
              Illustrative gross income cap
            </p>
            <p className="mt-1 font-serif text-xl font-bold tabular-nums text-[#e2e8f0]">
              {formatRothMoneyFull(data.grossIncomeCeiling)}
            </p>
            <p className="mt-1 text-xs text-[#64748b]">
              Modeled limit at the top of the {data.maxBracketPct}% marginal bracket
              {nextBracket ? ` (before ${nextBracket}%)` : ""}
            </p>
          </div>
        </div>

        <div className="mx-auto mt-6 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
          <ExplainerCard
            title="Target bracket band"
            accent={ROTH_VISUAL_COLORS.convertZone}
            active={activeZone === "convert"}
            onHover={() => setActiveZone("convert")}
            body={`Roth conversions are sized to keep illustrative gross income at or below ${formatRothMoneyFull(data.grossIncomeCeiling)}, the top of your ${data.maxBracketPct}% marginal bracket.`}
          />
          <ExplainerCard
            title="Income cap"
            accent={ROTH_VISUAL_COLORS.stopLine}
            active={activeZone === "ceiling"}
            onHover={() => setActiveZone("ceiling")}
            body={`This is the income cap shown on the chart. Conversions use available room each year without pushing ordinary income into the next bracket${nextBracket ? ` (${nextBracket}%)` : ""}.`}
          />
          <ExplainerCard
            title="Higher bracket bands"
            accent={ROTH_VISUAL_COLORS.avoidZone}
            active={activeZone === "avoid"}
            onHover={() => setActiveZone("avoid")}
            body="Income above your selected bracket would cross into a higher marginal rate. The plan avoids converting so much that you push income above your target bracket."
          />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 border-t border-[#1e1e2e] pt-5 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#64748b]">
              Lifetime tax and Medicare surcharge rate
            </p>
            <p className="mt-1 text-sm text-[#94a3b8]">
              Falls from{" "}
              <span className="font-bold tabular-nums text-[#e2e8f0]">
                {formatEffectiveRate(data.stayEffectiveTaxIrmaaRate)}
              </span>{" "}
              to{" "}
              <span className="font-bold tabular-nums" style={{ color: ROTH_VISUAL_COLORS.roth }}>
                {formatEffectiveRate(data.rothEffectiveTaxIrmaaRate)}
              </span>
            </p>
          </div>

          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-[0.65rem] font-semibold uppercase text-[#64748b]">Current path</p>
              <p className="font-serif text-2xl font-bold tabular-nums text-[#e2e8f0]">
                {formatEffectiveRate(data.stayEffectiveTaxIrmaaRate)}
              </p>
            </div>
            <RothPlanRate rate={data.rothEffectiveTaxIrmaaRate} />
          </div>

          <p className="text-sm text-[#94a3b8] md:text-right">
            {data.effectiveRateDeltaPts > 0 ? (
              <>
                About a{" "}
                <span className="font-semibold" style={{ color: ROTH_VISUAL_COLORS.accent }}>
                  {formatEffectiveRate(data.effectiveRateDeltaPts)} percentage-point reduction
                </span>{" "}
                in combined tax and IRMAA over the modeled plan.
              </>
            ) : (
              <>Rate change is illustrative only. Confirm with your tax professional.</>
            )}
          </p>
        </div>

        {data.conversionAmountTotal > 0 ? (
          <p className="mt-4 text-xs text-[#64748b]">
            Total gross conversions modeled: {formatRothMoneyFull(data.conversionAmountTotal)}.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function RothPlanRate({ rate }: { rate: number }) {
  return (
    <div className="text-center">
      <p className="text-[0.65rem] font-semibold uppercase text-[#fbbf24]">Roth conversion path</p>
      <p className="font-serif text-2xl font-bold tabular-nums text-[#fbbf24]">{formatEffectiveRate(rate)}</p>
    </div>
  );
}
