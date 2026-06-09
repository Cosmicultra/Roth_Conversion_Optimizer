import { describe, expect, it } from "vitest";
import type { RothClient } from "@/lib/roth-client";
import {
  emptyRothSocialSecurityState,
  estimateClientMonthly,
  estimateSpouseMonthly,
  estimateWorkerPiaMonthly,
  resolveSocialSecurityMonthly,
} from "@/lib/roth-social-security";

const baseClient = (): RothClient => ({
  firstName: "",
  lastName: "",
  dob: "1960-06-15",
  age: "65",
  federalTaxBracket: "22",
  adjustedGrossIncomeAnnual: "",
  retirementAge: "67",
  spouseRetirementAge: "67",
  retirementSpendableIncomeAnnual: "80000",
  socialSecurityMonthlyClient: "",
  socialSecurityMonthlySpouse: "",
  married: false,
  spouseFirstName: "",
  spouseLastName: "",
  spouseDob: "",
  spouseAge: "",
  takingSocialSecurity: false,
});

describe("resolveSocialSecurityMonthly", () => {
  it("returns receiving amounts from ss monthly fields when taking SS", () => {
    const client = baseClient();
    client.takingSocialSecurity = true;
    const ss = emptyRothSocialSecurityState();
    ss.ssMonthlyClient = "2400";
    const out = resolveSocialSecurityMonthly(client, ss);
    expect(out.mode).toBe("receiving");
    expect(out.clientMonthly).toBe(2400);
    expect(out.combinedAnnual).toBe(2400 * 12);
  });

  it("returns known monthly when not receiving but ssKnowBenefit is yes", () => {
    const client = baseClient();
    const ss = emptyRothSocialSecurityState();
    ss.ssKnowBenefit = "yes";
    ss.ssMonthlyClient = "2100";
    const out = resolveSocialSecurityMonthly(client, ss);
    expect(out.mode).toBe("known");
    expect(out.clientMonthly).toBe(2100);
    expect(out.combinedAnnual).toBe(2100 * 12);
  });

  it("returns estimated monthly when ssKnowBenefit is no", () => {
    const client = baseClient();
    const ss = emptyRothSocialSecurityState();
    ss.ssKnowBenefit = "no";
    ss.ssEstClientAnnual = "85000";
    ss.ssEstClientYears = "35";
    ss.ssEstClientClaimAge = "67";
    const est = estimateClientMonthly(client, ss);
    expect(est).not.toBeNull();
    const out = resolveSocialSecurityMonthly(client, ss);
    expect(out.mode).toBe("estimated");
    expect(out.clientMonthly).toBe(est);
    expect(out.combinedAnnual).toBeGreaterThan(0);
  });

  it("returns none when unset and not receiving", () => {
    const client = baseClient();
    const out = resolveSocialSecurityMonthly(client, emptyRothSocialSecurityState());
    expect(out.mode).toBe("none");
    expect(out.combinedAnnual).toBe(0);
  });

  it("falls back to client profile monthly when taking and ss monthly blank", () => {
    const client = baseClient();
    client.takingSocialSecurity = true;
    client.socialSecurityMonthlyClient = "1800";
    const out = resolveSocialSecurityMonthly(client, emptyRothSocialSecurityState());
    expect(out.clientMonthly).toBe(1800);
  });

  it("estimates spousal benefit without spouse earnings when spousal layer is on", () => {
    const client = baseClient();
    client.married = true;
    client.spouseDob = "1962-08-01";
    client.spouseAge = "63";
    const ss = emptyRothSocialSecurityState();
    ss.ssKnowBenefit = "no";
    ss.ssEstClientAnnual = "120000";
    ss.ssEstClientYears = "35";
    ss.ssEstClientClaimAge = "67";
    ss.ssEstSpouseClaimAge = "67";
    ss.ssUseSpousalModel = true;

    const workerPia = estimateWorkerPiaMonthly(client, ss);
    expect(workerPia).not.toBeNull();

    const spouseMonthly = estimateSpouseMonthly(client, ss, workerPia);
    expect(spouseMonthly).not.toBeNull();
    expect(spouseMonthly!).toBeGreaterThan(1000);

    const out = resolveSocialSecurityMonthly(client, ss);
    expect(out.estimatorSpouseMonthly).toBe(spouseMonthly);
    expect(out.spouseMonthly).toBe(spouseMonthly);
    expect(out.combinedAnnual).toBe((out.clientMonthly + spouseMonthly!) * 12);
  });

  it("returns null spouse estimate with no earnings when spousal layer is off", () => {
    const client = baseClient();
    client.married = true;
    client.spouseDob = "1962-08-01";
    const ss = emptyRothSocialSecurityState();
    ss.ssKnowBenefit = "no";
    ss.ssEstClientAnnual = "120000";
    ss.ssUseSpousalModel = false;

    const workerPia = estimateWorkerPiaMonthly(client, ss);
    expect(estimateSpouseMonthly(client, ss, workerPia)).toBeNull();
  });
});
