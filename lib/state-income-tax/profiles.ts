import type { IllustrationFiling } from "@/lib/federal-tax-illustration";
import type { StateCode, StateRateBand, StateTaxProfile } from "@/lib/state-income-tax/types";

export { ALL_STATE_CODES } from "@/lib/state-income-tax/types";

function noTax(code: StateCode, name: string): StateTaxProfile {
  return { code, name, hasIncomeTax: false, socialSecurityTreatment: "exempt", brackets: {} };
}

function flat(
  code: StateCode,
  name: string,
  rate: number,
  ss: StateTaxProfile["socialSecurityTreatment"] = "federal_taxable"
): StateTaxProfile {
  return { code, name, hasIncomeTax: true, socialSecurityTreatment: ss, brackets: {}, flatRate: rate };
}

function progressive(
  code: StateCode,
  name: string,
  single: StateRateBand[],
  married: StateRateBand[],
  ss: StateTaxProfile["socialSecurityTreatment"] = "federal_taxable"
): StateTaxProfile {
  return {
    code,
    name,
    hasIncomeTax: true,
    socialSecurityTreatment: ss,
    brackets: { single, married },
  };
}

/** 2025 illustrative state profiles — Tax Foundation / state revenue approximations. */
export const STATE_TAX_PROFILES: Record<StateCode, StateTaxProfile> = {
  AL: progressive("AL", "Alabama", [
    { low: 0, high: 500, rate: 0.02 },
    { low: 500, high: 3000, rate: 0.04 },
    { low: 3000, high: Number.POSITIVE_INFINITY, rate: 0.05 },
  ], [
    { low: 0, high: 1000, rate: 0.02 },
    { low: 1000, high: 6000, rate: 0.04 },
    { low: 6000, high: Number.POSITIVE_INFINITY, rate: 0.05 },
  ]),
  AK: noTax("AK", "Alaska"),
  AZ: flat("AZ", "Arizona", 0.025),
  AR: progressive("AR", "Arkansas", [
    { low: 0, high: 4300, rate: 0.02 },
    { low: 4300, high: 8500, rate: 0.04 },
    { low: 8500, high: Number.POSITIVE_INFINITY, rate: 0.044 },
  ], [
    { low: 0, high: 4300, rate: 0.02 },
    { low: 4300, high: 8500, rate: 0.04 },
    { low: 8500, high: Number.POSITIVE_INFINITY, rate: 0.044 },
  ]),
  CA: progressive("CA", "California", [
    { low: 0, high: 10756, rate: 0.01 },
    { low: 10756, high: 25499, rate: 0.02 },
    { low: 25499, high: 40245, rate: 0.04 },
    { low: 40245, high: 55866, rate: 0.06 },
    { low: 55866, high: 70606, rate: 0.08 },
    { low: 70606, high: 360659, rate: 0.093 },
    { low: 360659, high: 432787, rate: 0.103 },
    { low: 432787, high: 721314, rate: 0.113 },
    { low: 721314, high: Number.POSITIVE_INFINITY, rate: 0.123 },
  ], [
    { low: 0, high: 21512, rate: 0.01 },
    { low: 21512, high: 50998, rate: 0.02 },
    { low: 50998, high: 80490, rate: 0.04 },
    { low: 80490, high: 111732, rate: 0.06 },
    { low: 111732, high: 141212, rate: 0.08 },
    { low: 141212, high: 721318, rate: 0.093 },
    { low: 721318, high: 865574, rate: 0.103 },
    { low: 865574, high: 1442628, rate: 0.113 },
    { low: 1442628, high: Number.POSITIVE_INFINITY, rate: 0.123 },
  ], "exempt"),
  CO: flat("CO", "Colorado", 0.044),
  CT: progressive("CT", "Connecticut", [
    { low: 0, high: 10000, rate: 0.02 },
    { low: 10000, high: 50000, rate: 0.045 },
    { low: 50000, high: 100000, rate: 0.055 },
    { low: 100000, high: 200000, rate: 0.06 },
    { low: 200000, high: 250000, rate: 0.065 },
    { low: 250000, high: 500000, rate: 0.069 },
    { low: 500000, high: Number.POSITIVE_INFINITY, rate: 0.0699 },
  ], [
    { low: 0, high: 20000, rate: 0.02 },
    { low: 20000, high: 100000, rate: 0.045 },
    { low: 100000, high: 200000, rate: 0.055 },
    { low: 200000, high: 400000, rate: 0.06 },
    { low: 400000, high: 500000, rate: 0.065 },
    { low: 500000, high: 1000000, rate: 0.069 },
    { low: 1000000, high: Number.POSITIVE_INFINITY, rate: 0.0699 },
  ]),
  DE: progressive("DE", "Delaware", [
    { low: 0, high: 2000, rate: 0.022 },
    { low: 2000, high: 5000, rate: 0.039 },
    { low: 5000, high: 10000, rate: 0.048 },
    { low: 10000, high: 20000, rate: 0.052 },
    { low: 20000, high: 25000, rate: 0.0555 },
    { low: 25000, high: 60000, rate: 0.066 },
    { low: 60000, high: Number.POSITIVE_INFINITY, rate: 0.066 },
  ], [
    { low: 0, high: 2000, rate: 0.022 },
    { low: 2000, high: 5000, rate: 0.039 },
    { low: 5000, high: 10000, rate: 0.048 },
    { low: 10000, high: 20000, rate: 0.052 },
    { low: 20000, high: 25000, rate: 0.0555 },
    { low: 25000, high: 60000, rate: 0.066 },
    { low: 60000, high: Number.POSITIVE_INFINITY, rate: 0.066 },
  ]),
  DC: progressive("DC", "District of Columbia", [
    { low: 0, high: 10000, rate: 0.04 },
    { low: 10000, high: 40000, rate: 0.06 },
    { low: 40000, high: 60000, rate: 0.065 },
    { low: 60000, high: 250000, rate: 0.085 },
    { low: 250000, high: 500000, rate: 0.0925 },
    { low: 500000, high: 1000000, rate: 0.0975 },
    { low: 1000000, high: Number.POSITIVE_INFINITY, rate: 0.1075 },
  ], [
    { low: 0, high: 10000, rate: 0.04 },
    { low: 10000, high: 40000, rate: 0.06 },
    { low: 40000, high: 60000, rate: 0.065 },
    { low: 60000, high: 250000, rate: 0.085 },
    { low: 250000, high: 500000, rate: 0.0925 },
    { low: 500000, high: 1000000, rate: 0.0975 },
    { low: 1000000, high: Number.POSITIVE_INFINITY, rate: 0.1075 },
  ]),
  FL: noTax("FL", "Florida"),
  GA: flat("GA", "Georgia", 0.0539),
  HI: progressive("HI", "Hawaii", [
    { low: 0, high: 2400, rate: 0.014 },
    { low: 2400, high: 4800, rate: 0.032 },
    { low: 4800, high: 9600, rate: 0.055 },
    { low: 9600, high: 14400, rate: 0.064 },
    { low: 14400, high: 19200, rate: 0.068 },
    { low: 19200, high: 24000, rate: 0.072 },
    { low: 24000, high: 36000, rate: 0.076 },
    { low: 36000, high: 48000, rate: 0.079 },
    { low: 48000, high: 150000, rate: 0.0825 },
    { low: 150000, high: 175000, rate: 0.09 },
    { low: 175000, high: 200000, rate: 0.1 },
    { low: 200000, high: Number.POSITIVE_INFINITY, rate: 0.11 },
  ], [
    { low: 0, high: 4800, rate: 0.014 },
    { low: 4800, high: 9600, rate: 0.032 },
    { low: 9600, high: 19200, rate: 0.055 },
    { low: 19200, high: 28800, rate: 0.064 },
    { low: 28800, high: 38400, rate: 0.068 },
    { low: 38400, high: 48000, rate: 0.072 },
    { low: 48000, high: 72000, rate: 0.076 },
    { low: 72000, high: 96000, rate: 0.079 },
    { low: 96000, high: 300000, rate: 0.0825 },
    { low: 300000, high: 350000, rate: 0.09 },
    { low: 350000, high: 400000, rate: 0.1 },
    { low: 400000, high: Number.POSITIVE_INFINITY, rate: 0.11 },
  ]),
  ID: flat("ID", "Idaho", 0.058),
  IL: flat("IL", "Illinois", 0.0495),
  IN: flat("IN", "Indiana", 0.0305),
  IA: flat("IA", "Iowa", 0.038),
  KS: progressive("KS", "Kansas", [
    { low: 0, high: 15000, rate: 0.052 },
    { low: 15000, high: 30000, rate: 0.0558 },
    { low: 30000, high: Number.POSITIVE_INFINITY, rate: 0.057 },
  ], [
    { low: 0, high: 30000, rate: 0.052 },
    { low: 30000, high: 60000, rate: 0.0558 },
    { low: 60000, high: Number.POSITIVE_INFINITY, rate: 0.057 },
  ]),
  KY: flat("KY", "Kentucky", 0.04),
  LA: progressive("LA", "Louisiana", [
    { low: 0, high: 12500, rate: 0.0185 },
    { low: 12500, high: 50000, rate: 0.035 },
    { low: 50000, high: Number.POSITIVE_INFINITY, rate: 0.0425 },
  ], [
    { low: 0, high: 25000, rate: 0.0185 },
    { low: 25000, high: 100000, rate: 0.035 },
    { low: 100000, high: Number.POSITIVE_INFINITY, rate: 0.0425 },
  ]),
  ME: progressive("ME", "Maine", [
    { low: 0, high: 26050, rate: 0.058 },
    { low: 26050, high: 61600, rate: 0.0675 },
    { low: 61600, high: Number.POSITIVE_INFINITY, rate: 0.0715 },
  ], [
    { low: 0, high: 52100, rate: 0.058 },
    { low: 52100, high: 123250, rate: 0.0675 },
    { low: 123250, high: Number.POSITIVE_INFINITY, rate: 0.0715 },
  ]),
  MD: progressive("MD", "Maryland", [
    { low: 0, high: 1000, rate: 0.02 },
    { low: 1000, high: 2000, rate: 0.03 },
    { low: 2000, high: 3000, rate: 0.04 },
    { low: 3000, high: 100000, rate: 0.0475 },
    { low: 100000, high: 125000, rate: 0.05 },
    { low: 125000, high: 150000, rate: 0.0525 },
    { low: 150000, high: 250000, rate: 0.055 },
    { low: 250000, high: Number.POSITIVE_INFINITY, rate: 0.0575 },
  ], [
    { low: 0, high: 1000, rate: 0.02 },
    { low: 1000, high: 2000, rate: 0.03 },
    { low: 2000, high: 3000, rate: 0.04 },
    { low: 3000, high: 150000, rate: 0.0475 },
    { low: 150000, high: 175000, rate: 0.05 },
    { low: 175000, high: 225000, rate: 0.0525 },
    { low: 225000, high: 300000, rate: 0.055 },
    { low: 300000, high: Number.POSITIVE_INFINITY, rate: 0.0575 },
  ]),
  MA: flat("MA", "Massachusetts", 0.05),
  MI: flat("MI", "Michigan", 0.0425),
  MN: progressive("MN", "Minnesota", [
    { low: 0, high: 31690, rate: 0.0535 },
    { low: 31690, high: 104390, rate: 0.068 },
    { low: 104390, high: 183640, rate: 0.0785 },
    { low: 183640, high: Number.POSITIVE_INFINITY, rate: 0.0985 },
  ], [
    { low: 0, high: 46330, rate: 0.0535 },
    { low: 46330, high: 184040, rate: 0.068 },
    { low: 184040, high: 321450, rate: 0.0785 },
    { low: 321450, high: Number.POSITIVE_INFINITY, rate: 0.0985 },
  ]),
  MS: flat("MS", "Mississippi", 0.05),
  MO: progressive("MO", "Missouri", [
    { low: 0, high: 1207, rate: 0.02 },
    { low: 1207, high: 2414, rate: 0.025 },
    { low: 2414, high: 3621, rate: 0.03 },
    { low: 3621, high: 4828, rate: 0.035 },
    { low: 4828, high: 6035, rate: 0.04 },
    { low: 6035, high: 7242, rate: 0.045 },
    { low: 7242, high: 8449, rate: 0.05 },
    { low: 8449, high: Number.POSITIVE_INFINITY, rate: 0.048 },
  ], [
    { low: 0, high: 1207, rate: 0.02 },
    { low: 1207, high: 2414, rate: 0.025 },
    { low: 2414, high: 3621, rate: 0.03 },
    { low: 3621, high: 4828, rate: 0.035 },
    { low: 4828, high: 6035, rate: 0.04 },
    { low: 6035, high: 7242, rate: 0.045 },
    { low: 7242, high: 8449, rate: 0.05 },
    { low: 8449, high: Number.POSITIVE_INFINITY, rate: 0.048 },
  ]),
  MT: progressive("MT", "Montana", [
    { low: 0, high: 3600, rate: 0.01 },
    { low: 3600, high: 6300, rate: 0.02 },
    { low: 6300, high: 9700, rate: 0.03 },
    { low: 9700, high: 13000, rate: 0.04 },
    { low: 13000, high: 16800, rate: 0.05 },
    { low: 16800, high: 21600, rate: 0.06 },
    { low: 21600, high: Number.POSITIVE_INFINITY, rate: 0.059 },
  ], [
    { low: 0, high: 3600, rate: 0.01 },
    { low: 3600, high: 6300, rate: 0.02 },
    { low: 6300, high: 9700, rate: 0.03 },
    { low: 9700, high: 13000, rate: 0.04 },
    { low: 13000, high: 16800, rate: 0.05 },
    { low: 16800, high: 21600, rate: 0.06 },
    { low: 21600, high: Number.POSITIVE_INFINITY, rate: 0.059 },
  ]),
  NE: progressive("NE", "Nebraska", [
    { low: 0, high: 3700, rate: 0.0246 },
    { low: 3700, high: 22170, rate: 0.0351 },
    { low: 22170, high: 35730, rate: 0.0501 },
    { low: 35730, high: Number.POSITIVE_INFINITY, rate: 0.0584 },
  ], [
    { low: 0, high: 7370, rate: 0.0246 },
    { low: 7370, high: 44350, rate: 0.0351 },
    { low: 44350, high: 71460, rate: 0.0501 },
    { low: 71460, high: Number.POSITIVE_INFINITY, rate: 0.0584 },
  ]),
  NV: noTax("NV", "Nevada"),
  NH: noTax("NH", "New Hampshire"),
  NJ: progressive("NJ", "New Jersey", [
    { low: 0, high: 20000, rate: 0.014 },
    { low: 20000, high: 35000, rate: 0.0175 },
    { low: 35000, high: 40000, rate: 0.035 },
    { low: 40000, high: 75000, rate: 0.05525 },
    { low: 75000, high: 500000, rate: 0.0637 },
    { low: 500000, high: 1000000, rate: 0.0897 },
    { low: 1000000, high: Number.POSITIVE_INFINITY, rate: 0.1075 },
  ], [
    { low: 0, high: 20000, rate: 0.014 },
    { low: 20000, high: 50000, rate: 0.0175 },
    { low: 50000, high: 70000, rate: 0.0245 },
    { low: 70000, high: 80000, rate: 0.035 },
    { low: 80000, high: 150000, rate: 0.05525 },
    { low: 150000, high: 500000, rate: 0.0637 },
    { low: 500000, high: 1000000, rate: 0.0897 },
    { low: 1000000, high: Number.POSITIVE_INFINITY, rate: 0.1075 },
  ], "exempt"),
  NM: progressive("NM", "New Mexico", [
    { low: 0, high: 5500, rate: 0.015 },
    { low: 5500, high: 11000, rate: 0.032 },
    { low: 11000, high: 16000, rate: 0.043 },
    { low: 16000, high: 210000, rate: 0.047 },
    { low: 210000, high: Number.POSITIVE_INFINITY, rate: 0.059 },
  ], [
    { low: 0, high: 8000, rate: 0.015 },
    { low: 8000, high: 16000, rate: 0.032 },
    { low: 16000, high: 24000, rate: 0.043 },
    { low: 24000, high: 315000, rate: 0.047 },
    { low: 315000, high: Number.POSITIVE_INFINITY, rate: 0.059 },
  ]),
  NY: progressive("NY", "New York", [
    { low: 0, high: 8500, rate: 0.04 },
    { low: 8500, high: 11700, rate: 0.045 },
    { low: 11700, high: 13900, rate: 0.0525 },
    { low: 13900, high: 80650, rate: 0.055 },
    { low: 80650, high: 215400, rate: 0.06 },
    { low: 215400, high: 1077550, rate: 0.0685 },
    { low: 1077550, high: 5000000, rate: 0.0965 },
    { low: 5000000, high: 25000000, rate: 0.103 },
    { low: 25000000, high: Number.POSITIVE_INFINITY, rate: 0.109 },
  ], [
    { low: 0, high: 17150, rate: 0.04 },
    { low: 17150, high: 23600, rate: 0.045 },
    { low: 23600, high: 27900, rate: 0.0525 },
    { low: 27900, high: 161550, rate: 0.055 },
    { low: 161550, high: 323200, rate: 0.06 },
    { low: 323200, high: 2155350, rate: 0.0685 },
    { low: 2155350, high: 5000000, rate: 0.0965 },
    { low: 5000000, high: 25000000, rate: 0.103 },
    { low: 25000000, high: Number.POSITIVE_INFINITY, rate: 0.109 },
  ]),
  NC: flat("NC", "North Carolina", 0.045),
  ND: flat("ND", "North Dakota", 0.0195),
  OH: progressive("OH", "Ohio", [
    { low: 0, high: 26050, rate: 0 },
    { low: 26050, high: 100000, rate: 0.0275 },
    { low: 100000, high: Number.POSITIVE_INFINITY, rate: 0.035 },
  ], [
    { low: 0, high: 26050, rate: 0 },
    { low: 26050, high: 100000, rate: 0.0275 },
    { low: 100000, high: Number.POSITIVE_INFINITY, rate: 0.035 },
  ]),
  OK: progressive("OK", "Oklahoma", [
    { low: 0, high: 1000, rate: 0.0025 },
    { low: 1000, high: 2500, rate: 0.0075 },
    { low: 2500, high: 3750, rate: 0.0175 },
    { low: 3750, high: 4900, rate: 0.0275 },
    { low: 4900, high: 7200, rate: 0.0375 },
    { low: 7200, high: Number.POSITIVE_INFINITY, rate: 0.0475 },
  ], [
    { low: 0, high: 2000, rate: 0.0025 },
    { low: 2000, high: 5000, rate: 0.0075 },
    { low: 5000, high: 7500, rate: 0.0175 },
    { low: 7500, high: 9800, rate: 0.0275 },
    { low: 9800, high: 14400, rate: 0.0375 },
    { low: 14400, high: Number.POSITIVE_INFINITY, rate: 0.0475 },
  ]),
  OR: progressive("OR", "Oregon", [
    { low: 0, high: 4300, rate: 0.0475 },
    { low: 4300, high: 10750, rate: 0.0675 },
    { low: 10750, high: 125000, rate: 0.0875 },
    { low: 125000, high: Number.POSITIVE_INFINITY, rate: 0.099 },
  ], [
    { low: 0, high: 8600, rate: 0.0475 },
    { low: 8600, high: 21500, rate: 0.0675 },
    { low: 21500, high: 250000, rate: 0.0875 },
    { low: 250000, high: Number.POSITIVE_INFINITY, rate: 0.099 },
  ]),
  PA: flat("PA", "Pennsylvania", 0.0307),
  RI: progressive("RI", "Rhode Island", [
    { low: 0, high: 77450, rate: 0.0375 },
    { low: 77450, high: 176050, rate: 0.0475 },
    { low: 176050, high: Number.POSITIVE_INFINITY, rate: 0.0599 },
  ], [
    { low: 0, high: 77450, rate: 0.0375 },
    { low: 77450, high: 176050, rate: 0.0475 },
    { low: 176050, high: Number.POSITIVE_INFINITY, rate: 0.0599 },
  ]),
  SC: progressive("SC", "South Carolina", [
    { low: 0, high: 3460, rate: 0 },
    { low: 3460, high: 17330, rate: 0.03 },
    { low: 17330, high: Number.POSITIVE_INFINITY, rate: 0.062 },
  ], [
    { low: 0, high: 3460, rate: 0 },
    { low: 3460, high: 17330, rate: 0.03 },
    { low: 17330, high: Number.POSITIVE_INFINITY, rate: 0.062 },
  ]),
  SD: noTax("SD", "South Dakota"),
  TN: noTax("TN", "Tennessee"),
  TX: noTax("TX", "Texas"),
  UT: flat("UT", "Utah", 0.0455),
  VT: progressive("VT", "Vermont", [
    { low: 0, high: 45400, rate: 0.0335 },
    { low: 45400, high: 110050, rate: 0.066 },
    { low: 110050, high: 229550, rate: 0.076 },
    { low: 229550, high: Number.POSITIVE_INFINITY, rate: 0.0875 },
  ], [
    { low: 0, high: 75850, rate: 0.0335 },
    { low: 75850, high: 183400, rate: 0.066 },
    { low: 183400, high: 279450, rate: 0.076 },
    { low: 279450, high: Number.POSITIVE_INFINITY, rate: 0.0875 },
  ]),
  VA: progressive("VA", "Virginia", [
    { low: 0, high: 3000, rate: 0.02 },
    { low: 3000, high: 5000, rate: 0.03 },
    { low: 5000, high: 17000, rate: 0.05 },
    { low: 17000, high: Number.POSITIVE_INFINITY, rate: 0.0575 },
  ], [
    { low: 0, high: 3000, rate: 0.02 },
    { low: 3000, high: 5000, rate: 0.03 },
    { low: 5000, high: 17000, rate: 0.05 },
    { low: 17000, high: Number.POSITIVE_INFINITY, rate: 0.0575 },
  ]),
  WA: noTax("WA", "Washington"),
  WV: progressive("WV", "West Virginia", [
    { low: 0, high: 10000, rate: 0.0222 },
    { low: 10000, high: 25000, rate: 0.0296 },
    { low: 25000, high: 40000, rate: 0.0333 },
    { low: 40000, high: 60000, rate: 0.0444 },
    { low: 60000, high: Number.POSITIVE_INFINITY, rate: 0.0512 },
  ], [
    { low: 0, high: 10000, rate: 0.0222 },
    { low: 10000, high: 25000, rate: 0.0296 },
    { low: 25000, high: 40000, rate: 0.0333 },
    { low: 40000, high: 60000, rate: 0.0444 },
    { low: 60000, high: Number.POSITIVE_INFINITY, rate: 0.0512 },
  ]),
  WI: progressive("WI", "Wisconsin", [
    { low: 0, high: 14320, rate: 0.035 },
    { low: 14320, high: 28640, rate: 0.044 },
    { low: 28640, high: 315310, rate: 0.053 },
    { low: 315310, high: Number.POSITIVE_INFINITY, rate: 0.0765 },
  ], [
    { low: 0, high: 19090, rate: 0.035 },
    { low: 19090, high: 38190, rate: 0.044 },
    { low: 38190, high: 420420, rate: 0.053 },
    { low: 420420, high: Number.POSITIVE_INFINITY, rate: 0.0765 },
  ]),
  WY: noTax("WY", "Wyoming"),
};

export function normalizeStateCode(raw: string | undefined): StateCode | null {
  const code = String(raw ?? "").trim().toUpperCase();
  if (!code) return null;
  return code in STATE_TAX_PROFILES ? (code as StateCode) : null;
}

export function listStatesForDropdown(): { code: StateCode; name: string }[] {
  return Object.values(STATE_TAX_PROFILES)
    .map((p) => ({ code: p.code, name: p.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
