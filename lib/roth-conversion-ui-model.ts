import { buildRothConversionModel, type RothConversionModelResult } from "@/lib/roth-conversion-analysis";
import type { RothClient } from "@/lib/roth-client";
import { rmdStartAgeForBirthYear, rmdStartAgeForDob } from "@/lib/rmd-engine";
import { annualSocialSecurityGrossForIllustration, parseClientAgeForIllustration, parseSpouseAgeForIllustration } from "@/lib/roth-inputs";
import {
  resolveHouseholdSocialSecurityStartAge,
  type RothSocialSecurityState,
} from "@/lib/roth-social-security";
import {
  buildMonteCarloContextFromParams,
  type RothMonteCarloContext,
} from "@/lib/roth-monte-carlo";
import {
  computeOptimizedRothPremiumAmount,
  type OptimizeRothPremiumInput,
  type OptimizeRothPremiumResult,
} from "@/lib/roth-premium-optimizer";
import {
  federalBracketIdFromWorksheetPct,
  normalizeRothWorksheet,
  parseMoneyInput,
  retirementIncomeNeedIsValid,
  type RothWorksheet,
  variableRetirementIncomeScheduleFromWorksheet,
} from "@/lib/roth-worksheet";

export type RothAdvisorUiModelResult =
  | { ok: true; model: RothConversionModelResult }
  | { ok: false; error: string };

export type RothOptimizePremiumUiResult = OptimizeRothPremiumResult;

type RothAdvisorModelParamsResult =
  | { ok: true; params: OptimizeRothPremiumInput }
  | { ok: false; error: string };

function buildRothAdvisorModelParams(
  client: RothClient,
  rothWorksheet: RothWorksheet,
  fullQualifiedBalance: number,
  options?: { minClientAge?: number; socialSecurity?: RothSocialSecurityState | null }
): RothAdvisorModelParamsResult {
  const minAge = options?.minClientAge ?? 60;
  const age = parseClientAgeForIllustration(client);
  if (age < minAge) {
    return {
      ok: false,
      error: `Roth illustration runs for clients age ${minAge} and older (current age modeled: ${age}).`,
    };
  }
  if (!Number.isFinite(fullQualifiedBalance) || fullQualifiedBalance <= 0) {
    return {
      ok: false,
      error: "No traditional qualified balance is available to optimize.",
    };
  }

  const bracketRaw = String(client.federalTaxBracket || "22").replace(/%/g, "").trim();
  const intakeFederal = ["10", "12", "22", "24", "32", "35", "37"].includes(bracketRaw) ? bracketRaw : "22";
  const ws = normalizeRothWorksheet(rothWorksheet);
  const worksheetBracketId = ws.fic.maxTaxRatePct ? federalBracketIdFromWorksheetPct(ws.fic.maxTaxRatePct) : null;
  const federal = worksheetBracketId ?? intakeFederal;

  const retireAge = Math.max(50, Math.floor(Number(client.retirementAge) || 67));
  const incomeRaw = String(client.retirementSpendableIncomeAnnual || "").replace(/[$,]/g, "");
  const need = Math.max(0, Number(incomeRaw) || 0);
  if (!retirementIncomeNeedIsValid(client.retirementSpendableIncomeAnnual, ws.variableRetirementIncomeAmounts)) {
    return {
      ok: false,
      error: "Enter total retirement income need (above) to run this illustration.",
    };
  }

  const variableRetirementIncomeSchedule = variableRetirementIncomeScheduleFromWorksheet(ws, retireAge, age);

  const marriedFilingJointly = client.married === true || String(client.married).toLowerCase() === "true";
  const annualSocialSecurityGross = annualSocialSecurityGrossForIllustration(client, options?.socialSecurity);
  const socialSecurityStartAge = resolveHouseholdSocialSecurityStartAge(client, options?.socialSecurity);

  const agiRaw = String(client.adjustedGrossIncomeAnnual || "").replace(/[$,]/g, "");
  const annualAgi = Math.max(0, Number(agiRaw) || 0);

  const useFixedIndexContract = ws.useFixedIndexContract === true;
  const protectInitialInvestment = Boolean(ws.fic.protectInitialInvestment);

  if (ws.retirementIncomeFromConversionAccount === null) {
    return {
      ok: false,
      error: 'Answer "Income received from conversion account?" (Yes or No) before running this illustration.',
    };
  }

  return {
    ok: true,
    params: {
      fullQualifiedBalance,
      currentAge: age,
      retirementAge: retireAge,
      retirementSpendableIncomeAnnual: need,
      annualSocialSecurityGross,
      socialSecurityStartAge,
      federalTaxBracketId: federal,
      marriedFilingJointly,
      annualAdjustedGrossIncomePreRetirement: annualAgi,
      protectInitialInvestment,
      useFixedIndexContract,
      contractEstimatedRateOfReturnPct: ws.fic.contractEstimatedRateOfReturnPct || "",
      ficPremiumBonusPct: ws.fic.premiumBonusPct,
      ficTrailingBonusPct: ws.fic.trailingBonusPct,
      ficTrailBonusYears: ws.fic.trailBonusYears,
      ficSurrenderYears: ws.fic.surrenderYears,
      spouseStartAge: parseSpouseAgeForIllustration(client),
      stateOfResidence: client.stateOfResidence || undefined,
      totalDeductionsAnnual: client.totalDeductionsAnnual || undefined,
      clientDob: client.dob || undefined,
      rmdStartAge: client.dob?.trim()
        ? rmdStartAgeForDob(client.dob)
        : rmdStartAgeForBirthYear(new Date().getFullYear() - age),
      payConversionTaxFrom: ws.fic.payConversionTaxFrom,
      retirementIncomeFromConversionAccount: ws.retirementIncomeFromConversionAccount,
      variableRetirementIncomeSchedule,
    },
  };
}

/**
 * Builds the same Roth illustration as {@link app/api/generate-roth-report/route.ts} for advisor UI.
 */
export function buildRothConversionModelForAdvisorUi(
  client: RothClient,
  rothWorksheet: RothWorksheet,
  conversionPremium: number,
  fullQualifiedPool?: number,
  options?: { minClientAge?: number; socialSecurity?: RothSocialSecurityState | null }
): RothAdvisorUiModelResult {
  if (!Number.isFinite(conversionPremium) || conversionPremium <= 0) {
    return {
      ok: false,
      error: "Enter a qualified balance for the illustration (choose Yes/No above and a dollar amount).",
    };
  }

  const pool =
    Number.isFinite(fullQualifiedPool) && (fullQualifiedPool as number) > 0
      ? (fullQualifiedPool as number)
      : conversionPremium;

  const built = buildRothAdvisorModelParams(client, rothWorksheet, pool, options);
  if (!built.ok) return built;

  const ws = normalizeRothWorksheet(rothWorksheet);
  const incomeHoldoutReserve =
    ws.retirementIncomeFromConversionAccount === true ? parseMoneyInput(ws.incomeHoldoutReserve) : 0;

  const { fullQualifiedBalance: _full, ...modelParams } = built.params;
  const model = buildRothConversionModel({
    ...modelParams,
    totalAccountValue: conversionPremium,
    stayTraditionalStartingBalance: pool,
    incomeHoldoutReserve,
  });

  return { ok: true, model };
}

export function buildMonteCarloContextForAdvisorUi(
  client: RothClient,
  rothWorksheet: RothWorksheet,
  fullQualifiedBalance: number,
  options?: { minClientAge?: number; socialSecurity?: RothSocialSecurityState | null }
): { ok: true; context: RothMonteCarloContext } | { ok: false; error: string } {
  const built = buildRothAdvisorModelParams(client, rothWorksheet, fullQualifiedBalance, options);
  if (!built.ok) return built;
  return { ok: true, context: buildMonteCarloContextFromParams(built.params) };
}

/** Max conversion amount within bracket ceiling (pre-RMD finish or horizon+RMD path when age 73+). */
export function computeOptimizedRothPremiumForAdvisorUi(
  client: RothClient,
  rothWorksheet: RothWorksheet,
  fullQualifiedBalance: number,
  options?: { minClientAge?: number; socialSecurity?: RothSocialSecurityState | null }
): RothOptimizePremiumUiResult {
  const built = buildRothAdvisorModelParams(client, rothWorksheet, fullQualifiedBalance, options);
  if (!built.ok) return built;
  return computeOptimizedRothPremiumAmount(built.params);
}
