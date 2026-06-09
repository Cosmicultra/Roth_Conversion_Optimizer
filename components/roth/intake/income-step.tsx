"use client";

import { CurrencyAmountInput } from "@/components/currency-amount-input";
import { FormField } from "@/components/roth/form/form-field";
import { FormSection } from "@/components/roth/form/form-section";
import { FormSubsection } from "@/components/roth/form/form-subsection";
import { YesNoSegment } from "@/components/roth/form/yes-no-segment";
import type { IntakeMode } from "@/components/roth/intake/intake-types";
import type { RothClient } from "@/lib/roth-client";
import { patchRothWorksheet, type RothWorksheet } from "@/lib/roth-worksheet";

type Props = {
  client: RothClient;
  worksheet: RothWorksheet;
  mode?: IntakeMode;
  onClientChange: (patch: Partial<RothClient>) => void;
  onWorksheetChange: (updater: (ws: RothWorksheet) => RothWorksheet) => void;
  onRetirementIncomeFromConversionChange?: (yes: boolean) => void;
};

export function IncomeStep({
  client,
  worksheet,
  onClientChange,
  onWorksheetChange,
  onRetirementIncomeFromConversionChange,
}: Props) {
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
        hint="Gross household spendable income in retirement (includes Social Security)."
      >
        <CurrencyAmountInput
          id="retirement-income-need"
          className="h-12 max-w-md"
          value={client.retirementSpendableIncomeAnnual}
          onChange={(v) => onClientChange({ retirementSpendableIncomeAnnual: v })}
          placeholder="85,000"
        />
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
    </FormSection>
  );
}
