import type { RothConversionModelResult } from "@/lib/roth-conversion-analysis";
import type { RothClient } from "@/lib/roth-client";
import { buildRothConversionModelForAdvisorUi } from "@/lib/roth-conversion-ui-model";
import type { RothSocialSecurityState } from "@/lib/roth-social-security";
import {
  federalBracketIdFromWorksheetPct,
  normalizeRothWorksheet,
  parseMoneyInput,
  type RothWorksheet,
} from "@/lib/roth-worksheet";

export type RothConversionFeasibilityCode =
  | "bracket_exhausted"
  | "holdout_exceeds_balance"
  | "build_failed";

export type RothConversionFeasibilityResult =
  | { ok: true; model: RothConversionModelResult }
  | { ok: false; code: RothConversionFeasibilityCode; message: string };

function resolveFederalBracketId(client: RothClient, worksheet: RothWorksheet): string {
  const bracketRaw = String(client.federalTaxBracket || "22").replace(/%/g, "").trim();
  const intakeFederal = ["10", "12", "22", "24", "32", "35", "37"].includes(bracketRaw) ? bracketRaw : "22";
  const ws = normalizeRothWorksheet(worksheet);
  const worksheetBracketId = ws.fic.maxTaxRatePct ? federalBracketIdFromWorksheetPct(ws.fic.maxTaxRatePct) : null;
  return worksheetBracketId ?? intakeFederal;
}

export function bracketExhaustedMessage(bracketId: string): string {
  return `Your reported income and retirement income need already use your selected maximum tax bracket (${bracketId}%), leaving no room for Roth conversions at this rate. Please select a higher maximum tax bracket to continue.`;
}

function classifyInfeasibility(
  client: RothClient,
  worksheet: RothWorksheet,
  model: RothConversionModelResult
): { code: RothConversionFeasibilityCode; message: string } {
  const ws = normalizeRothWorksheet(worksheet);
  const bracketId = resolveFederalBracketId(client, worksheet);

  if (ws.retirementIncomeFromConversionAccount === true) {
    const holdout = parseMoneyInput(ws.incomeHoldoutReserve);
    const pool = model.stayTraditional[0]?.yearStartBalance ?? model.startingBalance;
    if (holdout >= pool && pool > 0) {
      return {
        code: "holdout_exceeds_balance",
        message:
          "Retirement income holdout exceeds the qualified balance. Reduce retirement income need or increase qualified balance.",
      };
    }
  }

  const conversionYears = model.rothConversion.filter((row) => !row.rothOnlyPhase);
  const allZeroCap =
    conversionYears.length > 0 &&
    conversionYears.every((row) => (row.capFromBracketConversion ?? 0) < 1);

  if (allZeroCap) {
    return { code: "bracket_exhausted", message: bracketExhaustedMessage(bracketId) };
  }

  return { code: "bracket_exhausted", message: bracketExhaustedMessage(bracketId) };
}

export function assessRothConversionFeasibility(
  client: RothClient,
  rothWorksheet: RothWorksheet,
  conversionPremium: number,
  fullQualifiedPool?: number,
  options?: { minClientAge?: number; socialSecurity?: RothSocialSecurityState | null }
): RothConversionFeasibilityResult {
  const built = buildRothConversionModelForAdvisorUi(
    client,
    rothWorksheet,
    conversionPremium,
    fullQualifiedPool,
    options
  );

  if (!built.ok) {
    return { ok: false, code: "build_failed", message: built.error };
  }

  if (built.model.rothConversionTotals.totalGrossConversion < 1) {
    const { code, message } = classifyInfeasibility(client, rothWorksheet, built.model);
    return { ok: false, code, message };
  }

  return { ok: true, model: built.model };
}
