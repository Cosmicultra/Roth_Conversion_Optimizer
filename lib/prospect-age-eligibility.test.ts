import { describe, expect, it } from "vitest";
import {
  assessProspectAgeEligibility,
  PROSPECT_CONSULTATION_MIN_AGE,
  PROSPECT_PREVIEW_MIN_AGE,
} from "./prospect-age-eligibility";

describe("assessProspectAgeEligibility", () => {
  it("allows full preview at preview minimum age and above", () => {
    expect(assessProspectAgeEligibility(PROSPECT_PREVIEW_MIN_AGE).tier).toBe("preview");
    expect(assessProspectAgeEligibility(72).tier).toBe("preview");
  });

  it("routes consultation tier for ages between consultation and preview minimums", () => {
    const result = assessProspectAgeEligibility(PROSPECT_CONSULTATION_MIN_AGE);
    expect(result.tier).toBe("consultation");
    if (result.tier !== "consultation") return;
    expect(result.message).toMatch(/consultation/i);

    expect(assessProspectAgeEligibility(PROSPECT_PREVIEW_MIN_AGE - 1).tier).toBe("consultation");
  });

  it("declines ineligible clients below consultation minimum age", () => {
    const result = assessProspectAgeEligibility(PROSPECT_CONSULTATION_MIN_AGE - 1);
    expect(result.tier).toBe("ineligible");
    if (result.tier !== "ineligible") return;
    expect(result.message).toMatch(/not eligible/i);
  });
});
