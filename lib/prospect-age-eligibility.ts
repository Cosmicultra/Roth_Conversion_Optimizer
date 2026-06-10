/** Minimum age for the automated Roth conversion preview (matches illustration model). */
export const PROSPECT_PREVIEW_MIN_AGE = 60;

/** Minimum age for the consultation path when self-service preview is unavailable. */
export const PROSPECT_CONSULTATION_MIN_AGE = 55;

export type ProspectAgeEligibility =
  | { tier: "preview" }
  | { tier: "consultation"; message: string }
  | { tier: "ineligible"; message: string };

export function assessProspectAgeEligibility(age: number): ProspectAgeEligibility {
  if (age >= PROSPECT_PREVIEW_MIN_AGE) {
    return { tier: "preview" };
  }
  if (age >= PROSPECT_CONSULTATION_MIN_AGE) {
    return {
      tier: "consultation",
      message:
        "You may be eligible for a Roth conversion under the standards outlined in IRS Publication 590. At your age, however, timing, income, and tax planning should be reviewed individually rather than through this automated preview, which is designed for clients age 60 and older. Schedule a complimentary consultation and our team will walk through options tailored to your situation.",
    };
  }
  return {
    tier: "ineligible",
    message:
      "You are not eligible for this self-service Roth conversion preview based on your age. This tool is designed for clients age 55 and older who are approaching or in retirement.",
  };
}
