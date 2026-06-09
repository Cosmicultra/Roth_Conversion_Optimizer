/** SECURE / SECURE 2.0 RMD start ages and divisor tables (illustration). */

export const RMD_DISTRIBUTION_PERIOD: Record<number, number> = {
  72: 27.4,
  73: 26.5,
  74: 25.5,
  75: 24.6,
  76: 23.7,
  77: 22.9,
  78: 22.0,
  79: 21.1,
  80: 20.2,
  81: 19.4,
  82: 18.5,
  83: 17.7,
  84: 16.8,
  85: 16.0,
  86: 15.2,
  87: 14.4,
  88: 13.7,
  89: 13.0,
  90: 12.2,
  91: 11.5,
  92: 10.8,
  93: 10.1,
  94: 9.5,
  95: 8.9,
};

/** Joint Life and Last Survivor — client age rows when spouse is >10 years younger (IRS Table II excerpt). */
const JOINT_RMD_DIVISOR: Record<number, number> = {
  73: 28.9,
  74: 28.0,
  75: 27.0,
  76: 26.0,
  77: 25.0,
  78: 24.0,
  79: 23.0,
  80: 22.0,
  81: 21.0,
  82: 20.0,
  83: 19.0,
  84: 18.0,
  85: 17.0,
  86: 16.0,
  87: 15.0,
  88: 14.0,
  89: 13.0,
  90: 12.0,
  91: 11.0,
  92: 10.0,
  93: 9.0,
  94: 8.0,
  95: 7.0,
};

export function birthYearFromDob(dob: string | undefined): number | null {
  const s = String(dob ?? "").trim();
  if (!s) return null;
  const birth = new Date(`${s}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  return birth.getFullYear();
}

/** RMD illustration start age from client birth year (SECURE / SECURE 2.0). */
export function rmdStartAgeForBirthYear(birthYear: number | null): number {
  if (birthYear == null) return 73;
  if (birthYear <= 1950) return 72;
  if (birthYear <= 1959) return 73;
  return 75;
}

export function rmdStartAgeForDob(dob: string | undefined): number {
  return rmdStartAgeForBirthYear(birthYearFromDob(dob));
}

export type RmdDivisorInput = {
  age: number;
  rmdStartAge: number;
  marriedFilingJointly?: boolean;
  clientAge: number;
  spouseAge?: number | null;
};

export function rmdDivisorForAge(input: RmdDivisorInput): number | null {
  const age = Math.floor(input.age);
  if (age < input.rmdStartAge) return null;

  const useJoint =
    input.marriedFilingJointly === true &&
    input.spouseAge != null &&
    input.spouseAge < input.clientAge - 10;

  const table = useJoint ? JOINT_RMD_DIVISOR : RMD_DISTRIBUTION_PERIOD;
  const d = table[age];
  if (d) return d;
  if (age > 95) return Math.max(2.0, 8.9 - (age - 95) * 0.35);
  if (age === 72 && input.rmdStartAge === 72) return RMD_DISTRIBUTION_PERIOD[72] ?? 27.4;
  return null;
}

export function rmdAmountFromPriorYearEndBalance(
  priorDec31Balance: number,
  input: RmdDivisorInput
): number {
  const divisor = rmdDivisorForAge(input);
  if (!divisor || priorDec31Balance <= 0) return 0;
  return Math.min(priorDec31Balance, priorDec31Balance / divisor);
}
