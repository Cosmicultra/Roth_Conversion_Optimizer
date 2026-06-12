"use client";

import { useMemo, useState } from "react";
import type { RothComparisonVisualData } from "@/lib/roth-comparison-visuals";
import {
  buildImpactDrivers,
  impactDriverAccentColor,
  type ImpactDriver,
} from "@/lib/roth-impact-drivers";
import { cn } from "@/lib/utils";

type RothImpactDriversChartProps = {
  data: RothComparisonVisualData;
  className?: string;
};

function valueClassName(tone: ImpactDriver["tone"]): string {
  if (tone === "positive") return "text-[#fbbf24]";
  if (tone === "negative") return "text-[#f87171]";
  return "text-[#e2e8f0]";
}

function buildAriaSummary(drivers: ImpactDriver[]): string {
  const top = drivers.slice(0, 3).map((d) => `${d.label} ${d.valueFormatted}`);
  return `Plan delta drivers sorted by impact: ${top.join("; ")}.`;
}

export function RothImpactDriversChart({ data, className }: RothImpactDriversChartProps) {
  const drivers = useMemo(() => buildImpactDrivers(data), [data]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeDriver = activeId ? drivers.find((d) => d.id === activeId) ?? null : null;

  const bindRow = (driver: ImpactDriver) => ({
    onMouseEnter: () => setActiveId(driver.id),
    onMouseLeave: () => setActiveId((current) => (current === driver.id ? null : current)),
    onFocus: () => setActiveId(driver.id),
    onBlur: () => setActiveId((current) => (current === driver.id ? null : current)),
    onClick: () => setActiveId((current) => (current === driver.id ? null : driver.id)),
  });

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">What drives the gap</p>
        <p className="mt-1 text-xs text-[#475569]">Sorted by illustrative impact · hover or tap a row for detail</p>
      </div>

      <div className="overflow-hidden rounded-none border border-[#1e1e2e]" role="img" aria-label={buildAriaSummary(drivers)}>
        <div className="grid grid-cols-[1fr_auto] gap-x-4 border-b border-[#1e1e2e] bg-[#101017] px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-wide text-[#64748b]">
          <span>Driver</span>
          <span className="text-right">Change</span>
        </div>
        {drivers.map((driver, index) => {
          const isTop = index === 0;
          const isActive = activeId === driver.id;
          const isDimmed = activeId != null && activeId !== driver.id;

          return (
            <div key={driver.id} className="border-b border-[#1e1e2e] last:border-b-0">
              <button
                type="button"
                aria-pressed={isActive}
                className={cn(
                  "grid w-full grid-cols-[1fr_auto] gap-x-4 px-3 py-2.5 text-left outline-none transition-opacity",
                  isTop && "border-l-[3px] border-l-[var(--ap-cyan)] bg-[#101017]",
                  !isTop && "bg-[#0c0c0f]",
                  isActive && "bg-[#14141d]",
                  isDimmed && "opacity-50",
                  "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ap-cyan)]",
                )}
                {...bindRow(driver)}
              >
                <span
                  className={cn(
                    "flex min-w-0 items-center gap-2 text-xs font-medium text-[#94a3b8]",
                    isTop && "font-semibold text-[#e2e8f0]",
                  )}
                >
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-sm"
                    style={{ backgroundColor: impactDriverAccentColor(driver.tone) }}
                    aria-hidden
                  />
                  {driver.label}
                </span>
                <span
                  className={cn(
                    "font-serif text-sm font-bold tabular-nums",
                    valueClassName(driver.tone),
                    isTop && "text-base md:text-lg",
                  )}
                >
                  {driver.valueFormatted}
                </span>
              </button>
              {isActive ? (
                <p className="border-t border-[#1e1e2e] bg-[#14141d] px-3 py-2 text-xs leading-relaxed text-[#64748b]">
                  {driver.helper}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
