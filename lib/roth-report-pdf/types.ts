import type { RothConversionModelResult } from "@/lib/roth-conversion-analysis";
import type { RothMonteCarloResult } from "@/lib/roth-monte-carlo";

export type RothReportModelBundle = {
  client: Record<string, unknown>;
  model: RothConversionModelResult;
  need: number;
  age: number;
  totalValue: number;
  useEntireQualifiedBalance: boolean | null;
  monteCarlo: RothMonteCarloResult | null;
};
