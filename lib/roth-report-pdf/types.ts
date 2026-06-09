import type { RothConversionModelResult } from "@/lib/roth-conversion-analysis";

export type RothReportModelBundle = {
  client: Record<string, unknown>;
  model: RothConversionModelResult;
  need: number;
  age: number;
  totalValue: number;
};
