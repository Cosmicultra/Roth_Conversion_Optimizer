import { describe, expect, it } from "vitest";
import {
  rmdDivisorForAge,
  rmdStartAgeForBirthYear,
  rmdStartAgeForDob,
} from "@/lib/rmd-engine";

describe("rmd-engine", () => {
  it("RMD start age 75 for birth year 1960+", () => {
    expect(rmdStartAgeForBirthYear(1960)).toBe(75);
    expect(rmdStartAgeForBirthYear(1955)).toBe(73);
    expect(rmdStartAgeForBirthYear(1948)).toBe(72);
  });

  it("parses DOB for RMD start age", () => {
    expect(rmdStartAgeForDob("1965-06-01")).toBe(75);
    expect(rmdStartAgeForDob("1955-06-01")).toBe(73);
  });

  it("uses Joint table when spouse is more than 10 years younger", () => {
    const uniform = rmdDivisorForAge({
      age: 73,
      rmdStartAge: 73,
      marriedFilingJointly: true,
      clientAge: 73,
      spouseAge: 63,
    });
    const joint = rmdDivisorForAge({
      age: 73,
      rmdStartAge: 73,
      marriedFilingJointly: true,
      clientAge: 73,
      spouseAge: 58,
    });
    expect(uniform).toBe(26.5);
    expect(joint).toBe(28.9);
    expect(joint!).toBeGreaterThan(uniform!);
  });
});
