"use client";

import { Button } from "@/components/ui/button";
import { CurrencyAmountInput } from "@/components/currency-amount-input";
import { FormField } from "@/components/roth/form/form-field";
import { FormSection } from "@/components/roth/form/form-section";
import { FormSubsection } from "@/components/roth/form/form-subsection";
import { YesNoSegment } from "@/components/roth/form/yes-no-segment";
import type { IntakeMode } from "@/components/roth/intake/intake-types";
import { effectiveConversionDeadlineAge, parseSurrenderYears } from "@/lib/conversion-deadlines";
import { parseClientAgeForIllustration } from "@/lib/roth-inputs";
import { RMD_ILLUSTRATION_START_AGE } from "@/lib/roth-conversion-analysis";
import type { RothClient } from "@/lib/roth-client";
import {
  patchRothWorksheet,
  patchRothWorksheetFic,
  parseMoneyInput as parseRothMoneyInput,
  type RothWorksheet,
} from "@/lib/roth-worksheet";

function currency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

type Props = {
  client: RothClient;
  worksheet: RothWorksheet;
  manualTraditionalQualified: string;
  traditionalQualifiedTotal: number;
  rothPdfQualifiedTotal: number;
  mode?: IntakeMode;
  rothOptimizePremiumDisabledReason?: string | null;
  rothOptimizePremiumHint?: string | null;
  onWorksheetChange: (updater: (ws: RothWorksheet) => RothWorksheet) => void;
  onUseEntireQualifiedBalanceChange?: (yes: boolean) => void;
  onSpecificConversionAmountChange?: (value: string) => void;
  onOptimizePremium?: () => void;
  onProtectInitialInvestmentChange?: (yes: boolean) => void;
  onPayConversionTaxFromExternalChange?: (yes: boolean) => void;
};

export function ConversionStep({
  client,
  worksheet,
  traditionalQualifiedTotal,
  rothPdfQualifiedTotal,
  mode = "advisor",
  rothOptimizePremiumDisabledReason,
  rothOptimizePremiumHint,
  onWorksheetChange,
  onUseEntireQualifiedBalanceChange,
  onSpecificConversionAmountChange,
  onOptimizePremium,
  onProtectInitialInvestmentChange,
  onPayConversionTaxFromExternalChange,
}: Props) {
  const isProspect = mode === "prospect";
  const rothClientAge = parseClientAgeForIllustration(client);

  return (
    <FormSection
      id="intake-step-06"
      step="06 / Conversion"
      title="Conversion strategy"
      description="Traditional tax-deferred balances from the qualified pool entered above."
    >
      <FormSubsection title="How much to convert?" className="mt-0 border-t-0 pt-0">
        <YesNoSegment
          label="Use the entire qualified account balance for this illustration?"
          value={worksheet.useEntireQualifiedBalance}
          onChange={(yes) => {
            if (onUseEntireQualifiedBalanceChange) {
              onUseEntireQualifiedBalanceChange(yes);
              return;
            }
            if (yes) {
              onWorksheetChange((w) => {
                const next = patchRothWorksheet(w, { useEntireQualifiedBalance: true });
                if (traditionalQualifiedTotal > 0 && parseRothMoneyInput(next.qualifiedAssetValue) <= 0) {
                  return patchRothWorksheet(next, {
                    qualifiedAssetValue: Math.round(traditionalQualifiedTotal).toLocaleString("en-US"),
                  });
                }
                return next;
              });
            } else {
              onWorksheetChange((w) => patchRothWorksheet(w, { useEntireQualifiedBalance: false }));
            }
          }}
        />
        {worksheet.useEntireQualifiedBalance === true ? (
          <FormField id="qualified-asset-value" label="Qualified asset value">
            <CurrencyAmountInput
              id="qualified-asset-value"
              className="h-12 max-w-md"
              value={worksheet.qualifiedAssetValue}
              onChange={(v) => onWorksheetChange((w) => patchRothWorksheet(w, { qualifiedAssetValue: v }))}
              placeholder="500000"
            />
          </FormField>
        ) : null}
        {worksheet.useEntireQualifiedBalance === false ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <FormField id="specific-conversion-amount" label="Specific dollar amount" className="min-w-0 w-full flex-1 sm:min-w-[12rem]">
                <CurrencyAmountInput
                  id="specific-conversion-amount"
                  className="h-12 max-w-md"
                  value={worksheet.specificConversionAmount}
                  onChange={(v) => {
                    if (onSpecificConversionAmountChange) {
                      onSpecificConversionAmountChange(v);
                    } else {
                      onWorksheetChange((w) =>
                        patchRothWorksheet(w, {
                          useEntireQualifiedBalance: false,
                          specificConversionAmount: v,
                          incomeHoldoutReserve: "",
                        }),
                      );
                    }
                  }}
                  placeholder="250,000"
                />
              </FormField>
              {!isProspect && onOptimizePremium ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 shrink-0 rounded-none border-[#2a2a38] text-[#fbbf24] hover:bg-[#1a1a24]"
                  disabled={Boolean(rothOptimizePremiumDisabledReason)}
                  title={rothOptimizePremiumDisabledReason ?? undefined}
                  onClick={onOptimizePremium}
                >
                  Optimize conversion amount
                </Button>
              ) : null}
            </div>
            {!isProspect && rothOptimizePremiumHint ? (
              <p className="text-xs text-[#94a3b8]">{rothOptimizePremiumHint}</p>
            ) : null}
          </div>
        ) : null}
        {!isProspect ? (
          <div className="rounded-none border border-[#1e1e2e] bg-[#14141d] px-4 py-2 text-xs text-[#94a3b8]">
            Traditional qualified pool:{" "}
            <span className="font-semibold text-[#e2e8f0]">{currency(traditionalQualifiedTotal)}</span>
            {" · "}
            Roth illustration after caps:{" "}
            <span className="font-semibold text-[#e2e8f0]">{currency(rothPdfQualifiedTotal || 0)}</span>
            {rothPdfQualifiedTotal <= 0 ? ". Choose Yes/No and enter an amount to run the PDF." : null}
          </div>
        ) : null}
      </FormSubsection>
      <FormSubsection
        title="Advanced"
        description="When on, the plan must finish with total Roth at or above the entered premium (conversion taxes may reduce net). When off, convert as fast as bracket and other rules allow with no ending floor."
      >
        <YesNoSegment
          label="Protect initial investment?"
          value={worksheet.fic.protectInitialInvestment}
          onChange={(yes) => {
            if (onProtectInitialInvestmentChange) {
              onProtectInitialInvestmentChange(yes);
            } else {
              onWorksheetChange((w) => patchRothWorksheetFic(w, { protectInitialInvestment: yes }));
            }
          }}
        />
        <YesNoSegment
          label="Pay conversion tax from external source?"
          value={worksheet.fic.payConversionTaxFrom === "external"}
          onChange={(yes) => {
            if (onPayConversionTaxFromExternalChange) {
              onPayConversionTaxFromExternalChange(yes);
            } else {
              onWorksheetChange((w) =>
                patchRothWorksheetFic(w, {
                  payConversionTaxFrom: yes ? "external" : "conversion_account",
                }),
              );
            }
          }}
        />
      </FormSubsection>
    </FormSection>
  );
}

export function buildOptimizePremiumHint(params: {
  client: RothClient;
  worksheet: RothWorksheet;
  result: {
    amount: number;
    holdoutReserve: number;
    protectInitialInvestment: boolean;
    marginalRateNominalPct: number;
    rmdStartAge: number;
    overlapStartAge?: number | null;
    overlapEndAge?: number | null;
  };
}): string {
  const { client, worksheet, result } = params;
  const rothClientAge = parseClientAgeForIllustration(client);
  const protectLabel = result.protectInitialInvestment ? "on" : "off";
  const totalQualified =
    result.holdoutReserve > 0 ? result.amount + result.holdoutReserve : result.amount;
  const surrenderYears =
    worksheet.useFixedIndexContract === true ? parseSurrenderYears(worksheet.fic.surrenderYears) : null;
  const effectiveDeadline = effectiveConversionDeadlineAge({
    startAge: rothClientAge,
    useFixedIndexContract: worksheet.useFixedIndexContract === true,
    ficSurrenderYears: worksheet.fic.surrenderYears,
  });
  const surrenderPaceNote =
    surrenderYears != null &&
    surrenderYears > 0 &&
    effectiveDeadline === rothClientAge + surrenderYears - 1
      ? ` Paced to finish within ${surrenderYears}-year surrender (by age ${effectiveDeadline}).`
      : "";
  const optimizedTail =
    rothClientAge >= RMD_ILLUSTRATION_START_AGE
      ? `Conversion premium ${currency(result.amount)}: optimized max within your ${result.marginalRateNominalPct}% bracket while subject to RMDs (Protect initial investment ${protectLabel}).${surrenderPaceNote}`
      : `Conversion premium ${currency(result.amount)}: optimized max within your ${result.marginalRateNominalPct}% bracket before RMD age ${result.rmdStartAge} (Protect initial investment ${protectLabel}).${surrenderPaceNote}`;
  const holdoutRmdNote =
    rothClientAge >= RMD_ILLUSTRATION_START_AGE
      ? " Holdout covers RMD on the combined traditional balance (conversions do not count toward RMD) plus any retirement income gap above RMD during conversion years."
      : "";
  if (
    worksheet.retirementIncomeFromConversionAccount === true &&
    result.holdoutReserve > 0 &&
    result.overlapStartAge != null &&
    result.overlapEndAge != null
  ) {
    return `Held out ${currency(result.holdoutReserve)} for retirement income until conversion completes (ages ${result.overlapStartAge}–${result.overlapEndAge}).${holdoutRmdNote} ${optimizedTail} Total qualified: ${currency(result.holdoutReserve)} + ${currency(result.amount)} = ${currency(totalQualified)}.`;
  }
  if (worksheet.retirementIncomeFromConversionAccount === true) {
    return `No income holdout needed. Conversion finishes before retirement income begins. ${optimizedTail}`;
  }
  return optimizedTail;
}
