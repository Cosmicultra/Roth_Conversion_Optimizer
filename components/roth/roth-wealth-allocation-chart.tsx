"use client";



import { useCallback, useId, useState } from "react";

import type { RothComparisonVisualData } from "@/lib/roth-comparison-visuals";

import { wealthAllocationSegmentDescription, type WealthAllocationPath } from "@/lib/roth-chart-segment-copy";

import { RothChartSegmentPanel, type ChartSegmentDetail } from "@/components/roth/roth-chart-segment-panel";

import {

  formatRothDeltaCompact,

  formatRothMoneyCompact,

  formatRothMoneyFull,

  ROTH_VISUAL_COLORS,

} from "@/lib/roth-visual-theme";

import { cn } from "@/lib/utils";



type RothWealthAllocationChartProps = {

  data: RothComparisonVisualData;

  className?: string;

};



type StackSegment = {

  key: string;

  label: string;

  value: number;

  color: string;

  description: string;

};



type LegendNote = { key: string; label: string; value?: string; description: string };



function buildStackSegments(

  path: WealthAllocationPath,

  data: RothComparisonVisualData,

  afterTaxIncome: number,

  heirsLegacy: number,

  taxesAndIrmaa: number,

  heirTaxOnDeath?: number,

  assumedHeirTaxRatePct?: number,

): StackSegment[] {

  const segments: StackSegment[] = [

    {

      key: "heirs",

      label: "Legacy to heirs (net)",

      value: heirsLegacy,

      color: ROTH_VISUAL_COLORS.heirs,

      description: wealthAllocationSegmentDescription("heirs", path, data),

    },

    {

      key: "income",

      label: "Income you keep",

      value: afterTaxIncome,

      color: ROTH_VISUAL_COLORS.income,

      description: wealthAllocationSegmentDescription("income", path, data),

    },

    {

      key: "taxes",

      label: "Taxes + IRMAA",

      value: taxesAndIrmaa,

      color: ROTH_VISUAL_COLORS.taxes,

      description: wealthAllocationSegmentDescription("taxes", path, data),

    },

  ];

  if (heirTaxOnDeath != null && heirTaxOnDeath > 0) {

    segments.push({

      key: "heirTax",

      label: `Heir tax on death (${assumedHeirTaxRatePct ?? 24}% assumed default)`,

      value: heirTaxOnDeath,

      color: ROTH_VISUAL_COLORS.taxes,

      description: wealthAllocationSegmentDescription("heirTax", path, data),

    });

  }

  return segments;

}



function segmentDetail(seg: StackSegment | LegendNote): ChartSegmentDetail {

  let value: string | undefined;

  if ("value" in seg) {

    value = typeof seg.value === "number" ? formatRothMoneyCompact(seg.value) : seg.value;

  }

  return {

    key: seg.key,

    title: seg.label,

    value,

    description: seg.description,

    color: "color" in seg ? seg.color : ROTH_VISUAL_COLORS.roth,

  };

}



function StackedBar({

  title,

  totalLabel,

  segments,

  accent,

  legendNotes,

}: {

  title: string;

  totalLabel: string;

  segments: StackSegment[];

  accent: "stay" | "roth";

  legendNotes?: LegendNote[];

}) {

  const panelId = useId();

  const [activeKey, setActiveKey] = useState<string | null>(null);



  const stackSegments = segments.filter((s) => s.key === "heirs" || s.key === "income");

  const taxSeg = segments.find((s) => s.key === "taxes");

  const heirTaxSeg = segments.find((s) => s.key === "heirTax");

  const taxVal = taxSeg?.value ?? 0;

  const heirTaxVal = heirTaxSeg?.value ?? 0;

  const frictionTotal = taxVal + heirTaxVal;

  const wealthTotal = stackSegments.reduce((s, seg) => s + Math.max(0, seg.value), 0) + frictionTotal;

  const chartH = 200;

  const barW = 72;

  const frictionH =

    frictionTotal > 0 && wealthTotal > 0 ? (frictionTotal / wealthTotal) * chartH * 0.5 : 0;

  const taxH = frictionTotal > 0 ? (taxVal / frictionTotal) * frictionH : 0;

  const heirTaxH = frictionTotal > 0 ? (heirTaxVal / frictionTotal) * frictionH : 0;

  const stackH = chartH - frictionH;



  const segmentByKey = useCallback(

    (key: string) => segments.find((s) => s.key === key) ?? legendNotes?.find((n) => n.key === key) ?? null,

    [legendNotes, segments],

  );



  const activeSegment = activeKey ? segmentByKey(activeKey) : null;

  const activeDetail = activeSegment ? segmentDetail(activeSegment) : null;



  const isDimmed = (key: string) => activeKey != null && activeKey !== key;

  const segmentOpacity = (key: string) => (isDimmed(key) ? 0.45 : 1);



  let yOffset = 0;

  const posSum = stackSegments.reduce((s, seg) => s + Math.max(0, seg.value), 0);



  const bindSegment = (key: string) => ({

    onMouseEnter: () => setActiveKey(key),

    onFocus: () => setActiveKey(key),

    onBlur: () => setActiveKey((current) => (current === key ? null : current)),

    onClick: () => setActiveKey((current) => (current === key ? null : key)),

  });



  return (

    <div className="flex flex-col items-center">

      <p

        className={cn(

          "text-xs font-semibold uppercase tracking-wide",

          accent === "stay" ? "text-[#64748b]" : "text-[#fbbf24]",

        )}

      >

        {title}

      </p>

      <p

        className={cn(

          "mt-1 font-serif text-2xl font-bold tabular-nums",

          accent === "stay" ? "text-[#e2e8f0]" : "text-[#fbbf24]",

        )}

      >

        {totalLabel}

      </p>

      <p className="mt-1 text-[0.6rem] font-medium uppercase tracking-wide text-[#475569]">

        Hover or tap bar segments

      </p>

      <div className="mt-3 w-full" onMouseLeave={() => setActiveKey(null)}>

      <svg

        width={barW + 8}

        height={chartH + 8}

        viewBox={`0 0 ${barW + 8} ${chartH + 8}`}

        className="mx-auto block"

        role="group"

        aria-labelledby={panelId}

      >

        <g transform={`translate(4, 4)`}>

          {stackSegments.map((seg) => {

            const h = posSum > 0 ? (seg.value / posSum) * stackH : 0;

            const y = stackH - yOffset - h;

            yOffset += h;

            if (h < 1) return null;

            return (

              <g key={seg.key} opacity={segmentOpacity(seg.key)}>

                <rect

                  x={0}

                  y={y}

                  width={barW}

                  height={h}

                  fill={seg.color}

                  rx={seg.key === "heirs" ? 2 : 0}

                  className="cursor-pointer outline-none focus-visible:stroke-2 focus-visible:stroke-[#e2e8f0]"

                  tabIndex={0}

                  role="button"

                  aria-label={`${seg.label}, ${formatRothMoneyCompact(seg.value)}`}

                  {...bindSegment(seg.key)}

                />

                {activeKey === seg.key ? (

                  <rect

                    x={-2}

                    y={y - 2}

                    width={barW + 4}

                    height={h + 4}

                    fill="none"

                    stroke="#e2e8f0"

                    strokeWidth={2}

                    rx={3}

                    pointerEvents="none"

                  />

                ) : null}

                {h >= 28 && (

                  <text

                    x={barW / 2}

                    y={y + h / 2}

                    textAnchor="middle"

                    dominantBaseline="middle"

                    fill="#0a0a0d"

                    fontSize={8}

                    fontWeight={700}

                    pointerEvents="none"

                  >

                    {formatRothMoneyCompact(seg.value)}

                  </text>

                )}

              </g>

            );

          })}

          {taxH > 2 && taxSeg ? (

            <g opacity={segmentOpacity("taxes")}>

              <rect

                x={0}

                y={stackH + 4}

                width={barW}

                height={taxH}

                fill={ROTH_VISUAL_COLORS.taxesLight}

                rx={2}

                className="cursor-pointer outline-none focus-visible:stroke-2 focus-visible:stroke-[#e2e8f0]"

                tabIndex={0}

                role="button"

                aria-label={`${taxSeg.label}, ${formatRothMoneyCompact(taxVal)}`}

                {...bindSegment("taxes")}

              />

              <rect

                x={0}

                y={stackH + 4}

                width={barW}

                height={Math.min(4, taxH)}

                fill={ROTH_VISUAL_COLORS.taxes}

                pointerEvents="none"

              />

              {activeKey === "taxes" ? (

                <rect

                  x={-2}

                  y={stackH + 2}

                  width={barW + 4}

                  height={taxH + 4}

                  fill="none"

                  stroke="#e2e8f0"

                  strokeWidth={2}

                  rx={3}

                  pointerEvents="none"

                />

              ) : null}

              {taxH >= 22 && (

                <text

                  x={barW / 2}

                  y={stackH + 4 + taxH / 2}

                  textAnchor="middle"

                  dominantBaseline="middle"

                  fill={ROTH_VISUAL_COLORS.taxes}

                  fontSize={7}

                  fontWeight={600}

                  pointerEvents="none"

                >

                  −{formatRothMoneyCompact(taxVal)}

                </text>

              )}

            </g>

          ) : null}

          {heirTaxH > 2 && heirTaxSeg ? (

            <g opacity={segmentOpacity("heirTax")}>

              <rect

                x={0}

                y={stackH + 4 + taxH + 2}

                width={barW}

                height={heirTaxH}

                fill={ROTH_VISUAL_COLORS.taxesLight}

                rx={2}

                className="cursor-pointer outline-none focus-visible:stroke-2 focus-visible:stroke-[#e2e8f0]"

                tabIndex={0}

                role="button"

                aria-label={`${heirTaxSeg.label}, ${formatRothMoneyCompact(heirTaxVal)}`}

                {...bindSegment("heirTax")}

              />

              <rect

                x={0}

                y={stackH + 4 + taxH + 2}

                width={barW}

                height={Math.min(4, heirTaxH)}

                fill={ROTH_VISUAL_COLORS.taxes}

                pointerEvents="none"

              />

              {activeKey === "heirTax" ? (

                <rect

                  x={-2}

                  y={stackH + 2 + taxH + 2}

                  width={barW + 4}

                  height={heirTaxH + 4}

                  fill="none"

                  stroke="#e2e8f0"

                  strokeWidth={2}

                  rx={3}

                  pointerEvents="none"

                />

              ) : null}

              {heirTaxH >= 18 && (

                <text

                  x={barW / 2}

                  y={stackH + 4 + taxH + 2 + heirTaxH / 2}

                  textAnchor="middle"

                  dominantBaseline="middle"

                  fill={ROTH_VISUAL_COLORS.taxes}

                  fontSize={6}

                  fontWeight={600}

                  pointerEvents="none"

                >

                  −{formatRothMoneyCompact(heirTaxVal)}

                </text>

              )}

            </g>

          ) : null}

        </g>

      </svg>

      <ul className="mt-2 w-full space-y-1 text-[0.65rem] text-[#94a3b8]">

        {segments.map((seg) => (

          <li key={seg.key}>

            <button

              type="button"

              className={cn(

                "flex w-full items-center justify-between gap-2 rounded-sm px-1 py-0.5 text-left transition-colors hover:bg-[#1a1a24]",

                activeKey === seg.key && "bg-[#1a1a24] ring-1 ring-[#2a2a38]",

                isDimmed(seg.key) && "opacity-50",

              )}

              {...bindSegment(seg.key)}

            >

              <span className="flex items-center gap-1.5">

                <span className="inline-block h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: seg.color }} />

                {seg.label}

              </span>

              <span className="tabular-nums font-medium text-[#e2e8f0]">{formatRothMoneyCompact(seg.value)}</span>

            </button>

          </li>

        ))}

        {legendNotes?.map((note) => (

          <li key={note.key}>

            <button

              type="button"

              className={cn(

                "flex w-full items-center justify-between gap-2 rounded-sm px-1 py-0.5 text-left text-[#fbbf24] transition-colors hover:bg-[#15130a]",

                activeKey === note.key && "bg-[#15130a] ring-1 ring-[#3a3115]",

                isDimmed(note.key) && "opacity-50",

              )}

              {...bindSegment(note.key)}

            >

              <span>{note.label}</span>

              {note.value ? <span className="tabular-nums font-medium">{note.value}</span> : null}

            </button>

          </li>

        ))}

      </ul>

      <div id={panelId} className="mt-3 w-full">

        <RothChartSegmentPanel

          segment={activeDetail}

          placeholder="Hover or tap a bar segment or legend row to see what it means."

        />

      </div>

      </div>

    </div>

  );

}



export function RothWealthAllocationChart({ data, className }: RothWealthAllocationChartProps) {

  const staySegments = buildStackSegments(

    "stay",

    data,

    data.stayAfterTaxIncome,

    data.stayHeirsLegacy,

    data.stayTaxesAndIrmaa,

    data.stayHeirsTaxOnDeath,

    data.assumedHeirTaxRatePct,

  );

  const rothSegments = buildStackSegments(

    "roth",

    data,

    data.rothAfterTaxIncome,

    data.rothHeirsLegacy,

    data.rothTaxesAndIrmaa,

  );



  const stayTotal = data.stayAfterTaxIncome + data.stayHeirsLegacy;

  const rothTotal = data.rothAfterTaxIncome + data.rothHeirsLegacy;

  const taxShift = data.stayTaxesAndIrmaa - data.rothTaxesAndIrmaa;

  const heirsAdvantage = data.heirsLegacyDelta;



  const rothTaxFreeNote: LegendNote = {

    key: "taxFreeHeirs",

    label: "Tax-free to heirs (illustrated)",

    description: wealthAllocationSegmentDescription("heirs", "roth", data),

  };



  const ariaLabel = `Where the dollars go: current path total ${formatRothMoneyFull(stayTotal)}, Roth path ${formatRothMoneyFull(rothTotal)}, legacy advantage ${formatRothDeltaCompact(heirsAdvantage)}`;



  return (

    <section className={cn("space-y-4", className)} aria-label={ariaLabel}>

      <div>

        <p className="ap-eyebrow">Where the dollars go</p>

        <h3 className="mt-2 font-serif text-xl font-semibold text-[#e2e8f0] md:text-2xl">

          How your {formatRothMoneyCompact(stayTotal)} becomes {formatRothMoneyCompact(rothTotal)}

        </h3>

        <p className="mt-2 text-sm text-[#64748b]">

          Each bar splits lifetime value into income you keep and net legacy to heirs. The current path also shows

          lifetime taxes plus IRMAA and an assumed heir tax on death ({data.assumedHeirTaxRatePct}% default on

          traditional legacy). The Roth path legacy is illustrated as tax-free to heirs.{" "}

          <span className="font-medium text-[#94a3b8]">Hover or tap bar segments for details.</span>

        </p>

      </div>



      <div className="rounded-none border border-[#1e1e2e] bg-[#101017] p-4 md:p-6">

        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[1fr_auto_1fr]">

          <StackedBar

            title="Current path"

            totalLabel={formatRothMoneyCompact(stayTotal)}

            segments={staySegments}

            accent="stay"

          />



          <div className="flex flex-col items-center justify-center px-2 py-4 text-center">

            <span className="text-lg text-[#475569]" aria-hidden>

              →

            </span>

            <p className="mt-2 font-serif text-xl font-bold tabular-nums text-[#fbbf24]">

              {formatRothDeltaCompact(heirsAdvantage)}

            </p>

            <p className="mt-1 max-w-[11rem] text-[0.65rem] font-semibold uppercase tracking-wide text-[#64748b]">

              Net legacy to heirs (Roth vs current)

            </p>

            {taxShift > 0 ? (

              <p className="mt-2 max-w-[10rem] text-[0.65rem] font-semibold uppercase tracking-wide text-[#475569]">

                Shifted from taxes &amp; IRMAA

              </p>

            ) : null}

          </div>



          <StackedBar

            title="Roth conversion path"

            totalLabel={formatRothMoneyCompact(rothTotal)}

            segments={rothSegments}

            accent="roth"

            legendNotes={[rothTaxFreeNote]}

          />

        </div>



        <p className="mt-4 border-t border-[#1e1e2e] pt-3 text-[0.65rem] leading-relaxed text-[#64748b]">

          Assumed default heir tax: {data.assumedHeirTaxRatePct}% of legacy on the current path only (illustrative

          beneficiary ordinary income tax at death; not estate tax and not tax advice). Roth path legacy is shown

          tax-free to heirs — a key Roth advantage. Confirm heir tax and estate planning with a CPA and estate

          attorney.

        </p>

      </div>

    </section>

  );

}


