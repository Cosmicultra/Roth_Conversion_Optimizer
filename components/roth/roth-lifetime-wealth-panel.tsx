"use client";

import type { RothComparisonVisualData } from "@/lib/roth-comparison-visuals";
import {
  formatRothDeltaCompact,
  formatRothMoneyCompact,
  formatRothPct,
  ROTH_VISUAL_COLORS,
} from "@/lib/roth-visual-theme";
import { cn } from "@/lib/utils";

type RothLifetimeWealthPanelProps = {
  data: RothComparisonVisualData;
  clientName?: string;
  className?: string;
};

function deltaTone(n: number): "positive" | "negative" | "neutral" {
  if (n > 500) return "positive";
  if (n < -500) return "negative";
  return "neutral";
}

function InsightChip({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  tone: "positive" | "negative" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-none border bg-[#14141d] p-4",
        tone === "positive" && "border-[#3a3115]",
        tone === "negative" && "border-[#5a2020]",
        tone === "neutral" && "border-[#1e1e2e]",
      )}
    >
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#64748b]">{label}</p>
      <p
        className={cn(
          "mt-1 text-base font-bold tabular-nums",
          tone === "positive" && "text-[#fbbf24]",
          tone === "negative" && "text-[#f87171]",
          tone === "neutral" && "text-[#e2e8f0]",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs leading-snug text-[#64748b]">{helper}</p>
    </div>
  );
}

function PanelCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-none border border-[#1e1e2e] bg-[#14141d] p-4 md:p-5", className)}>{children}</div>
  );
}

export function RothLifetimeWealthPanel({ data, clientName, className }: RothLifetimeWealthPanelProps) {
  const headline = clientName
    ? `Lifetime wealth comparison for ${clientName}`
    : "Lifetime wealth comparison";

  return (
    <section className={cn("space-y-4", className)} aria-labelledby="roth-lifetime-heading">
      <PanelCard>
        <p className="ap-eyebrow">Lifetime wealth comparison</p>
        <h3 id="roth-lifetime-heading" className="mt-2 font-serif text-xl font-semibold text-[#e2e8f0] md:text-2xl">
          {headline}
        </h3>
        <p className="mt-2 text-sm text-[#64748b]">
          At the end of the modeled horizon, the Roth conversion path leaves{" "}
          {data.wealthDelta >= 0 ? "more" : "less"} after-tax wealth than staying in traditional IRAs.
        </p>
      </PanelCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <PanelCard className="bg-[#101017]">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Current path</p>
          <p className="mt-2 font-serif text-3xl font-bold tabular-nums text-[#e2e8f0]">
            {formatRothMoneyCompact(data.stayEndingWealth)}
          </p>
          <p className="mt-1 text-xs text-[#475569]">After-tax wealth, no conversion plan</p>
        </PanelCard>

        <div className="flex flex-col items-center justify-center px-2 py-3 md:py-0">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#64748b]">Difference</p>
          <p
            className={cn(
              "mt-1 font-serif text-2xl font-bold tabular-nums",
              data.wealthDelta >= 0 ? "text-[#fbbf24]" : "text-[#f87171]",
            )}
          >
            {formatRothDeltaCompact(data.wealthDelta)}
          </p>
          <p className="mt-0.5 text-xs tabular-nums text-[#64748b]">{formatRothPct(data.wealthDeltaPct, true)}</p>
        </div>

        <PanelCard className="border-[#3a3115] bg-[#15130a]">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: ROTH_VISUAL_COLORS.roth }}>
            Roth conversion path
          </p>
          <p className="mt-2 font-serif text-3xl font-bold tabular-nums" style={{ color: ROTH_VISUAL_COLORS.roth }}>
            {formatRothMoneyCompact(data.rothEndingWealth)}
          </p>
          <p className="mt-1 text-xs text-[#64748b]">After-tax wealth, with the conversion plan</p>
        </PanelCard>
      </div>

      <PanelCard>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Where the difference comes from</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InsightChip
            label="More total wealth"
            value={formatRothDeltaCompact(data.wealthDelta)}
            helper={`${formatRothPct(data.wealthDeltaPct, true)} vs. current path at end of plan`}
            tone={deltaTone(data.wealthDelta)}
          />
          <InsightChip
            label="Tax savings"
            value={formatRothDeltaCompact(data.taxSavings)}
            helper="Federal illustrative tax avoided over the modeled lifetime"
            tone={deltaTone(data.taxSavings)}
          />
          <InsightChip
            label="IRMAA difference"
            value={formatRothDeltaCompact(data.irmaaSavings)}
            helper="Medicare IRMAA surcharges avoided (illustrative)"
            tone={deltaTone(data.irmaaSavings)}
          />
          <InsightChip
            label="Net legacy to heirs"
            value={formatRothDeltaCompact(data.heirsLegacyDelta)}
            helper={`Current path net after ${data.assumedHeirTaxRatePct}% assumed heir tax vs. Roth tax-free to heirs`}
            tone={deltaTone(data.heirsLegacyDelta)}
          />
          <InsightChip
            label="Spendable income trade-off"
            value={formatRothDeltaCompact(data.afterTaxIncomeDelta)}
            helper="After-tax income kept during the plan. A lower number can mean more went to heirs."
            tone={deltaTone(data.afterTaxIncomeDelta)}
          />
        </div>
      </PanelCard>
    </section>
  );
}
