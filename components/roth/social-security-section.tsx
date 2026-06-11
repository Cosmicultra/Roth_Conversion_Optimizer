"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { CurrencyAmountInput } from "@/components/currency-amount-input";
import { FormField } from "@/components/roth/form/form-field";
import { FormSection } from "@/components/roth/form/form-section";
import { FormSubsection } from "@/components/roth/form/form-subsection";
import { OptionSegment } from "@/components/roth/form/option-segment";
import { YesNoSegment } from "@/components/roth/form/yes-no-segment";
import type { RothClient } from "@/lib/roth-client";
import {
  clientBirthYear,
  resolveSocialSecurityMonthly,
  resolveSocialSecurityStartAgeClient,
  resolveSocialSecurityStartAgeSpouse,
  spouseBirthYear,
  type RothSocialSecurityState,
} from "@/lib/roth-social-security";
import { parseClientAgeForIllustration } from "@/lib/roth-inputs";

function currency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

type Props = {
  client: RothClient;
  socialSecurity: RothSocialSecurityState;
  onClientChange: (patch: Partial<RothClient>) => void;
  onSocialSecurityChange: (patch: Partial<RothSocialSecurityState>) => void;
};

const SS_KNOW_OPTIONS = [
  { value: "yes" as const, label: "Yes" },
  { value: "no" as const, label: "No, estimate" },
];

export function SocialSecuritySection({
  client,
  socialSecurity,
  onClientChange,
  onSocialSecurityChange,
}: Props) {
  const clientAgeStart = useMemo(() => parseClientAgeForIllustration(client), [client]);
  const spouseAgeStart = useMemo(() => {
    if (!client.married) return null;
    const n = Number(client.spouseAge);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
    return clientAgeStart > 0 ? clientAgeStart : 62;
  }, [client.married, client.spouseAge, clientAgeStart]);

  const resolved = useMemo(
    () => resolveSocialSecurityMonthly(client, socialSecurity),
    [client, socialSecurity]
  );

  const resolvedSsStartClient = useMemo(
    () => resolveSocialSecurityStartAgeClient(client, socialSecurity),
    [client, socialSecurity]
  );
  const resolvedSsStartSpouse = useMemo(
    () => resolveSocialSecurityStartAgeSpouse(client, socialSecurity),
    [client, socialSecurity]
  );

  const clientBirthYearVal = useMemo(() => clientBirthYear(client), [client]);
  const spouseBirthYearVal = useMemo(() => spouseBirthYear(client), [client]);

  function patchSs(patch: Partial<RothSocialSecurityState>) {
    onSocialSecurityChange(patch);
  }

  function setTakingSocialSecurity(taking: boolean) {
    if (taking) {
      onClientChange({ takingSocialSecurity: true });
      return;
    }
    onClientChange({
      takingSocialSecurity: false,
      socialSecurityMonthlyClient: "",
      socialSecurityMonthlySpouse: "",
    });
  }

  const ssKnowValue =
    socialSecurity.ssKnowBenefit === "yes" || socialSecurity.ssKnowBenefit === "no"
      ? socialSecurity.ssKnowBenefit
      : null;

  return (
    <FormSection id="intake-step-03" step="03 / Social Security" title="Social Security">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-[#94a3b8]">
          Combined annual benefit:{" "}
          <span className="font-semibold text-[#e2e8f0]">{currency(resolved.combinedAnnual)}</span>
          {socialSecurity.ssKnowBenefit === "unset" && !client.takingSocialSecurity
            ? ". Complete the questions below."
            : null}
        </p>
        <a
          href="https://www.ssa.gov/OACT/quickcalc/"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs font-semibold text-[#fbbf24] underline decoration-[#3a3115] underline-offset-2 hover:text-[#fcd34d]"
        >
          SSA Quick Calculator
        </a>
      </div>

      <YesNoSegment
        label="Taking Social Security?"
        value={client.takingSocialSecurity}
        onChange={setTakingSocialSecurity}
      />

      {client.takingSocialSecurity ? (
        <div className="space-y-4">
          <p className="text-xs text-[#94a3b8]">
            Enter monthly benefit amounts for this illustration.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField id="ss-client-monthly-receiving" label="Client (monthly)">
              <div className="flex h-12 max-w-md items-center overflow-hidden rounded-none border border-[#2a2a38] bg-[#14141d] focus-within:border-[#fbbf24]">
                <span className="pl-4 text-lg font-medium text-[#94a3b8]">$</span>
                <Input
                  id="ss-client-monthly-receiving"
                  className="h-full flex-1 border-0 bg-transparent pl-1 pr-4 shadow-none focus-visible:ring-0"
                  type="text"
                  inputMode="decimal"
                  value={socialSecurity.ssMonthlyClient}
                  onChange={(e) => {
                    patchSs({ ssMonthlyClient: e.target.value });
                    onClientChange({ socialSecurityMonthlyClient: e.target.value });
                  }}
                  placeholder="0"
                />
              </div>
            </FormField>
            {client.married ? (
              <FormField id="ss-spouse-monthly-receiving" label="Spouse (monthly)">
                <div className="flex h-12 max-w-md items-center overflow-hidden rounded-none border border-[#2a2a38] bg-[#14141d] focus-within:border-[#fbbf24]">
                  <span className="pl-4 text-lg font-medium text-[#94a3b8]">$</span>
                  <Input
                    id="ss-spouse-monthly-receiving"
                    className="h-full flex-1 border-0 bg-transparent pl-1 pr-4 shadow-none focus-visible:ring-0"
                    type="text"
                    inputMode="decimal"
                    value={socialSecurity.ssMonthlySpouse}
                    onChange={(e) => {
                      patchSs({ ssMonthlySpouse: e.target.value });
                      onClientChange({ socialSecurityMonthlySpouse: e.target.value });
                    }}
                    placeholder="0"
                  />
                </div>
              </FormField>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <OptionSegment
            label="Do you know the estimated monthly retirement benefit?"
            ariaLabel="Know estimated monthly retirement benefit"
            value={ssKnowValue}
            options={SS_KNOW_OPTIONS}
            onChange={(v) => patchSs({ ssKnowBenefit: v })}
          />

          {socialSecurity.ssKnowBenefit === "yes" ? (
            <div className="space-y-4">
              <p className="text-xs text-[#94a3b8]">Enter monthly amounts in today&apos;s dollars.</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField id="ss-client-monthly-known" label="Client (monthly)">
                  <div className="flex h-12 max-w-md items-center overflow-hidden rounded-none border border-[#2a2a38] bg-[#14141d] focus-within:border-[#fbbf24]">
                    <span className="pl-4 text-lg font-medium text-[#94a3b8]">$</span>
                    <Input
                      id="ss-client-monthly-known"
                      className="h-full flex-1 border-0 bg-transparent pl-1 pr-4 shadow-none focus-visible:ring-0"
                      type="text"
                      inputMode="decimal"
                      value={socialSecurity.ssMonthlyClient}
                      onChange={(e) => patchSs({ ssMonthlyClient: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </FormField>
                {client.married ? (
                  <FormField id="ss-spouse-monthly-known" label="Spouse (monthly)">
                    <div className="flex h-12 max-w-md items-center overflow-hidden rounded-none border border-[#2a2a38] bg-[#14141d] focus-within:border-[#fbbf24]">
                      <span className="pl-4 text-lg font-medium text-[#94a3b8]">$</span>
                      <Input
                        id="ss-spouse-monthly-known"
                        className="h-full flex-1 border-0 bg-transparent pl-1 pr-4 shadow-none focus-visible:ring-0"
                        type="text"
                        inputMode="decimal"
                        value={socialSecurity.ssMonthlySpouse}
                        onChange={(e) => patchSs({ ssMonthlySpouse: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </FormField>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  id="ss-start-age-client"
                  label="Benefit start age (client)"
                  hint={`Resolved: ${resolvedSsStartClient}. Blank uses client retirement age.`}
                >
                  <Input
                    id="ss-start-age-client"
                    className="h-12 w-full rounded-none sm:max-w-[12rem]"
                    type="text"
                    inputMode="numeric"
                    value={socialSecurity.ssStartAgeClient}
                    onChange={(e) => patchSs({ ssStartAgeClient: e.target.value })}
                    placeholder="Blank = auto"
                  />
                </FormField>
                {client.married ? (
                  <FormField
                    id="ss-start-age-spouse"
                    label="Benefit start age (spouse)"
                    hint={`Resolved: ${resolvedSsStartSpouse}. Blank uses spouse retirement age.`}
                  >
                    <Input
                      id="ss-start-age-spouse"
                      className="h-12 w-full rounded-none sm:max-w-[12rem]"
                      type="text"
                      inputMode="numeric"
                      value={socialSecurity.ssStartAgeSpouse}
                      onChange={(e) => patchSs({ ssStartAgeSpouse: e.target.value })}
                      placeholder="Blank = auto"
                    />
                  </FormField>
                ) : null}
              </div>
            </div>
          ) : null}

          {socialSecurity.ssKnowBenefit === "no" ? (
            <div className="space-y-4 rounded-none border border-[#3a3115] bg-[#15130a] p-4 md:p-5">
              <FormSubsection
                title="Estimate benefits"
                description="Approximates SSA Quick Calculator from covered earnings and years worked. Illustrative only."
                className="mt-0 border-t-0 pt-0"
              >
                <div className={`grid grid-cols-1 gap-6 ${client.married ? "lg:grid-cols-2" : ""}`}>
                  <div className="space-y-4">
                    <p className="text-xs text-[#94a3b8]">
                      Client · age {client.age?.trim() || "N/A"}
                      {clientBirthYearVal != null ? ` · birth year ${clientBirthYearVal}` : ""}
                    </p>
                    <FormField id="ss-est-client-earnings" label="Annual covered earnings (SS wages)">
                      <CurrencyAmountInput
                        id="ss-est-client-earnings"
                        className="h-12 max-w-md rounded-none"
                        inputClassName="text-sm"
                        value={socialSecurity.ssEstClientAnnual}
                        onChange={(v) => patchSs({ ssEstClientAnnual: v })}
                        placeholder="85,000"
                      />
                    </FormField>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField id="ss-est-client-years" label="Years worked (1–35)">
                        <Input
                          id="ss-est-client-years"
                          className="h-12 rounded-none text-sm"
                          type="text"
                          inputMode="numeric"
                          value={socialSecurity.ssEstClientYears}
                          onChange={(e) => patchSs({ ssEstClientYears: e.target.value })}
                          placeholder={`Auto ${Math.min(35, Math.max(1, clientAgeStart - 22))}`}
                        />
                      </FormField>
                      <FormField id="ss-est-client-claim-age" label="Start benefits (age)">
                        <Input
                          id="ss-est-client-claim-age"
                          className="h-12 rounded-none text-sm"
                          type="text"
                          inputMode="numeric"
                          value={socialSecurity.ssEstClientClaimAge}
                          onChange={(e) => patchSs({ ssEstClientClaimAge: e.target.value })}
                          placeholder={`Default ${Math.min(70, Math.max(62, Math.floor(Number(client.retirementAge) || 67)))}`}
                        />
                      </FormField>
                    </div>
                    <div className="border-t border-[#1e1e2e] pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Estimated monthly</p>
                      <p className="mt-1 font-serif text-2xl font-bold tabular-nums text-[#e2e8f0]">
                        {resolved.estimatorClientMonthly != null ? currency(resolved.estimatorClientMonthly) : "N/A"}
                      </p>
                    </div>
                  </div>

                  {client.married ? (
                    <div className="space-y-4">
                      <p className="text-xs text-[#94a3b8]">
                        Spouse · age {client.spouseAge?.trim() || "N/A"}
                        {spouseBirthYearVal != null ? ` · birth year ${spouseBirthYearVal}` : ""}
                      </p>
                      <FormField id="ss-est-spouse-earnings" label="Annual covered earnings (SS wages)">
                        <CurrencyAmountInput
                          id="ss-est-spouse-earnings"
                          className="h-12 max-w-md rounded-none"
                          inputClassName="text-sm"
                          value={socialSecurity.ssEstSpouseAnnual}
                          onChange={(v) => patchSs({ ssEstSpouseAnnual: v })}
                          placeholder="72,000"
                        />
                      </FormField>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField id="ss-est-spouse-years" label="Years worked (1–35)">
                          <Input
                            id="ss-est-spouse-years"
                            className="h-12 rounded-none text-sm"
                            type="text"
                            inputMode="numeric"
                            value={socialSecurity.ssEstSpouseYears}
                            onChange={(e) => patchSs({ ssEstSpouseYears: e.target.value })}
                            placeholder={
                              spouseAgeStart != null
                                ? `Auto ${Math.min(35, Math.max(1, spouseAgeStart - 22))}`
                                : "Auto"
                            }
                          />
                        </FormField>
                        <FormField id="ss-est-spouse-claim-age" label="Start benefits (age)">
                          <Input
                            id="ss-est-spouse-claim-age"
                            className="h-12 rounded-none text-sm"
                            type="text"
                            inputMode="numeric"
                            value={socialSecurity.ssEstSpouseClaimAge}
                            onChange={(e) => patchSs({ ssEstSpouseClaimAge: e.target.value })}
                            placeholder={`Default ${Math.min(70, Math.max(62, Math.floor(Number(client.spouseRetirementAge || client.retirementAge) || 67)))}`}
                          />
                        </FormField>
                      </div>
                      <YesNoSegment
                        label="Include spousal benefit check?"
                        hint="Compares spouse's own record to 50% of worker PIA. Off uses own record only."
                        value={socialSecurity.ssUseSpousalModel}
                        onChange={(v) => patchSs({ ssUseSpousalModel: v })}
                      />
                      {socialSecurity.ssUseSpousalModel ? (
                        <p className="text-xs text-[#94a3b8]">
                          Worker PIA (illustrative):{" "}
                          <span className="font-semibold tabular-nums text-[#e2e8f0]">
                            {resolved.workerPiaMonthly != null ? currency(resolved.workerPiaMonthly) : "N/A"}
                          </span>
                        </p>
                      ) : null}
                      <div className="border-t border-[#1e1e2e] pt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Estimated monthly</p>
                        <p className="mt-1 font-serif text-2xl font-bold tabular-nums text-[#e2e8f0]">
                          {resolved.estimatorSpouseMonthly != null ? currency(resolved.estimatorSpouseMonthly) : "N/A"}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </FormSubsection>
            </div>
          ) : null}
        </div>
      )}
    </FormSection>
  );
}
