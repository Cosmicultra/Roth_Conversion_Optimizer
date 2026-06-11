"use client";

import { useMemo, useState } from "react";
import { CurrencyAmountInput } from "@/components/currency-amount-input";
import { FormField } from "@/components/roth/form/form-field";
import { FormSection } from "@/components/roth/form/form-section";
import { FormSubsection } from "@/components/roth/form/form-subsection";
import { YesNoSegment } from "@/components/roth/form/yes-no-segment";
import { VariableIncomeDialog } from "@/components/roth/intake/variable-income-dialog";
import type { IntakeMode } from "@/components/roth/intake/intake-types";
import { Button } from "@/components/ui/button";
import { parseClientAgeForIllustration } from "@/lib/roth-inputs";
import type { RothClient } from "@/lib/roth-client";
import { formatMoneyInputDisplay } from "@/lib/money-input";
import { hasVariableRetirementIncome, patchRothWorksheet, type RothWorksheet } from "@/lib/roth-worksheet";

type Props = {
  client: RothClient;
  worksheet: RothWorksheet;
  mode?: IntakeMode;
  onClientChange: (patch: Partial<RothClient>) => void;
  onWorksheetChange: (updater: (ws: RothWorksheet) => RothWorksheet) => void;
  onRetirementIncomeFromConversionChange?: (yes: boolean) => void;
  onVariableIncomeSaved?: () => void;
};

export function IncomeStep({
  client,
  worksheet,
  onClientChange,
  onWorksheetChange,
  onRetirementIncomeFromConversionChange,
  onVariableIncomeSaved,
}: Props) {
  const [variableIncomeOpen, setVariableIncomeOpen] = useState(false);

  const illustrationStartAge = useMemo(() => parseClientAgeForIllustration(client), [client]);
  const retireAge = Math.max(50, Math.floor(Number(client.retirementAge) || 67));
  const variableYearCount = worksheet.variableRetirementIncomeAmounts.length;
  const usingVariableIncome = hasVariableRetirementIncome(worksheet.variableRetirementIncomeAmounts);

  function handleVariableIncomeSave(amounts: string[]) {
    onWorksheetChange((w) => patchRothWorksheet(w, { variableRetirementIncomeAmounts: amounts }));
    const firstAmount = amounts[0]?.trim();
    if (firstAmount) {
      onClientChange({ retirementSpendableIncomeAnnual: formatMoneyInputDisplay(firstAmount) });
    }
    onVariableIncomeSaved?.();
  }

  return (
    <FormSection
      id="intake-step-04"
      step="04 / Income"
      title="Income assumptions"
      description="Adjusted gross income and retirement income need for this illustration."
    >
      <FormField
        id="adjusted-gross-income"
        label="Adjusted Gross Income"
        hint="Form 1040, line 11 on recent-year returns."
      >
        <CurrencyAmountInput
          id="adjusted-gross-income"
          className="h-12 max-w-md"
          value={client.adjustedGrossIncomeAnnual}
          onChange={(v) => onClientChange({ adjustedGrossIncomeAnnual: v })}
          placeholder="165,432"
        />
      </FormField>
      <FormField
        id="retirement-income-need"
        label="Total retirement income need"
        hint={
          usingVariableIncome
            ? `Using variable income for ${variableYearCount} year(s). Standard 3% inflation applies after the last entered year.`
            : "Gross household spendable income in retirement (includes Social Security)."
        }
      >
        <div className="flex max-w-xl flex-wrap items-start gap-2">
          <CurrencyAmountInput
            id="retirement-income-need"
            className="h-12 min-w-0 w-full flex-1 sm:min-w-[12rem]"
            value={client.retirementSpendableIncomeAnnual}
            onChange={(v) => onClientChange({ retirementSpendableIncomeAnnual: v })}
            placeholder="85,000"
          />
          <Button
            type="button"
            variant="outline"
            className="h-12 shrink-0 rounded-none border-[#2a2a38]"
            onClick={() => setVariableIncomeOpen(true)}
          >
            Variable income
          </Button>
        </div>
      </FormField>
      <FormSubsection
        title="Retirement funding source"
        description="Yes funds the gap from the qualified IRA/conversion bucket. No treats the gap as non-IRA income."
      >
        <YesNoSegment
          label="Income received from conversion account?"
          value={worksheet.retirementIncomeFromConversionAccount}
          onChange={(yes) => {
            if (onRetirementIncomeFromConversionChange) {
              onRetirementIncomeFromConversionChange(yes);
            } else {
              onWorksheetChange((w) =>
                patchRothWorksheet(w, {
                  retirementIncomeFromConversionAccount: yes,
                  ...(yes ? {} : { incomeHoldoutReserve: "" }),
                }),
              );
            }
          }}
        />
      </FormSubsection>

      <VariableIncomeDialog
        open={variableIncomeOpen}
        onOpenChange={setVariableIncomeOpen}
        retireAge={retireAge}
        illustrationStartAge={illustrationStartAge}
        initialAmounts={worksheet.variableRetirementIncomeAmounts}
        defaultFirstYearAmount={client.retirementSpendableIncomeAnnual}
        onSave={handleVariableIncomeSave}
      />
    </FormSection>
  );
}
