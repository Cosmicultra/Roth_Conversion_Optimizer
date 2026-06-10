import type { RothClient } from "@/lib/roth-client";
import { parseClientAgeForIllustration } from "@/lib/roth-inputs";
import type { RothSocialSecurityState } from "@/lib/roth-social-security";
import { normalizeRothWorksheet, parseMoneyInput, retirementIncomeNeedIsValid, type RothWorksheet } from "@/lib/roth-worksheet";

export type ProspectWizardStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

function parseBalance(raw: string): number {
  const n = parseMoneyInput(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function validateLeadCapture(firstName: string, lastName: string, email: string): string | null {
  if (!firstName.trim()) return "Enter your first name.";
  if (!lastName.trim()) return "Enter your last name.";
  if (!email.trim()) return "Enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address.";
  return null;
}

export function validateProspectStep(
  step: ProspectWizardStep,
  client: RothClient,
  worksheet: RothWorksheet,
  socialSecurity: RothSocialSecurityState,
  manualTraditionalQualified: string,
): string | null {
  const ws = normalizeRothWorksheet(worksheet);

  switch (step) {
    case 1: {
      if (!client.age.trim()) return "Enter your current age.";
      const age = parseClientAgeForIllustration(client);
      if (!Number.isFinite(age) || age < 18) return "Enter a valid age.";
      if (client.married) {
        if (!client.spouseAge.trim()) return "Enter your spouse's current age.";
      }
      return null;
    }
    case 2: {
      if (!client.retirementAge.trim()) return "Enter your retirement age.";
      if (client.married && !client.spouseRetirementAge.trim()) return "Enter your spouse's retirement age.";
      return null;
    }
    case 3: {
      if (client.takingSocialSecurity) {
        if (!client.socialSecurityMonthlyClient.trim() && !socialSecurity.ssMonthlyClient.trim()) {
          return "Enter your monthly Social Security benefit.";
        }
        if (client.married && !client.socialSecurityMonthlySpouse.trim() && !socialSecurity.ssMonthlySpouse.trim()) {
          return "Enter your spouse's monthly Social Security benefit.";
        }
      } else if (socialSecurity.ssKnowBenefit === "unset") {
        return "Answer whether you know your future Social Security benefit amount.";
      }
      return null;
    }
    case 4: {
      if (!client.adjustedGrossIncomeAnnual.trim()) return "Enter your adjusted gross income.";
      if (!retirementIncomeNeedIsValid(client.retirementSpendableIncomeAnnual, ws.variableRetirementIncomeAmounts)) {
        return "Enter your total retirement income need.";
      }
      if (ws.retirementIncomeFromConversionAccount === null) {
        return 'Answer "Income received from conversion account?"';
      }
      return null;
    }
    case 5: {
      if (parseBalance(manualTraditionalQualified) <= 0) return "Enter your traditional qualified balance.";
      return null;
    }
    case 6: {
      if (ws.useEntireQualifiedBalance === null) {
        return "Answer whether to use the entire qualified balance.";
      }
      if (ws.useEntireQualifiedBalance === true && parseBalance(ws.qualifiedAssetValue) <= 0) {
        return "Enter the qualified asset value.";
      }
      if (ws.useEntireQualifiedBalance === false && parseBalance(ws.specificConversionAmount) <= 0) {
        return "Enter a specific conversion amount or choose to use the entire balance.";
      }
      return null;
    }
    default:
      return null;
  }
}
