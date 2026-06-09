/** Slim client shape for the Roth conversion worksheet (standalone app). */

export const FEDERAL_TAX_BRACKET_IDS = ["10", "12", "22", "24", "32", "35", "37"] as const;

export type FederalTaxBracketId = (typeof FEDERAL_TAX_BRACKET_IDS)[number];

export type RothClient = {
  firstName: string;
  lastName: string;
  dob: string;
  age: string;
  federalTaxBracket: string;
  adjustedGrossIncomeAnnual: string;
  /** US state or DC of residence; blank = no state income tax. */
  stateOfResidence: string;
  /** Optional total federal deductions; blank uses standard deduction. */
  totalDeductionsAnnual: string;
  retirementAge: string;
  spouseRetirementAge: string;
  retirementSpendableIncomeAnnual: string;
  socialSecurityMonthlyClient: string;
  socialSecurityMonthlySpouse: string;
  married: boolean;
  spouseFirstName: string;
  spouseLastName: string;
  spouseDob: string;
  spouseAge: string;
  takingSocialSecurity: boolean;
};

export function emptyRothClient(): RothClient {
  return {
    firstName: "",
    lastName: "",
    dob: "",
    age: "",
    federalTaxBracket: "22",
    adjustedGrossIncomeAnnual: "",
    stateOfResidence: "",
    totalDeductionsAnnual: "",
    retirementAge: "65",
    spouseRetirementAge: "65",
    retirementSpendableIncomeAnnual: "",
    socialSecurityMonthlyClient: "",
    socialSecurityMonthlySpouse: "",
    married: false,
    spouseFirstName: "",
    spouseLastName: "",
    spouseDob: "",
    spouseAge: "",
    takingSocialSecurity: false,
  };
}

export function clientDisplayName(client: {
  firstName?: string;
  lastName?: string;
  name?: string;
}): string {
  const fromParts = [client.firstName, client.lastName].filter(Boolean).join(" ").trim();
  if (fromParts) return fromParts;
  const legacy = String(client.name || "").trim();
  return legacy || "Client";
}
