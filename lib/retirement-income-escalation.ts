/** Illustrative annual inflation on total retirement income need (table breakdowns). */
export const RETIREMENT_NEED_INFLATION_ANNUAL = 0.03;

/** Illustrative Social Security COLA (table breakdowns). */
export const SOCIAL_SECURITY_COLA_ANNUAL = 0.028;

/** Compound base amount from anchor year 0; rounds down to whole dollars. */
export function escalatedAnnualAmount(
  base: number,
  annualRate: number,
  yearsSinceStart: number
): number {
  const b = Math.max(0, Number(base) || 0);
  if (b <= 0) return 0;
  const years = Math.max(0, Math.floor(yearsSinceStart));
  if (years === 0) return Math.floor(b);
  const amount = b * Math.pow(1 + annualRate, years);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.max(0, Math.floor(amount + 1e-9));
}

export function retirementNeedInflationAnchorAge(params: {
  retireAge: number;
  illustrationStartAge?: number;
}): number {
  const retireAge = Math.max(0, Math.floor(Number(params.retireAge) || 0));
  const illustrationStartAge = Math.max(
    0,
    Math.floor(Number(params.illustrationStartAge ?? params.retireAge) || 0)
  );
  return Math.max(retireAge, illustrationStartAge);
}

export function retirementNeedForAge(params: {
  age: number;
  retireAge: number;
  baseNeed: number;
  /** When illustration starts after retirement, need inflates from here instead of retireAge. */
  needInflationAnchorAge?: number;
}): number {
  if (params.age < params.retireAge) return 0;
  const anchorAge = Math.max(
    params.retireAge,
    params.needInflationAnchorAge ?? params.retireAge
  );
  if (params.age < anchorAge) return 0;
  return escalatedAnnualAmount(
    params.baseNeed,
    RETIREMENT_NEED_INFLATION_ANNUAL,
    params.age - anchorAge
  );
}

export function socialSecurityForAge(params: {
  age: number;
  ssStartAge: number;
  baseSS: number;
}): number {
  if (params.baseSS <= 0 || params.age < params.ssStartAge) return 0;
  return escalatedAnnualAmount(
    params.baseSS,
    SOCIAL_SECURITY_COLA_ANNUAL,
    params.age - params.ssStartAge
  );
}

export function portfolioIncomeShortfallForAge(params: {
  age: number;
  retireAge: number;
  ssStartAge: number;
  baseNeed: number;
  baseSS: number;
  fundNeedFromIra: boolean;
  /** Illustration start age; when past retirement, need is entered as current-year amount here. */
  illustrationStartAge?: number;
}): {
  retirementNeedAnnual: number;
  socialSecurityAnnualGross: number;
  portfolioIncomeShortfall: number;
} {
  const needAnchorAge = retirementNeedInflationAnchorAge({
    retireAge: params.retireAge,
    illustrationStartAge: params.illustrationStartAge,
  });
  const retirementNeedAnnual = retirementNeedForAge({
    age: params.age,
    retireAge: params.retireAge,
    baseNeed: params.baseNeed,
    needInflationAnchorAge: needAnchorAge,
  });
  const socialSecurityAnnualGross = socialSecurityForAge({
    age: params.age,
    ssStartAge: params.ssStartAge,
    baseSS: params.baseSS,
  });
  const portfolioIncomeShortfall =
    params.fundNeedFromIra && params.age >= params.retireAge
      ? Math.max(0, retirementNeedAnnual - socialSecurityAnnualGross)
      : 0;
  return { retirementNeedAnnual, socialSecurityAnnualGross, portfolioIncomeShortfall };
}
