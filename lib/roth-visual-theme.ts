/** McKinsey-inspired Roth intake chart palette — brand blues + Roth PDF. */

export const ROTH_VISUAL_COLORS = {

  stay: "#64748b",

  stayLight: "#2a2a38",

  /** Roth conversion path — amber accent. */

  roth: "#fbbf24",

  rothLight: "#231a05",

  heirs: "#38bdf8",

  income: "#fbbf24",

  taxes: "#f87171",

  taxesLight: "#3a1414",

  accent: "#fbbf24",

  navy: "#0c0c0f",

  /** Readable text on bright amber/sky fills. */

  onBrandLight: "#0c0c0f",

  muted: "#64748b",

  convertZone: "#fbbf24",

  convertZoneLight: "#231a05",

  stopLine: "#e2e8f0",

  avoidZone: "#f87171",

  avoidZoneLight: "#2a1414",

} as const;



const moneyFull = new Intl.NumberFormat("en-US", {

  style: "currency",

  currency: "USD",

  maximumFractionDigits: 0,

});



/** Full USD for detail labels (e.g. $768,700). */

export function formatRothMoneyFull(n: number): string {

  if (!Number.isFinite(n)) return "N/A";

  return moneyFull.format(Math.round(n));

}



/** Compact USD for chart headlines (e.g. $9.56M, $172.7K). */

export function formatRothMoneyCompact(n: number): string {

  if (!Number.isFinite(n)) return "N/A";

  const abs = Math.abs(n);

  const sign = n < 0 ? "-" : "";

  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;

  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;

  if (abs >= 10_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;

  return `${sign}${moneyFull.format(Math.round(abs))}`;

}



/** Signed compact delta with explicit + prefix when positive. */

export function formatRothDeltaCompact(n: number): string {

  if (!Number.isFinite(n)) return "N/A";

  if (n > 0) return `+${formatRothMoneyCompact(n)}`;

  if (n < 0) return `-${formatRothMoneyCompact(Math.abs(n))}`;

  return formatRothMoneyCompact(0);

}



/** Percent with one decimal, signed when requested. */

export function formatRothPct(n: number, signed = false): string {

  if (!Number.isFinite(n)) return "N/A";

  const rounded = Math.round(n * 10) / 10;

  if (signed && rounded > 0) return `+${rounded}%`;

  if (signed && rounded < 0) return `${rounded}%`;

  return `${rounded}%`;

}



/** Effective rate display (e.g. 32.6%). */

export function formatEffectiveRate(n: number): string {

  if (!Number.isFinite(n)) return "N/A";

  return `${(Math.round(n * 10) / 10).toFixed(1)}%`;

}

