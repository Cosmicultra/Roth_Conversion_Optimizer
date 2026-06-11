import { describe, expect, it } from "vitest";
import {
  federalDeductionIllustration,
  irmaaAnnualSurchargeIllustrative,
  irmaaAnnualSurchargeWithLookback,
  maxRothConversionGrossThisYear,
  parseTotalDeductionsAnnual,
  standardDeductionIllustration,
  taxableIncomeCeilingForStatedBracket,
} from "@/lib/federal-tax-illustration";

describe("federal-tax-illustration 2025", () => {
  it("MFJ 35% ceiling taxable is 751_600", () => {
    expect(taxableIncomeCeilingForStatedBracket("35", "married")).toBe(751_600);
  });

  it("MFJ 35% gross ceiling with AGI 420_000 is about 781_600", () => {
    const sd = standardDeductionIllustration({
      filing: "married",
      calendarYearOffset: 0,
      clientAge: 73,
      spouseAge: 73,
    });
    expect(sd).toBe(34_700);
    const cap = maxRothConversionGrossThisYear({
      otherGrossOrdinaryIncome: 420_000,
      tradBalanceAvailableAfterRmd: 5_000_000,
      statedBracketId: "35",
      deduction: { filing: "married", calendarYearOffset: 0, clientAge: 73, spouseAge: 73 },
    });
    expect(cap).toBeCloseTo(751_600 + sd - 420_000, 0);
    expect(cap).toBeCloseTo(366_300, 0);
  });

  it("parseTotalDeductionsAnnual treats blank as null", () => {
    expect(parseTotalDeductionsAnnual("")).toBeNull();
    expect(parseTotalDeductionsAnnual(undefined)).toBeNull();
    expect(parseTotalDeductionsAnnual("50000")).toBe(50_000);
  });

  it("IRMAA lookback: ages 65–66 use proxy; age 67+ uses MAGI from age − 2", () => {
    const magiByAge = new Map([
      [63, 400_000],
      [64, 50_000],
      [65, 50_000],
      [66, 400_000],
    ]);
    const proxy = 120_000;

    expect(irmaaAnnualSurchargeWithLookback({ age: 64, magiByAge, filing: "single", proxyMagiBeforeHistory: proxy })).toBe(0);
    expect(irmaaAnnualSurchargeWithLookback({ age: 65, magiByAge, filing: "single", proxyMagiBeforeHistory: proxy })).toBe(
      irmaaAnnualSurchargeIllustrative(proxy, "single"),
    );
    expect(irmaaAnnualSurchargeWithLookback({ age: 66, magiByAge, filing: "single", proxyMagiBeforeHistory: proxy })).toBe(
      irmaaAnnualSurchargeIllustrative(proxy, "single"),
    );
    expect(irmaaAnnualSurchargeWithLookback({ age: 67, magiByAge, filing: "single", proxyMagiBeforeHistory: proxy })).toBe(
      irmaaAnnualSurchargeIllustrative(50_000, "single"),
    );
    expect(irmaaAnnualSurchargeWithLookback({ age: 68, magiByAge, filing: "single", proxyMagiBeforeHistory: proxy })).toBe(
      irmaaAnnualSurchargeIllustrative(400_000, "single"),
    );
  });

  it("federalDeductionIllustration uses totalDeductionsOverride when set", () => {
    const ded = federalDeductionIllustration({
      filing: "single",
      calendarYearOffset: 0,
      clientAge: 65,
      totalDeductionsOverride: 50_000,
    });
    expect(ded).toBe(50_000);
    expect(ded).toBeGreaterThan(
      standardDeductionIllustration({
        filing: "single",
        calendarYearOffset: 0,
        clientAge: 65,
      })
    );
  });
});
