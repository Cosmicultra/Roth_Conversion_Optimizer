"use client";

import { useMemo } from "react";
import type { RothConversionModelResult } from "@/lib/roth-conversion-analysis";
import { buildRothComparisonVisualData } from "@/lib/roth-comparison-visuals";
import { RothBracketStrategyChart } from "@/components/roth/roth-bracket-strategy-chart";
import { RothLifetimeWealthPanel } from "@/components/roth/roth-lifetime-wealth-panel";
import { RothWealthAllocationChart } from "@/components/roth/roth-wealth-allocation-chart";
import { cn } from "@/lib/utils";

export type RothComparisonVisualsProps = {
  model: RothConversionModelResult;
  clientName?: string;
  className?: string;
  useEntireQualifiedBalance?: boolean | null;
};

export function RothComparisonVisuals({
  model,
  clientName,
  className,
  useEntireQualifiedBalance,
}: RothComparisonVisualsProps) {
  const data = useMemo(
    () => buildRothComparisonVisualData(model, { useEntireQualifiedBalance }),
    [model, useEntireQualifiedBalance],
  );

  return (
    <div
      className={cn(
        "space-y-8 rounded-none border border-[#1e1e2e] bg-[#101017] p-5 shadow-none md:p-6",
        "border-t-[3px] border-t-[var(--ap-cyan)]",
        className,
      )}
    >
      <p className="text-xs leading-relaxed text-[#64748b]">
        Illustrative comparison only — not tax, Medicare, or investment advice. Current path legacy to heirs is net
        after an assumed default {data.assumedHeirTaxRatePct}% beneficiary tax on death; Roth legacy is illustrated
        tax-free to heirs. Estate taxes are not modeled.
      </p>

      <RothLifetimeWealthPanel data={data} clientName={clientName} />
      <div className="border-t border-[#1e1e2e] pt-8">
        <RothWealthAllocationChart data={data} />
      </div>
      <div className="border-t border-[#1e1e2e] pt-8">
        <RothBracketStrategyChart data={data} />
      </div>
    </div>
  );
}
