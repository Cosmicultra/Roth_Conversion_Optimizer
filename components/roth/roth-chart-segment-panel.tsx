"use client";

import { cn } from "@/lib/utils";

export type ChartSegmentDetail = {
  key: string;
  title: string;
  value?: string;
  description: string;
  color: string;
};

type RothChartSegmentPanelProps = {
  segment: ChartSegmentDetail | null;
  placeholder: string;
  className?: string;
};

export function RothChartSegmentPanel({ segment, placeholder, className }: RothChartSegmentPanelProps) {
  return (
    <div
      className={cn(
        "min-h-[7.5rem] rounded-none border px-4 py-3 transition-colors",
        segment ? "border-[#2a2a38] bg-[#14141d]" : "border-dashed border-[#1e1e2e] bg-[#101017]",
        className,
      )}
      aria-live="polite"
    >
      {segment ? (
        <>
          <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: segment.color }} />
            {segment.title}
            {segment.value ? (
              <span className="font-serif text-sm normal-case tabular-nums text-[#e2e8f0]">{segment.value}</span>
            ) : null}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[#64748b]">{segment.description}</p>
        </>
      ) : (
        <p className="text-xs leading-relaxed text-[#64748b]">{placeholder}</p>
      )}
    </div>
  );
}
