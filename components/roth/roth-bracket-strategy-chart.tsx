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

const ZONE_META: Record<BracketZone, { title: string; accent: string }> = {
  convert: { title: "Convert zone", accent: ROTH_VISUAL_COLORS.convertZone },
  ceiling: { title: "Your ceiling", accent: ROTH_VISUAL_COLORS.stopLine },
  avoid: { title: "Avoid zone", accent: ROTH_VISUAL_COLORS.avoidZone },
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

  const stopPct = Math.min(0.98, Math.max(0.02, data.stopLinePosition));
  const stopPctLabel = Math.round(stopPct * 1000) / 10;
  const nextBracket = nextBracketPct(data.maxBracketPct);
  const showConvertLabel = stopPct >= 0.2;
  const showAvoidLabel = stopPct <= 0.78;

  const bindZone = (zone: BracketZone) => ({
    onMouseEnter: () => setActiveZone(zone),
    onMouseLeave: () => setActiveZone((current) => (current === zone ? null : current)),
    onFocus: () => setActiveZone(zone),
    onBlur: () => setActiveZone((current) => (current === zone ? null : current)),
    onClick: () => setActiveZone((current) => (current === zone ? null : zone)),
  });

  const activeDetail = activeZone ? zoneDetail(activeZone, data) : null;
  const isDimmed = (zone: BracketZone) => activeZone != null && activeZone !== zone;

  const ariaLabel = `Marginal tax bracket strategy: convert up to ${data.maxBracketPct}% bracket ceiling at ${formatRothMoneyFull(data.grossIncomeCeiling)} gross income. Effective tax and IRMAA rate from ${formatEffectiveRate(data.stayEffectiveTaxIrmaaRate)} to ${formatEffectiveRate(data.rothEffectiveTaxIrmaaRate)}.`;

  return (
    <section className={cn("space-y-4", className)} aria-label={ariaLabel}>
      <div>
        <p className="ap-eyebrow">Your optimal income zone</p>
        <h3 className="mt-2 font-serif text-xl font-semibold text-[#e2e8f0] md:text-2xl">
          Marginal tax bracket management
        </h3>
        <p className="mt-1 text-sm italic text-[#64748b]">{data.filingLabel}</p>
        <p className="mt-2 text-sm leading-relaxed text-[#94a3b8]">
          Each conversion year, we fill room up to your{" "}
          <span className="font-semibold" style={{ color: ROTH_VISUAL_COLORS.accent }}>
            {data.maxBracketPct}% bracket ceiling
          </span>{" "}
          ({formatRothMoneyFull(data.grossIncomeCeiling)} illustrative gross income) — then stop before income
          would cross into a higher bracket.{" "}
          <span className="font-medium text-[#e2e8f0]">Hover or tap the bar to explore each zone.</span>
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
            Convert in this zone
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
            Your ceiling
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
            <span className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: ROTH_VISUAL_COLORS.avoidZone }} />
            Avoid crossing into next bracket
          </button>
        </div>

        <div className="mx-auto max-w-3xl space-y-4">
          <div className="relative pt-2" role="group" aria-labelledby={panelId}>
            <div className="flex h-10 w-full overflow-hidden rounded-full border border-[#2a2a38] shadow-inner">
              <ConvertZone
                stopPctLabel={stopPctLabel}
                showConvertLabel={showConvertLabel}
                dimmed={isDimmed("convert")}
                active={activeZone === "convert"}
                {...bindZone("convert")}
              />
              <AvoidZone
                showAvoidLabel={showAvoidLabel}
                dimmed={isDimmed("avoid")}
                active={activeZone === "avoid"}
                {...bindZone("avoid")}
              />
            </div>
            <button
              type="button"
              className={cn(
                "absolute top-2 h-10 w-3 -translate-x-1/2 cursor-pointer rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24]",
                activeZone === "ceiling" && "bg-[#e2e8f0]/10",
              )}
              style={{ left: `${stopPctLabel}%` }}
              aria-label={`Your ceiling at ${formatRothMoneyFull(data.grossIncomeCeiling)}`}
              {...bindZone("ceiling")}
            >
              <span
                className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 border-l-2 border-dashed border-[#e2e8f0]"
                aria-hidden
              />
            </button>
          </div>

          <div id={panelId}>
            <RothChartSegmentPanel
              segment={activeDetail}
              placeholder="Hover or tap a zone on the bar — convert, ceiling, or avoid — to see what it means."
            />
          </div>

          <div className="rounded-none border border-[#1e1e2e] bg-[#14141d] px-4 py-3 text-center">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#64748b]">
              Your conversion ceiling
            </p>
            <p className="mt-1 font-serif text-xl font-bold tabular-nums text-[#e2e8f0]">
              {formatRothMoneyFull(data.grossIncomeCeiling)}
            </p>
            <p className="mt-1 text-xs text-[#64748b]">
              Illustrative gross income limit — top of your {data.maxBracketPct}% marginal bracket
              {nextBracket ? ` (before ${nextBracket}%)` : ""}
            </p>
          </div>
        </div>

        <div className="mx-auto mt-6 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
          <ExplainerCard
            title="Convert zone"
            accent={ROTH_VISUAL_COLORS.convertZone}
            active={activeZone === "convert"}
            onHover={() => setActiveZone("convert")}
            body={`Roth conversions are sized to keep illustrative gross income at or below ${formatRothMoneyFull(data.grossIncomeCeiling)} — the top of your ${data.maxBracketPct}% marginal bracket.`}
          />
          <ExplainerCard
            title="Your ceiling"
            accent={ROTH_VISUAL_COLORS.stopLine}
            active={activeZone === "ceiling"}
            onHover={() => setActiveZone("ceiling")}
            body={`This is the stop line on the bar above. Conversions use available room each year without pushing ordinary income into the next bracket${nextBracket ? ` (${nextBracket}%)` : ""}.`}
          />
          <ExplainerCard
            title="Avoid zone"
            accent={ROTH_VISUAL_COLORS.avoidZone}
            active={activeZone === "avoid"}
            onHover={() => setActiveZone("avoid")}
            body="Income above the ceiling would cross into a higher marginal rate. The plan avoids converting so much that you spill into this zone."
          />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 border-t border-[#1e1e2e] pt-5 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#64748b]">
              Effective tax + IRMAA rate
            </p>
            <p className="mt-1 text-sm text-[#94a3b8]">
              From{" "}
              <span className="font-bold tabular-nums text-[#e2e8f0]">
                {formatEffectiveRate(data.stayEffectiveTaxIrmaaRate)}
              </span>{" "}
              down to{" "}
              <span className="font-bold tabular-nums" style={{ color: ROTH_VISUAL_COLORS.roth }}>
                {formatEffectiveRate(data.rothEffectiveTaxIrmaaRate)}
              </span>
            </p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <div className="text-center">
              <p className="text-[0.65rem] font-semibold uppercase text-[#64748b]">Current</p>
              <p className="font-serif text-2xl font-bold tabular-nums text-[#e2e8f0]">
                {formatEffectiveRate(data.stayEffectiveTaxIrmaaRate)}
              </p>
            </div>
            <span className="text-xl text-[#475569]" aria-hidden>
              →
            </span>
            <RothPlanRate rate={data.rothEffectiveTaxIrmaaRate} />
          </div>

          <p className="text-sm text-[#94a3b8] md:text-right">
            {data.effectiveRateDeltaPts > 0 ? (
              <>
                A{" "}
                <span className="font-semibold" style={{ color: ROTH_VISUAL_COLORS.accent }}>
                  {formatEffectiveRate(data.effectiveRateDeltaPts)} point decrease
                </span>{" "}
                in your illustrative effective tax and IRMAA rate over the modeled lifetime.
              </>
            ) : (
              <>Effective rate change is illustrative only — confirm with your tax professional.</>
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

function ConvertZone({
  stopPctLabel,
  showConvertLabel,
  dimmed,
  active,
  ...handlers
}: {
  stopPctLabel: number;
  showConvertLabel: boolean;
  dimmed: boolean;
  active: boolean;
} & React.ComponentPropsWithoutRef<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center justify-center outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0a0a0d]",
        dimmed && "opacity-45",
        active && "ring-2 ring-inset ring-[#0a0a0d]",
      )}
      style={{
        width: `${stopPctLabel}%`,
        backgroundColor: ROTH_VISUAL_COLORS.convertZone,
      }}
      aria-label="Convert zone — safe conversion income band"
      {...handlers}
    >
      {showConvertLabel ? (
        <span className="pointer-events-none px-2 text-xs font-semibold uppercase tracking-wide text-[#0a0a0d]">
          Convert
        </span>
      ) : null}
    </button>
  );
}

function AvoidZone({
  showAvoidLabel,
  dimmed,
  active,
  ...handlers
}: {
  showAvoidLabel: boolean;
  dimmed: boolean;
  active: boolean;
} & React.ComponentPropsWithoutRef<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex flex-1 items-center justify-center outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-400",
        dimmed && "opacity-45",
        active && "ring-2 ring-inset ring-rose-500",
      )}
      style={{ backgroundColor: ROTH_VISUAL_COLORS.avoidZoneLight }}
      aria-label="Avoid zone — higher marginal bracket territory"
      {...handlers}
    >
      {showAvoidLabel ? (
        <span className="pointer-events-none px-2 text-xs font-semibold uppercase tracking-wide text-[#f87171]">
          Avoid
        </span>
      ) : null}
    </button>
  );
}

function RothPlanRate({ rate }: { rate: number }) {
  return (
    <div className="text-center">
      <p className="text-[0.65rem] font-semibold uppercase text-[#fbbf24]">Roth plan</p>
      <p className="font-serif text-2xl font-bold tabular-nums text-[#fbbf24]">{formatEffectiveRate(rate)}</p>
    </div>
  );
}
