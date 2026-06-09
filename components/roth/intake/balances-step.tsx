"use client";

import { CurrencyAmountInput } from "@/components/currency-amount-input";
import { FormField } from "@/components/roth/form/form-field";
import { FormSection } from "@/components/roth/form/form-section";

type Props = {
  manualTraditionalQualified: string;
  onManualTraditionalQualifiedChange: (value: string) => void;
};

export function BalancesStep({ manualTraditionalQualified, onManualTraditionalQualifiedChange }: Props) {
  return (
    <FormSection
      id="intake-step-05"
      step="05 / Balances"
      title="Qualified balances"
      description="Traditional tax-deferred balance for this illustration (IRAs, 401(k)s, etc.)."
    >
      <FormField id="traditional-qualified-balance" label="Traditional qualified balance">
        <CurrencyAmountInput
          id="traditional-qualified-balance"
          className="h-12 max-w-md"
          value={manualTraditionalQualified}
          onChange={onManualTraditionalQualifiedChange}
          placeholder="500000"
        />
      </FormField>
    </FormSection>
  );
}
