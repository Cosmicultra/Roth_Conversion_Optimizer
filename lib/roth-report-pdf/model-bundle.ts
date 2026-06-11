import { emptyRothSocialSecurityState, resolveHouseholdSocialSecurityStartAge, type RothSocialSecurityState } from "@/lib/roth-social-security";
import { buildRothConversionModel } from "@/lib/roth-conversion-analysis";
import { rmdStartAgeForBirthYear, rmdStartAgeForDob } from "@/lib/rmd-engine";
import { annualSocialSecurityGrossForIllustration, parseClientAgeForIllustration, parseSpouseAgeForIllustration } from "@/lib/roth-inputs";
import {
  federalBracketIdFromWorksheetPct,
  normalizeRothWorksheet,
  parseMoneyInput,
  retirementIncomeNeedIsValid,
  rothFullQualifiedPoolBalance,
  variableRetirementIncomeScheduleFromWorksheet,
} from "@/lib/roth-worksheet";
import type { RothMonteCarloResult } from "@/lib/roth-monte-carlo";
import type { RothReportModelBundle } from "@/lib/roth-report-pdf/types";

function parseMonteCarloResult(raw: unknown): RothMonteCarloResult | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const num = (k: string) => {
    const v = Number(o[k]);
    return Number.isFinite(v) ? v : null;
  };
  const rothWinPct = num("rothWinPct");
  const stayWinPct = num("stayWinPct");
  const simulationCount = num("simulationCount");
  if (rothWinPct == null || stayWinPct == null || simulationCount == null) return null;
  const cfg =
    o.config != null && typeof o.config === "object"
      ? (o.config as Record<string, unknown>)
      : {};
  return {
    rothWinPct,
    stayWinPct,
    tiePct: num("tiePct") ?? 0,
    rothEndingMedian: num("rothEndingMedian") ?? 0,
    stayEndingMedian: num("stayEndingMedian") ?? 0,
    medianWealthDelta: num("medianWealthDelta") ?? 0,
    rothEndingP10: num("rothEndingP10") ?? 0,
    rothEndingP50: num("rothEndingP50") ?? 0,
    rothEndingP90: num("rothEndingP90") ?? 0,
    stayEndingP10: num("stayEndingP10") ?? 0,
    stayEndingP50: num("stayEndingP50") ?? 0,
    stayEndingP90: num("stayEndingP90") ?? 0,
    stayNegativeReturnYearsMedian: num("stayNegativeReturnYearsMedian") ?? 0,
    ficZeroCreditYearsMedian: num("ficZeroCreditYearsMedian") ?? 0,
    simulationCount: Math.floor(simulationCount),
    config: {
      simulationCount: Math.floor(simulationCount),
      indexMeanAnnual: Number(cfg.indexMeanAnnual) || 0.1,
      indexVolAnnual: Number(cfg.indexVolAnnual) || 0.16,
    },
    disclaimer: typeof o.disclaimer === "string" ? o.disclaimer : "",
  };
}

/**
 * Validates intake + worksheet and builds the Roth conversion model.
 * @throws Error with advisor-facing message when inputs are invalid.
 */
export function buildRothReportModelBundle(body: unknown): RothReportModelBundle {
  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const client = (payload.client && typeof payload.client === "object" ? payload.client : {}) as Record<string, unknown>;
  const rothWorksheet =
    payload.rothWorksheet != null && typeof payload.rothWorksheet === "object"
      ? normalizeRothWorksheet(payload.rothWorksheet)
      : null;
  const socialSecurity =
    payload.socialSecurity != null && typeof payload.socialSecurity === "object"
      ? ({ ...emptyRothSocialSecurityState(), ...(payload.socialSecurity as RothSocialSecurityState) })
      : null;

  const conversionPremium = Number(payload.totalValue);
  if (!Number.isFinite(conversionPremium) || conversionPremium <= 0) {
    throw new Error("totalValue must be a positive number.");
  }
  const payloadFullPool = Number(payload.fullQualifiedPool);
  const traditionalQualifiedTotal = Number(payload.traditionalQualifiedTotal);
  const fullQualifiedPool =
    Number.isFinite(payloadFullPool) && payloadFullPool > 0
      ? payloadFullPool
      : rothWorksheet != null
        ? rothFullQualifiedPoolBalance(
            rothWorksheet,
            Number(payload.portfolioStatementTotal) || conversionPremium,
            Number.isFinite(traditionalQualifiedTotal) && traditionalQualifiedTotal > 0
              ? traditionalQualifiedTotal
              : undefined
          )
        : conversionPremium;

  const age = parseClientAgeForIllustration(client);
  if (age < 60) {
    throw new Error("Roth Option report is only generated for clients age 60 and older.");
  }

  const bracketRaw = String(client.federalTaxBracket || "22").replace(/%/g, "").trim();
  const intakeFederal = ["10", "12", "22", "24", "32", "35", "37"].includes(bracketRaw) ? bracketRaw : "22";
  const worksheetBracketId = rothWorksheet?.fic?.maxTaxRatePct
    ? federalBracketIdFromWorksheetPct(rothWorksheet.fic.maxTaxRatePct)
    : null;
  const federal = worksheetBracketId ?? intakeFederal;

  const retireAge = Math.max(50, Math.floor(Number(client.retirementAge) || 67));
  const incomeRaw = String(client.retirementSpendableIncomeAnnual || "").replace(/[$,]/g, "");
  const need = Math.max(0, Number(incomeRaw) || 0);
  if (
    !retirementIncomeNeedIsValid(
      String(client.retirementSpendableIncomeAnnual ?? ""),
      rothWorksheet?.variableRetirementIncomeAmounts ?? []
    )
  ) {
    throw new Error("Enter total retirement income need to run this Roth illustration.");
  }

  const variableRetirementIncomeSchedule = rothWorksheet
    ? variableRetirementIncomeScheduleFromWorksheet(rothWorksheet, retireAge, age)
    : undefined;

  const marriedFilingJointly = Boolean(client.married === true || String(client.married).toLowerCase() === "true");
  const annualSocialSecurityGross = annualSocialSecurityGrossForIllustration(client, socialSecurity);
  const socialSecurityStartAge = resolveHouseholdSocialSecurityStartAge(client, socialSecurity);

  const agiRaw = String(client.adjustedGrossIncomeAnnual || "").replace(/[$,]/g, "");
  const annualAgi = Math.max(0, Number(agiRaw) || 0);

  const useFixedIndexContract = rothWorksheet?.useFixedIndexContract === true;
  const protectInitialInvestment = Boolean(rothWorksheet?.fic?.protectInitialInvestment);

  if (rothWorksheet === null || rothWorksheet.retirementIncomeFromConversionAccount === null) {
    throw new Error(
      'Answer "Income received from conversion account?" (Yes or No) on the Roth worksheet before generating this report.'
    );
  }

  const incomeHoldoutReserve =
    rothWorksheet.retirementIncomeFromConversionAccount === true
      ? parseMoneyInput(rothWorksheet.incomeHoldoutReserve)
      : 0;

  const model = buildRothConversionModel({
    totalAccountValue: conversionPremium,
    stayTraditionalStartingBalance: fullQualifiedPool,
    incomeHoldoutReserve,
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
    contractEstimatedRateOfReturnPct: rothWorksheet?.fic?.contractEstimatedRateOfReturnPct || "",
    ficPremiumBonusPct: rothWorksheet?.fic?.premiumBonusPct,
    ficTrailingBonusPct: rothWorksheet?.fic?.trailingBonusPct,
    ficTrailBonusYears: rothWorksheet?.fic?.trailBonusYears,
    ficSurrenderYears: rothWorksheet?.fic?.surrenderYears,
    spouseStartAge: parseSpouseAgeForIllustration(client),
    stateOfResidence: String(client.stateOfResidence ?? "").trim() || undefined,
    totalDeductionsAnnual: String(client.totalDeductionsAnnual ?? "").trim() || undefined,
    clientDob: String(client.dob ?? "").trim() || undefined,
    rmdStartAge: String(client.dob ?? "").trim()
      ? rmdStartAgeForDob(String(client.dob))
      : rmdStartAgeForBirthYear(new Date().getFullYear() - age),
    payConversionTaxFrom: rothWorksheet?.fic?.payConversionTaxFrom ?? "conversion_account",
    retirementIncomeFromConversionAccount: rothWorksheet.retirementIncomeFromConversionAccount,
    variableRetirementIncomeSchedule,
  });

  return {
    client,
    model,
    need,
    age,
    totalValue: conversionPremium,
    useEntireQualifiedBalance: rothWorksheet?.useEntireQualifiedBalance ?? null,
    monteCarlo: parseMonteCarloResult(payload.monteCarlo),
  };
}
