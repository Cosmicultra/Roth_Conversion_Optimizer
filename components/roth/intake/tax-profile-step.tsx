"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyAmountInput } from "@/components/currency-amount-input";
import { FormField } from "@/components/roth/form/form-field";
import { FormSection } from "@/components/roth/form/form-section";
import { FormSubsection } from "@/components/roth/form/form-subsection";
import { FEDERAL_TAX_BRACKET_IDS, type RothClient } from "@/lib/roth-client";
import { hasLegacyFlatStateTaxPct } from "@/lib/roth-session-storage";
import { listStatesForDropdown } from "@/lib/state-income-tax";
import { patchRothWorksheetFic, type RothWorksheet } from "@/lib/roth-worksheet";

type Props = {
  client: RothClient;
  worksheet: RothWorksheet;
  onClientChange: (patch: Partial<RothClient>) => void;
  onWorksheetChange: (updater: (ws: RothWorksheet) => RothWorksheet) => void;
};

export function TaxProfileStep({ client, worksheet, onClientChange, onWorksheetChange }: Props) {
  return (
    <FormSection id="intake-step-02" step="02 / Tax profile" title="Tax & retirement timing">
      <FormSubsection title="Federal & retirement" className="mt-0 border-t-0 pt-0">
        <FormField id="federal-tax-bracket" label="Federal marginal tax bracket">
          <Select
            value={client.federalTaxBracket || "22"}
            onValueChange={(v) => onClientChange({ federalTaxBracket: v })}
          >
            <SelectTrigger id="federal-tax-bracket" className="h-12 w-full rounded-none sm:max-w-[12rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FEDERAL_TAX_BRACKET_IDS.map((id) => (
                <SelectItem key={id} value={id}>
                  {id}%
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="client-retirement-age" label="Client retirement age">
            <Input
              id="client-retirement-age"
              className="h-12 w-full rounded-none sm:max-w-[12rem]"
              type="number"
              value={client.retirementAge}
              onChange={(e) => onClientChange({ retirementAge: e.target.value })}
              placeholder="67"
            />
          </FormField>
          {client.married ? (
            <FormField id="spouse-retirement-age" label="Spouse retirement age">
              <Input
                id="spouse-retirement-age"
                className="h-12 w-full rounded-none sm:max-w-[12rem]"
                type="number"
                value={client.spouseRetirementAge}
                onChange={(e) => onClientChange({ spouseRetirementAge: e.target.value })}
                placeholder="67"
              />
            </FormField>
          ) : null}
        </div>
      </FormSubsection>
      <FormSubsection
        title="Illustration tax caps"
        description="Max tax rate for conversion pacing. State of residence uses 2025 state brackets; leave blank for no state tax. Total deductions override replaces standard deduction when entered."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="max-tax-rate" label="Max tax rate %">
            <Input
              id="max-tax-rate"
              className="h-12 w-full rounded-none sm:max-w-[12rem]"
              type="text"
              inputMode="decimal"
              value={worksheet.fic.maxTaxRatePct}
              onChange={(e) =>
                onWorksheetChange((w) => patchRothWorksheetFic(w, { maxTaxRatePct: e.target.value }))
              }
              placeholder="e.g. 22"
            />
          </FormField>
          <FormField id="state-of-residence" label="State of residence">
            <Select
              value={client.stateOfResidence || "_none"}
              onValueChange={(v) => onClientChange({ stateOfResidence: v === "_none" ? "" : v })}
            >
              <SelectTrigger id="state-of-residence" className="h-12 w-full rounded-none sm:max-w-[12rem]">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None (0% state)</SelectItem>
                {listStatesForDropdown().map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.name} ({s.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasLegacyFlatStateTaxPct(worksheet, client) ? (
              <p className="mt-1 text-xs text-amber-700">
                A legacy flat state tax % is saved on this profile but is no longer used. Select a state of residence
                above for 2025 state bracket illustration.
              </p>
            ) : null}
          </FormField>
          <FormField id="total-deductions" label="Total deductions (optional)">
            <CurrencyAmountInput
              id="total-deductions"
              value={client.totalDeductionsAnnual}
              onChange={(v) => onClientChange({ totalDeductionsAnnual: v })}
              placeholder="Standard if blank"
            />
          </FormField>
        </div>
      </FormSubsection>
    </FormSection>
  );
}
