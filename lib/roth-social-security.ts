import type { RothClient } from "@/lib/roth-client";
import { parseClientAgeForIllustration } from "@/lib/roth-inputs";
import {
  illustrativeSsaRetirementBenefitMonthly,
  illustrativeSpouseMonthlyMaxOwnOrSpousal,
  illustrativeWorkerPiaMonthly,
  parseBirthYearFromIsoDob,
} from "@/lib/social-security-benefit-estimate";

export type RothSsKnowBenefit = "unset" | "yes" | "no";

export type RothSocialSecurityState = {
  ssKnowBenefit: RothSsKnowBenefit;
  ssMonthlyClient: string;
  ssMonthlySpouse: string;
  ssEstClientAnnual: string;
  ssEstClientYears: string;
  ssEstClientClaimAge: string;
  ssEstSpouseAnnual: string;
  ssEstSpouseYears: string;
  ssEstSpouseClaimAge: string;
  ssUseSpousalModel: boolean;
  ssStartAgeClient: string;
  ssStartAgeSpouse: string;
};

export type ResolvedSocialSecurityMode = "none" | "receiving" | "known" | "estimated";

export type ResolvedSocialSecurity = {
  clientMonthly: number;
  spouseMonthly: number;
  combinedAnnual: number;
  mode: ResolvedSocialSecurityMode;
  estimatorClientMonthly: number | null;
  estimatorSpouseMonthly: number | null;
  workerPiaMonthly: number | null;
};

export function emptyRothSocialSecurityState(): RothSocialSecurityState {
  return {
    ssKnowBenefit: "unset",
    ssMonthlyClient: "",
    ssMonthlySpouse: "",
    ssEstClientAnnual: "",
    ssEstClientYears: "",
    ssEstClientClaimAge: "",
    ssEstSpouseAnnual: "",
    ssEstSpouseYears: "",
    ssEstSpouseClaimAge: "",
    ssUseSpousalModel: true,
    ssStartAgeClient: "",
    ssStartAgeSpouse: "",
  };
}

function parseMoney(raw: string): number {
  const n = Number(String(raw ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseDigits(raw: string): number {
  const n = Number(String(raw ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

export function clientBirthYear(
  client: Partial<RothClient> & Record<string, unknown>,
  nowYear = new Date().getFullYear()
): number | null {
  const y = parseBirthYearFromIsoDob(String(client.dob || ""));
  if (y != null) return y;
  const age = parseClientAgeForIllustration(client);
  if (age > 0) return nowYear - age;
  return null;
}

export function spouseBirthYear(
  client: Partial<RothClient> & Record<string, unknown>,
  nowYear = new Date().getFullYear()
): number | null {
  const married = client.married === true || String(client.married || "").toLowerCase() === "true";
  if (!married) return null;
  const y = parseBirthYearFromIsoDob(String(client.spouseDob || ""));
  if (y != null) return y;
  const spouseAge = Number(client.spouseAge);
  if (Number.isFinite(spouseAge) && spouseAge > 0) return nowYear - Math.floor(spouseAge);
  const clientAge = parseClientAgeForIllustration(client);
  if (clientAge > 0) return nowYear - clientAge;
  return null;
}

function clientAgeStart(client: Partial<RothClient> & Record<string, unknown>): number {
  const age = parseClientAgeForIllustration(client);
  return age > 0 ? age : 0;
}

function spouseAgeStart(
  client: Partial<RothClient> & Record<string, unknown>,
  clientAge: number
): number | null {
  const married = client.married === true || String(client.married || "").toLowerCase() === "true";
  if (!married) return null;
  const n = Number(client.spouseAge);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  const y = spouseBirthYear(client);
  if (y != null) {
    const cy = new Date().getFullYear();
    return Math.max(0, cy - y);
  }
  return clientAge > 0 ? clientAge : 62;
}

function yearsWorkedCapped(raw: string, ageNow: number | null): number {
  const yearsIn = parseDigits(raw);
  if (Number.isFinite(yearsIn) && yearsIn > 0) {
    return Math.min(35, Math.max(1, Math.floor(yearsIn)));
  }
  if (ageNow != null && ageNow > 0) {
    return Math.min(35, Math.max(1, ageNow - 22));
  }
  return 35;
}

function defaultClaimAge(retirementAgeRaw: string): number {
  return Math.min(70, Math.max(62, Math.floor(Number(retirementAgeRaw) || 67)));
}

export function estimateClientMonthly(
  client: Partial<RothClient> & Record<string, unknown>,
  ss: RothSocialSecurityState
): number | null {
  const birthYear = clientBirthYear(client);
  if (birthYear == null) return null;
  const annual = parseMoney(ss.ssEstClientAnnual);
  if (annual <= 0) return null;
  const ageNow = clientAgeStart(client);
  const years = yearsWorkedCapped(ss.ssEstClientYears, ageNow > 0 ? ageNow : null);
  const claim = parseDigits(ss.ssEstClientClaimAge);
  const claimAge =
    Number.isFinite(claim) && claim >= 62 && claim <= 70 ? Math.floor(claim) : defaultClaimAge(String(client.retirementAge || "67"));
  return illustrativeSsaRetirementBenefitMonthly({
    birthYear,
    annualCoveredEarnings: annual,
    yearsWorkedCapped35: years,
    benefitStartAge: claimAge,
  });
}

export function estimateWorkerPiaMonthly(
  client: Partial<RothClient> & Record<string, unknown>,
  ss: RothSocialSecurityState
): number | null {
  const birthYear = clientBirthYear(client);
  if (birthYear == null) return null;
  const annual = parseMoney(ss.ssEstClientAnnual);
  if (annual <= 0) return null;
  const ageNow = clientAgeStart(client);
  const years = yearsWorkedCapped(ss.ssEstClientYears, ageNow > 0 ? ageNow : null);
  return illustrativeWorkerPiaMonthly({
    birthYear,
    annualCoveredEarnings: annual,
    yearsWorkedCapped35: years,
  });
}

export function estimateSpouseMonthly(
  client: Partial<RothClient> & Record<string, unknown>,
  ss: RothSocialSecurityState,
  workerPiaMonthly: number | null
): number | null {
  const married = client.married === true || String(client.married || "").toLowerCase() === "true";
  if (!married) return null;
  const birthYear = spouseBirthYear(client);
  if (birthYear == null) return null;
  const annual = parseMoney(ss.ssEstSpouseAnnual);
  const ageS = spouseAgeStart(client, clientAgeStart(client));
  const years = yearsWorkedCapped(ss.ssEstSpouseYears, ageS);
  const claim = parseDigits(ss.ssEstSpouseClaimAge);
  const claimAge =
    Number.isFinite(claim) && claim >= 62 && claim <= 70
      ? Math.floor(claim)
      : defaultClaimAge(String(client.spouseRetirementAge || client.retirementAge || "67"));
  return illustrativeSpouseMonthlyMaxOwnOrSpousal({
    workerPiaMonthly,
    spouseInput: {
      birthYear,
      annualCoveredEarnings: annual,
      yearsWorkedCapped35: years,
      benefitStartAge: claimAge,
    },
    useSpousalLayer: ss.ssUseSpousalModel,
  });
}

export function resolveSocialSecurityStartAgeClient(
  client: Partial<RothClient> & Record<string, unknown>,
  ss: RothSocialSecurityState
): number {
  const fallbackRet = Math.min(70, Math.max(50, Math.floor(Number(client.retirementAge) || 67)));
  if (ss.ssKnowBenefit === "yes") {
    const raw = ss.ssStartAgeClient.trim();
    if (raw) {
      const n = Math.floor(parseDigits(raw));
      if (Number.isFinite(n) && n >= 50 && n <= 80) return n;
    }
  }
  const claim = parseDigits(ss.ssEstClientClaimAge);
  if (ss.ssKnowBenefit === "no" && Number.isFinite(claim) && claim >= 62 && claim <= 70) {
    return Math.floor(claim);
  }
  return fallbackRet;
}

export function resolveSocialSecurityStartAgeSpouse(
  client: Partial<RothClient> & Record<string, unknown>,
  ss: RothSocialSecurityState
): number {
  const fallbackRet = Math.min(70, Math.max(50, Math.floor(Number(client.spouseRetirementAge || client.retirementAge) || 67)));
  const married = client.married === true || String(client.married || "").toLowerCase() === "true";
  if (!married) return fallbackRet;
  if (ss.ssKnowBenefit === "yes") {
    const raw = ss.ssStartAgeSpouse.trim();
    if (raw) {
      const n = Math.floor(parseDigits(raw));
      if (Number.isFinite(n) && n >= 50 && n <= 80) return n;
    }
  }
  const claim = parseDigits(ss.ssEstSpouseClaimAge);
  if (ss.ssKnowBenefit === "no" && Number.isFinite(claim) && claim >= 62 && claim <= 70) {
    return Math.floor(claim);
  }
  return fallbackRet;
}

/** Household SS start: later of client/spouse claim ages when married (combined benefit simplification). */
export function resolveHouseholdSocialSecurityStartAge(
  client: Partial<RothClient> & Record<string, unknown>,
  ss: RothSocialSecurityState | null | undefined
): number {
  const state = ss ?? emptyRothSocialSecurityState();
  const married = client.married === true || String(client.married || "").toLowerCase() === "true";
  const clientStart = resolveSocialSecurityStartAgeClient(client, state);
  if (!married) return clientStart;
  return Math.max(clientStart, resolveSocialSecurityStartAgeSpouse(client, state));
}

export function resolveSocialSecurityMonthly(
  client: Partial<RothClient> & Record<string, unknown>,
  ss: RothSocialSecurityState | null | undefined
): ResolvedSocialSecurity {
  const taking =
    client.takingSocialSecurity === true || String(client.takingSocialSecurity || "").toLowerCase() === "true";
  const married = client.married === true || String(client.married || "").toLowerCase() === "true";

  const estimatorClientMonthly =
    ss && !taking && ss.ssKnowBenefit === "no" ? estimateClientMonthly(client, ss) : null;
  const workerPiaMonthly =
    ss && !taking && ss.ssKnowBenefit === "no" ? estimateWorkerPiaMonthly(client, ss) : null;
  const estimatorSpouseMonthly =
    ss && !taking && ss.ssKnowBenefit === "no" && married
      ? estimateSpouseMonthly(client, ss, workerPiaMonthly)
      : null;

  if (ss) {
    if (taking || ss.ssKnowBenefit === "yes") {
      let clientMonthly = parseMoney(ss.ssMonthlyClient);
      let spouseMonthly = married ? parseMoney(ss.ssMonthlySpouse) : 0;
      if (taking && clientMonthly <= 0) {
        clientMonthly = parseMoney(String(client.socialSecurityMonthlyClient ?? ""));
      }
      if (taking && married && spouseMonthly <= 0) {
        spouseMonthly = parseMoney(String(client.socialSecurityMonthlySpouse ?? ""));
      }
      const mode = taking ? "receiving" : "known";
      return {
        clientMonthly,
        spouseMonthly,
        combinedAnnual: (clientMonthly + spouseMonthly) * 12,
        mode: clientMonthly + spouseMonthly > 0 ? mode : "none",
        estimatorClientMonthly,
        estimatorSpouseMonthly,
        workerPiaMonthly,
      };
    }
    if (ss.ssKnowBenefit === "no") {
      const clientMonthly = estimatorClientMonthly ?? 0;
      const spouseMonthly = estimatorSpouseMonthly ?? 0;
      return {
        clientMonthly,
        spouseMonthly,
        combinedAnnual: (clientMonthly + spouseMonthly) * 12,
        mode: clientMonthly + spouseMonthly > 0 ? "estimated" : "none",
        estimatorClientMonthly,
        estimatorSpouseMonthly,
        workerPiaMonthly,
      };
    }
  }

  if (taking) {
    const clientMonthly = parseMoney(String(client.socialSecurityMonthlyClient ?? ""));
    const spouseMonthly = married ? parseMoney(String(client.socialSecurityMonthlySpouse ?? "")) : 0;
    return {
      clientMonthly,
      spouseMonthly,
      combinedAnnual: (clientMonthly + spouseMonthly) * 12,
      mode: clientMonthly + spouseMonthly > 0 ? "receiving" : "none",
      estimatorClientMonthly: null,
      estimatorSpouseMonthly: null,
      workerPiaMonthly: null,
    };
  }

  return {
    clientMonthly: 0,
    spouseMonthly: 0,
    combinedAnnual: 0,
    mode: "none",
    estimatorClientMonthly: null,
    estimatorSpouseMonthly: null,
    workerPiaMonthly: null,
  };
}
