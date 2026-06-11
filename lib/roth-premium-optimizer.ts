import {
  conversionCompleteAgeFromModel,
  effectiveConversionDeadlineAge,
  meetsConversionOptimizationGoal as meetsConversionOptimizationGoalCore,
  parseSurrenderYears,
  TRAD_DEPLETED_EPSILON,
} from "@/lib/conversion-deadlines";
import {
  buildRothConversionModel,
  RMD_ILLUSTRATION_START_AGE,
  type RothConversionModelResult,
} from "@/lib/roth-conversion-analysis";
import { rmdDivisorForAge } from "@/lib/rmd-engine";
import { portfolioIncomeShortfallForAge } from "@/lib/retirement-income-escalation";

export { conversionCompleteAgeFromModel };



const DEFAULT_END_AGE = 95;



export type RothConversionModelInput = Parameters<typeof buildRothConversionModel>[0];



export type OptimizeRothPremiumInput = Omit<RothConversionModelInput, "totalAccountValue"> & {

  fullQualifiedBalance: number;

  rmdStartAge?: number;

};



export type IncomeHoldoutProjection = {

  holdoutReserve: number;

  overlapStartAge?: number;

  overlapEndAge?: number;

};



export type OptimizeRothPremiumResult =

  | {

      ok: true;

      amount: number;

      marginalRateNominalPct: number;

      protectInitialInvestment: boolean;

      rmdStartAge: number;

      holdoutReserve: number;

      overlapStartAge?: number;

      overlapEndAge?: number;

    }

  | { ok: false; error: string };



/** Traditional balance remaining after the last pre-RMD conversion year in the illustration. */

export function traditionalRemainingBeforeRmd(

  model: RothConversionModelResult,

  rmdStartAge: number = RMD_ILLUSTRATION_START_AGE

): number {

  const preRmd = model.rothConversion.filter((r) => r.age < rmdStartAge && !r.rothOnlyPhase);

  if (preRmd.length === 0) {

    /** Conversion sleeve at start — not stay-traditional full pool (`startingBalance`). */

    return model.rothPathStartingQualifiedBalance;

  }

  return preRmd[preRmd.length - 1]!.endTraditionalBalance;

}



export function isFullyConvertedBeforeRmd(

  model: RothConversionModelResult,

  rmdStartAge: number = RMD_ILLUSTRATION_START_AGE

): boolean {

  return traditionalRemainingBeforeRmd(model, rmdStartAge) <= TRAD_DEPLETED_EPSILON;

}



/** Conversion sleeve depleted within the modeled horizon (may include RMD years). */

export function isFullyConvertedWithinHorizon(model: RothConversionModelResult): boolean {

  const tradRows = model.rothConversion.filter((r) => !r.rothOnlyPhase);

  if (tradRows.length === 0) {

    return model.rothPathStartingQualifiedBalance <= TRAD_DEPLETED_EPSILON;

  }

  return tradRows[tradRows.length - 1]!.endTraditionalBalance <= TRAD_DEPLETED_EPSILON;

}



export function meetsConversionOptimizationGoal(
  model: RothConversionModelResult,
  input: OptimizeRothPremiumInput,
  rmdStartAge: number = RMD_ILLUSTRATION_START_AGE
): boolean {
  const startAge = Math.max(0, Math.floor(Number(input.currentAge) || 0));
  const endAge = Math.max(startAge, Math.floor(Number(input.endAge) || DEFAULT_END_AGE));
  return meetsConversionOptimizationGoalCore(model, {
    startAge,
    endAge,
    rmdStartAge,
    useFixedIndexContract: input.useFixedIndexContract,
    ficSurrenderYears: input.ficSurrenderYears,
    protectInitialInvestment: input.protectInitialInvestment,
  });
}

function conversionFailureMessage(
  currentAge: number,
  rmdStartAge: number,
  endAge: number,
  withHoldout: boolean,
  input: OptimizeRothPremiumInput
): string {
  const holdoutPart = withHoldout ? " after reserving retirement income" : "";
  const protectHint = input.protectInitialInvestment
    ? " or turn off Protect initial investment"
    : "";
  const surrenderYears =
    input.useFixedIndexContract === true ? parseSurrenderYears(input.ficSurrenderYears) : null;
  if (surrenderYears != null && surrenderYears > 0) {
    const surrenderDeadline = currentAge + surrenderYears - 1;
    const effectiveDeadline = effectiveConversionDeadlineAge({
      startAge: currentAge,
      endAge,
      rmdStartAge,
      useFixedIndexContract: true,
      ficSurrenderYears: input.ficSurrenderYears,
    });
    if (effectiveDeadline === surrenderDeadline) {
      return `No conversion premium can be fully converted within your ${surrenderYears}-year surrender period and tax bracket${holdoutPart}. Try a higher max tax bracket${protectHint}.`;
    }
  }

  if (currentAge >= rmdStartAge) {
    return `No conversion premium can be fully converted within your tax bracket${holdoutPart} through age ${endAge} while subject to RMDs. Try a higher max tax bracket${protectHint}.`;
  }

  const atPart = withHoldout
    ? " before RMD age after reserving retirement income"
    : " before RMD age at the current age and income settings";
  return `No conversion premium can be fully converted within your tax bracket${atPart}. Try a higher max tax bracket${protectHint}.`;
}



/** Annual holdout withdrawal during RMD years: max(RMD on combined balance, income shortfall). */
export function holdoutWithdrawalRequiredForAge(params: {
  age: number;
  retireAge: number;
  holdoutAfterGrowth: number;
  convertAtYearStart: number;
  growth: number;
  shortfallForAge: (age: number) => number;
  rmdStartAge?: number;
  marriedFilingJointly?: boolean;
  clientAge?: number;
  spouseAge?: number | null;
}): number {
  const { age, retireAge, holdoutAfterGrowth, convertAtYearStart, growth, shortfallForAge } = params;
  const rmdStartAge = params.rmdStartAge ?? RMD_ILLUSTRATION_START_AGE;
  const clientAge = params.clientAge ?? age;
  const convertAfterGrowth = convertAtYearStart * (1 + growth);
  const combinedAfterGrowth = holdoutAfterGrowth + convertAfterGrowth;
  const rmdDivisor = rmdDivisorForAge({
    age,
    rmdStartAge,
    marriedFilingJointly: params.marriedFilingJointly,
    clientAge,
    spouseAge: params.spouseAge ?? null,
  });
  const rmdTake =
    rmdDivisor && combinedAfterGrowth > 0
      ? Math.min(combinedAfterGrowth, combinedAfterGrowth / rmdDivisor)
      : 0;
  const retired = age >= retireAge;
  const shortfall = Math.max(0, shortfallForAge(age));
  return retired ? Math.max(rmdTake, shortfall) : rmdTake;
}

/** Minimum holdout at illustration start that funds retirement income through overlap years. */

export function minimumStartingHoldoutReserve(params: {

  startAge: number;

  retireAge: number;

  conversionCompleteAge: number;

  growthByAge: Map<number, number>;

  shortfallForAge: (age: number) => number;

  /** When present (RMD years), RMD is sized on holdout + conversion sleeve; withdrawals hit holdout first. */

  convertBalanceAtAgeStart?: Map<number, number>;

  rmdStartAge?: number;

  marriedFilingJointly?: boolean;

  spouseStartAge?: number | null;

}): number {

  const {
    startAge,
    retireAge,
    conversionCompleteAge,
    growthByAge,
    shortfallForAge,
    convertBalanceAtAgeStart,
    rmdStartAge = RMD_ILLUSTRATION_START_AGE,
    marriedFilingJointly,
    spouseStartAge,
  } = params;



  let totalShortfall = 0;

  for (let age = retireAge; age <= conversionCompleteAge; age++) {

    totalShortfall += Math.max(0, shortfallForAge(age));

  }

  if (totalShortfall <= 0 || retireAge >= conversionCompleteAge) return 0;



  const useCombinedRmd = convertBalanceAtAgeStart != null && convertBalanceAtAgeStart.size > 0;

  const holdoutWithdrawalAtAge = (age: number, holdoutAfterGrowth: number): number => {
    const growth = growthByAge.get(age) ?? 0.1;
    const convertAtYearStart = convertBalanceAtAgeStart?.get(age) ?? 0;
    return holdoutWithdrawalRequiredForAge({
      age,
      retireAge,
      holdoutAfterGrowth,
      convertAtYearStart,
      growth,
      shortfallForAge,
      rmdStartAge,
      marriedFilingJointly,
      clientAge: age,
      spouseAge:
        spouseStartAge != null ? spouseStartAge + (age - startAge) : null,
    });
  };

  const requiresHoldoutReserve = (): boolean => {
    for (let age = startAge; age <= conversionCompleteAge; age++) {
      if (useCombinedRmd) {
        if (holdoutWithdrawalAtAge(age, 1) > 0) return true;
      } else {
        const rmdDivisor = rmdDivisorForAge({
          age,
          rmdStartAge,
          marriedFilingJointly,
          clientAge: age,
          spouseAge:
            spouseStartAge != null ? spouseStartAge + (age - startAge) : null,
        });
        if (rmdDivisor) return true;
        if (age >= retireAge && shortfallForAge(age) > 0) return true;
      }
    }
    return false;
  };

  const mustHoldBack = requiresHoldoutReserve();

  const survives = (holdoutStart: number): boolean => {
    if (holdoutStart <= 0 && mustHoldBack) return false;

    let bal = holdoutStart;

    for (let age = startAge; age <= conversionCompleteAge; age++) {

      const growth = growthByAge.get(age) ?? 0.1;

      bal *= 1 + growth;



      if (useCombinedRmd) {

        bal -= holdoutWithdrawalAtAge(age, bal);

      } else {

        const rmdDivisor = rmdDivisorForAge({
          age,
          rmdStartAge,
          marriedFilingJointly,
          clientAge: age,
          spouseAge:
            spouseStartAge != null ? spouseStartAge + (age - startAge) : null,
        });

        if (rmdDivisor && bal > 0) {

          bal -= Math.min(bal, bal / rmdDivisor);

        }

        if (age >= retireAge) {

          bal -= shortfallForAge(age);

        }

      }



      if (bal < -0.01) return false;

    }

    return true;

  };



  let high = Math.ceil(totalShortfall * 2);

  while (!survives(high) && high < 1_000_000_000) {

    high *= 2;

  }

  if (!survives(high)) return Math.round(high);



  let low = 0;

  while (high - low > 1) {

    const mid = Math.floor((low + high) / 2);

    if (survives(mid)) {

      high = mid;

    } else {

      low = mid;

    }

  }

  return Math.round(survives(low) ? low : high);

}



/**

 * Size starting holdout reserve for retirement income during overlap years.

 * Uses full-pool simulation to find overlap window and per-year Roth-path growth rates.

 */

export function projectIncomeHoldoutReserve(

  input: OptimizeRothPremiumInput

): IncomeHoldoutProjection {

  const rmdStartAge = input.rmdStartAge ?? RMD_ILLUSTRATION_START_AGE;
  const need = Math.max(0, Number(input.retirementSpendableIncomeAnnual) || 0);

  const annualSS = Math.max(0, Number(input.annualSocialSecurityGross) || 0);

  const retireAge = Math.max(0, Math.floor(Number(input.retirementAge) || 67));

  const startAge = Math.max(0, Math.floor(Number(input.currentAge) || 0));

  const ssStartAge =

    annualSS > 0

      ? Math.max(

          0,

          Math.floor(

            Number(input.socialSecurityStartAge) ||

              Math.min(70, Math.max(50, retireAge))

          )

        )

      : retireAge;

  const fundNeedFromIra = input.retirementIncomeFromConversionAccount === true;



  const shortfallForAge = (age: number) =>

    portfolioIncomeShortfallForAge({

      age,

      retireAge,

      ssStartAge,

      baseNeed: need,

      baseSS: annualSS,

      fundNeedFromIra,

      illustrationStartAge: startAge,

    }).portfolioIncomeShortfall;



  const { fullQualifiedBalance: _pool, ...modelInput } = input;
  const endAge = Math.max(startAge, Math.floor(Number(input.endAge) || DEFAULT_END_AGE));
  const deadlineAge = effectiveConversionDeadlineAge({
    startAge,
    endAge,
    rmdStartAge,
    useFixedIndexContract: input.useFixedIndexContract,
    ficSurrenderYears: input.ficSurrenderYears,
  });

  const fullPoolRefModel = buildRothConversionModel({
    ...modelInput,
    totalAccountValue: input.fullQualifiedBalance,
    stayTraditionalStartingBalance: input.fullQualifiedBalance,
    incomeHoldoutReserve: 0,
    protectInitialInvestment: false,
  });
  const fullPoolConversionCompleteAge = conversionCompleteAgeFromModel(fullPoolRefModel);
  if (fullPoolConversionCompleteAge == null) {
    return { holdoutReserve: 0 };
  }

  const overlapEndAge = Math.min(fullPoolConversionCompleteAge, deadlineAge);
  const hasOverlap =
    retireAge < overlapEndAge ||
    (fundNeedFromIra && startAge >= retireAge && fullPoolConversionCompleteAge > startAge);
  if (!hasOverlap) {
    return { holdoutReserve: 0 };
  }

  const subjectToRmd = startAge >= rmdStartAge;
  let holdoutReserve = 0;
  let growthByAge = new Map<number, number>();
  let convertBalanceAtAgeStart: Map<number, number> | undefined;

  for (let iter = 0; iter < (subjectToRmd ? 4 : 1); iter++) {
    const conversionPremium = Math.max(1, Math.floor(input.fullQualifiedBalance - holdoutReserve));
    const refModel = buildRothConversionModel({
      ...modelInput,
      totalAccountValue: conversionPremium,
      stayTraditionalStartingBalance: input.fullQualifiedBalance,
      incomeHoldoutReserve: holdoutReserve,
      protectInitialInvestment: false,
    });

    growthByAge = new Map(refModel.rothConversion.map((row) => [row.age, row.growthRate] as const));

    convertBalanceAtAgeStart = subjectToRmd
      ? new Map(
          refModel.rothConversion
            .filter((r) => !r.rothOnlyPhase)
            .map((r) => [r.age, r.yearStartTraditional] as const)
        )
      : undefined;

    const nextHoldout = minimumStartingHoldoutReserve({
      startAge,
      retireAge,
      conversionCompleteAge: overlapEndAge,
      growthByAge,
      shortfallForAge,
      convertBalanceAtAgeStart,
      rmdStartAge,
      marriedFilingJointly: input.marriedFilingJointly,
      spouseStartAge: input.spouseStartAge,
    });

    if (!subjectToRmd || Math.abs(nextHoldout - holdoutReserve) <= 1) {
      holdoutReserve = nextHoldout;
      break;
    }
    holdoutReserve = nextHoldout;
  }

  return {
    holdoutReserve,
    overlapStartAge: Math.max(retireAge, startAge),
    overlapEndAge,
  };
}



function incomeHoldoutForSimulation(
  params: OptimizeRothPremiumInput,
  conversionPremium: number
): number {
  if (params.retirementIncomeFromConversionAccount !== true) return 0;
  return Math.max(0, Math.floor(params.fullQualifiedBalance - conversionPremium));
}

function simulateAndCheckConverted(
  params: OptimizeRothPremiumInput,
  conversionPremium: number,
  rmdStartAge: number
): boolean {
  const { fullQualifiedBalance: _cap, rmdStartAge: _rmd, ...modelParams } = params;
  const incomeHoldoutReserve = incomeHoldoutForSimulation(params, conversionPremium);
  const model = buildRothConversionModel({
    ...modelParams,
    totalAccountValue: conversionPremium,
    stayTraditionalStartingBalance: params.fullQualifiedBalance,
    incomeHoldoutReserve,
  });
  return meetsConversionOptimizationGoal(model, params, rmdStartAge);
}



function buildSuccessResult(

  amount: number,

  holdout: IncomeHoldoutProjection,

  finalModel: RothConversionModelResult,

  input: OptimizeRothPremiumInput,

  rmdStartAge: number

): Extract<OptimizeRothPremiumResult, { ok: true }> {

  return {

    ok: true,

    amount: Math.round(amount),

    marginalRateNominalPct: finalModel.marginalRateNominalPct,

    protectInitialInvestment: Boolean(input.protectInitialInvestment),

    rmdStartAge,

    holdoutReserve: holdout.holdoutReserve,

    overlapStartAge: holdout.overlapStartAge,

    overlapEndAge: holdout.overlapEndAge,

  };

}



function binarySearchMaxConversionPremium(
  input: OptimizeRothPremiumInput,
  conversionCap: number,
  rmdStartAge: number
): number | null {
  if (conversionCap < 1) return null;

  if (simulateAndCheckConverted(input, conversionCap, rmdStartAge)) {
    return Math.floor(conversionCap);
  }

  if (!simulateAndCheckConverted(input, 1, rmdStartAge)) {
    return null;
  }

  let low = 1;
  let high = Math.floor(conversionCap);
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (simulateAndCheckConverted(input, mid, rmdStartAge)) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return simulateAndCheckConverted(input, high, rmdStartAge) ? high : low;
}



/**

 * Largest conversion premium that fully converts within the optimization goal while honoring bracket ceiling.

 * Pre-RMD clients must finish before RMD age; age 73+ clients may convert through RMD years within endAge.

 * When income is from the conversion account, reserves holdout for retirement income (and RMD on holdout) during overlap.

 */

export function computeOptimizedRothPremiumAmount(

  input: OptimizeRothPremiumInput

): OptimizeRothPremiumResult {

  const rmdStartAge = input.rmdStartAge ?? RMD_ILLUSTRATION_START_AGE;

  const fullQualifiedBalance = Math.max(0, Number(input.fullQualifiedBalance) || 0);

  const currentAge = Math.max(0, Math.floor(Number(input.currentAge) || 0));

  const endAge = Math.max(currentAge, Math.floor(Number(input.endAge) || DEFAULT_END_AGE));



  if (fullQualifiedBalance <= 0) {

    return { ok: false, error: "No traditional qualified balance is available to optimize." };

  }



  const need = Math.max(0, Number(input.retirementSpendableIncomeAnnual) || 0);

  if (need <= 0) {

    return {

      ok: false,

      error: "Enter total retirement income need to optimize the Roth premium.",

    };

  }

  if (input.retirementIncomeFromConversionAccount !== true && input.retirementIncomeFromConversionAccount !== false) {

    return {

      ok: false,

      error: 'Answer "Income received from conversion account?" (Yes or No) before optimizing premium.',

    };

  }



  const { fullQualifiedBalance: _cap, rmdStartAge: _rmd, ...modelParams } = input;



  if (input.retirementIncomeFromConversionAccount === false) {

    const amount = binarySearchMaxConversionPremium(input, fullQualifiedBalance, rmdStartAge);

    if (amount == null) {

      return {

        ok: false,

        error: conversionFailureMessage(currentAge, rmdStartAge, endAge, false, input),

      };

    }

    const finalModel = buildRothConversionModel({

      ...modelParams,

      totalAccountValue: amount,

      stayTraditionalStartingBalance: fullQualifiedBalance,

      incomeHoldoutReserve: 0,

    });

    return buildSuccessResult(amount, { holdoutReserve: 0 }, finalModel, input, rmdStartAge);

  }



  const holdoutProjection = projectIncomeHoldoutReserve({

    ...modelParams,

    fullQualifiedBalance,

    rmdStartAge,

  });

  const minimumHoldout = holdoutProjection.holdoutReserve;
  const conversionCap = fullQualifiedBalance - Math.max(0, minimumHoldout);

  if (conversionCap < 1) {
    return {
      ok: false,
      error:
        "Retirement income holdout exceeds the qualified balance. Reduce retirement income need or increase qualified balance.",
    };
  }

  const amount = binarySearchMaxConversionPremium(input, conversionCap, rmdStartAge);

  if (amount == null) {

    return {

      ok: false,

      error: conversionFailureMessage(currentAge, rmdStartAge, endAge, true, input),

    };

  }



  const allocatedHoldout = fullQualifiedBalance - amount;

  const finalHoldout: IncomeHoldoutProjection = {

    ...holdoutProjection,

    holdoutReserve: allocatedHoldout,

  };



  const finalModel = buildRothConversionModel({

    ...modelParams,

    totalAccountValue: amount,

    stayTraditionalStartingBalance: fullQualifiedBalance,

    incomeHoldoutReserve: allocatedHoldout,

  });



  return buildSuccessResult(amount, finalHoldout, finalModel, input, rmdStartAge);

}


