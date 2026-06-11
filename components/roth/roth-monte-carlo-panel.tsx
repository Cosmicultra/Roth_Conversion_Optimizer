"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RothConversionModelResult } from "@/lib/roth-conversion-analysis";
import { buildMonteCarloContextForAdvisorUi } from "@/lib/roth-conversion-ui-model";
import type { RothClient } from "@/lib/roth-client";
import {
  MONTE_CARLO_DEFAULT_INDEX_MEAN,
  MONTE_CARLO_DEFAULT_INDEX_VOL,
  MONTE_CARLO_DEFAULT_SIMULATION_COUNT,
  runRothMonteCarlo,
  type RothMonteCarloConfig,
  type RothMonteCarloResult,
} from "@/lib/roth-monte-carlo";
import type { RothSocialSecurityState } from "@/lib/roth-social-security";
import type { RothWorksheet } from "@/lib/roth-worksheet";
import {
  formatRothMoneyCompact,
  formatRothPct,
  ROTH_VISUAL_COLORS,
} from "@/lib/roth-visual-theme";
import { cn } from "@/lib/utils";

export type RothMonteCarloPanelProps = {
  model: RothConversionModelResult;
  client: RothClient;
  rothWorksheet: RothWorksheet;
  fullQualifiedPool: number;
  socialSecurity: RothSocialSecurityState;
  result: RothMonteCarloResult | null;
  onResult: (result: RothMonteCarloResult | null) => void;
  className?: string;
};

function MetricChip({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "positive" | "negative" | "neutral";
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
          "mt-1 text-lg font-bold tabular-nums",
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

const MC_OUTCOME_ROWS = [
  { key: "p10" as const, label: "Down markets", emphasis: false },
  { key: "p50" as const, label: "Typical markets", emphasis: true },
  { key: "p90" as const, label: "Up markets", emphasis: false },
];

function PercentileBar({
  label,
  p10,
  p50,
  p90,
  color,
}: {
  label: string;
  p10: number;
  p50: number;
  p90: number;
  color: string;
}) {
  const values = { p10, p50, p90 };
  const max = Math.max(p10, p50, p90, 1);
  const w = (v: number) => `${Math.max(4, (v / max) * 100)}%`;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-[#94a3b8]">{label}</p>
      {MC_OUTCOME_ROWS.map((row) => {
        const value = values[row.key];
        return (
          <div
            key={row.key}
            className="grid grid-cols-[6.5rem_1fr_5rem] items-center gap-2 text-xs text-[#64748b]"
          >
            <span>{row.label}</span>
            <div className={row.emphasis ? "h-2.5 bg-[#1e1e2e]" : "h-2 bg-[#1e1e2e]"}>
              <div
                className={cn("h-full", !row.emphasis && "opacity-70")}
                style={{ width: w(value), backgroundColor: color }}
              />
            </div>
            <span
              className={cn(
                "tabular-nums text-[#e2e8f0]",
                row.emphasis && "font-semibold",
              )}
            >
              {formatRothMoneyCompact(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function RothMonteCarloPanel({
  model,
  client,
  rothWorksheet,
  fullQualifiedPool,
  socialSecurity,
  result,
  onResult,
  className,
}: RothMonteCarloPanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simCount, setSimCount] = useState(String(MONTE_CARLO_DEFAULT_SIMULATION_COUNT));
  const [indexMeanPct, setIndexMeanPct] = useState(String(MONTE_CARLO_DEFAULT_INDEX_MEAN * 100));
  const [indexVolPct, setIndexVolPct] = useState(String(MONTE_CARLO_DEFAULT_INDEX_VOL * 100));
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const configuredSimulationCount = Math.max(
    100,
    Math.floor(Number(simCount) || MONTE_CARLO_DEFAULT_SIMULATION_COUNT),
  );
  const scenarioCountLabel = (result?.simulationCount ?? configuredSimulationCount).toLocaleString();

  const runStressTest = useCallback(() => {
    setError(null);
    setBusy(true);
    try {
      const built = buildMonteCarloContextForAdvisorUi(
        client,
        rothWorksheet,
        fullQualifiedPool,
        { socialSecurity },
      );
      if (!built.ok) {
        setError(built.error);
        onResult(null);
        return;
      }
      const config: RothMonteCarloConfig = {
        simulationCount: Math.max(100, Math.floor(Number(simCount) || MONTE_CARLO_DEFAULT_SIMULATION_COUNT)),
        indexMeanAnnual: Math.max(0, Number(indexMeanPct) || 0) / 100,
        indexVolAnnual: Math.max(0, Number(indexVolPct) || 0) / 100,
      };
      const mc = runRothMonteCarlo(model, built.context, config);
      onResult(mc);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Monte Carlo stress test failed.");
      onResult(null);
    } finally {
      setBusy(false);
    }
  }, [
    client,
    fullQualifiedPool,
    indexMeanPct,
    indexVolPct,
    model,
    onResult,
    rothWorksheet,
    simCount,
    socialSecurity,
  ]);

  return (
    <section
      className={cn(
        "space-y-4 rounded-none border border-[#1e1e2e] bg-[#101017] p-5 md:p-6",
        "border-t-[3px] border-t-[#64748b]",
        className,
      )}
      aria-labelledby="roth-monte-carlo-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="ap-eyebrow">Volatility stress test</p>
          <h3 id="roth-monte-carlo-heading" className="mt-2 font-serif text-xl font-semibold text-[#e2e8f0]">
            Monte Carlo comparison
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-[#64748b]">
            Runs {scenarioCountLabel} randomized market scenarios. Supplemental only: fixed-return tables above
            remain the primary illustration. Stay-traditional experiences volatile market returns; Roth/FIC path
            uses a 0% floor and contract cap in surrender years.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="rounded-none border-[#1e1e2e] bg-[#14141d] text-[#e2e8f0] hover:bg-[#1a1a28]"
          disabled={busy}
          onClick={runStressTest}
        >
          {busy ? "Running…" : "Run volatility stress test"}
        </Button>
      </div>

      {error ? (
        <p className="rounded-none border border-[#5a2020] bg-[#1c0d0d] px-4 py-3 text-sm text-[#fca5a5]" role="alert">
          {error}
        </p>
      ) : null}

      <details
        open={advancedOpen}
        onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}
        className="rounded-none border border-[#1e1e2e] bg-[#14141d] px-4 py-3"
      >
        <summary className="cursor-pointer text-sm font-semibold text-[#e2e8f0]">Advanced assumptions</summary>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block text-xs text-[#64748b]">
            Simulations
            <Input
              className="mt-1 h-10 rounded-none"
              type="number"
              min={100}
              max={5000}
              value={simCount}
              onChange={(e) => setSimCount(e.target.value)}
            />
          </label>
          <label className="block text-xs text-[#64748b]">
            Index mean return (%/yr)
            <Input
              className="mt-1 h-10 rounded-none"
              type="number"
              min={0}
              step={0.5}
              value={indexMeanPct}
              onChange={(e) => setIndexMeanPct(e.target.value)}
            />
          </label>
          <label className="block text-xs text-[#64748b]">
            Index volatility (%/yr)
            <Input
              className="mt-1 h-10 rounded-none"
              type="number"
              min={0}
              step={0.5}
              value={indexVolPct}
              onChange={(e) => setIndexVolPct(e.target.value)}
            />
          </label>
        </div>
      </details>

      {result ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricChip
              label="Roth wins"
              value={formatRothPct(result.rothWinPct)}
              helper={`${result.simulationCount.toLocaleString()} randomized market paths`}
              tone={result.rothWinPct >= 50 ? "positive" : "neutral"}
            />
            <MetricChip
              label="Stay-traditional wins"
              value={formatRothPct(result.stayWinPct)}
              helper="Volatile market on current allocation path"
              tone={result.stayWinPct > result.rothWinPct ? "negative" : "neutral"}
            />
            <MetricChip
              label="Median ending wealth delta"
              value={formatRothMoneyCompact(result.medianWealthDelta)}
              helper="Roth median minus stay-traditional median"
              tone={result.medianWealthDelta >= 0 ? "positive" : "negative"}
            />
            <MetricChip
              label="Median ending wealth"
              value={`${formatRothMoneyCompact(result.rothEndingMedian)} vs ${formatRothMoneyCompact(result.stayEndingMedian)}`}
              helper="Roth path vs stay-traditional at horizon"
              tone="neutral"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 border-t border-[#1e1e2e] pt-6 md:grid-cols-2">
            <PercentileBar
              label="Current allocation ending wealth"
              p10={result.stayEndingP10}
              p50={result.stayEndingP50}
              p90={result.stayEndingP90}
              color={ROTH_VISUAL_COLORS.stay}
            />
            <PercentileBar
              label="Roth path ending wealth"
              p10={result.rothEndingP10}
              p50={result.rothEndingP50}
              p90={result.rothEndingP90}
              color={ROTH_VISUAL_COLORS.roth}
            />
          </div>

          <p className="text-xs leading-relaxed text-[#64748b]">
            {result.disclaimer} Median stay-traditional years with negative returns:{" "}
            {result.stayNegativeReturnYearsMedian.toFixed(0)}; median FIC 0%-credit years on Roth path:{" "}
            {result.ficZeroCreditYearsMedian.toFixed(0)}.
          </p>
        </>
      ) : (
        <p className="text-sm text-[#64748b]">
          Run the stress test to see how often the Roth conversion path ends with more wealth than staying in
          traditional IRAs under randomized market scenarios.
        </p>
      )}
    </section>
  );
}
