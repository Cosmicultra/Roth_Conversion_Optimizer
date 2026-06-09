import type { RothComparisonVisualData } from "@/lib/roth-comparison-visuals";
import { formatRothMoneyFull } from "@/lib/roth-visual-theme";

export type WealthAllocationPath = "stay" | "roth";

export function wealthAllocationSegmentDescription(
  key: string,
  path: WealthAllocationPath,
  data: RothComparisonVisualData,
): string {
  switch (key) {
    case "heirs":
      if (path === "stay") {
        return `Traditional IRA balance projected at the end of the plan, reduced by an assumed ${data.assumedHeirTaxRatePct}% beneficiary ordinary income tax at death. This is illustrative — not estate tax and not tax advice.`;
      }
      return "Projected Roth IRA balance at the end of the plan, illustrated as tax-free to heirs. No assumed heir income tax is applied on the Roth path.";
    case "income":
      return "After-tax retirement income you keep during the modeled lifetime — withdrawals and spendable cash flow from the account pool after illustrative federal taxes on those distributions.";
    case "taxes":
      return "Lifetime illustrative federal taxes on conversions and withdrawals, plus Medicare IRMAA surcharges modeled during the plan. Shown separately from legacy so you can see how much wealth went to taxes and surcharges.";
    case "heirTax":
      return `Assumed default heir tax on death (${data.assumedHeirTaxRatePct}% of gross traditional legacy). Illustrates beneficiary ordinary income tax when heirs inherit pre-tax IRA assets — current path only.`;
    default:
      return "";
  }
}

export function bracketZoneDescription(
  zone: "convert" | "ceiling" | "avoid",
  data: RothComparisonVisualData,
): string {
  const nextBracket = [10, 12, 22, 24, 32, 35, 37].find((r) => r > data.maxBracketPct);

  switch (zone) {
    case "convert":
      return `Each conversion year, Roth conversions are sized to keep illustrative gross income at or below ${formatRothMoneyFull(data.grossIncomeCeiling)} — the top of your ${data.maxBracketPct}% marginal bracket (${data.filingLabel.toLowerCase()}).`;
    case "ceiling":
      return `Your stop line at ${formatRothMoneyFull(data.grossIncomeCeiling)} gross income. Conversions use available room each year without pushing ordinary income into the next bracket${nextBracket ? ` (${nextBracket}%)` : ""}.`;
    case "avoid":
      return "Income above your ceiling would cross into a higher marginal tax rate. The conversion plan avoids sizing conversions so large that you spill into this zone.";
    default:
      return "";
  }
}
