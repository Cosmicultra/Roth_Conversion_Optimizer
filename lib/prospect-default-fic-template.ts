/**
 * Hardcoded Generic (Product) FIC template for prospect-facing runs.
 * Update these values if your saved browser template changes.
 */
import {
  normalizeRothWorksheet,
  type RothFixedIndexContractFields,
  type RothWorksheet,
} from "@/lib/roth-worksheet";

export const GENERIC_PRODUCT_FIC_TEMPLATE: RothFixedIndexContractFields = {
  carrierName: "Generic",
  productName: "Product",
  premiumBonusPct: "10",
  trailingBonusPct: "0",
  trailBonusYears: "",
  contractEstimatedRateOfReturnPct: "6",
  maxTaxRatePct: "22",
  stateTaxPct: "",
  protectInitialInvestment: false,
  payConversionTaxFrom: "external",
  penaltyFreeWithdrawalPct: "10",
  surrenderYears: "10",
};

export function applyProspectFicDefaults(ws: RothWorksheet): RothWorksheet {
  return normalizeRothWorksheet({
    ...ws,
    useFixedIndexContract: true,
    fic: {
      ...ws.fic,
      ...GENERIC_PRODUCT_FIC_TEMPLATE,
      // Preserve max tax rate from step 02 if the prospect entered one.
      maxTaxRatePct: ws.fic.maxTaxRatePct?.trim() ? ws.fic.maxTaxRatePct : GENERIC_PRODUCT_FIC_TEMPLATE.maxTaxRatePct,
      protectInitialInvestment: ws.fic.protectInitialInvestment,
      payConversionTaxFrom: ws.fic.payConversionTaxFrom ?? GENERIC_PRODUCT_FIC_TEMPLATE.payConversionTaxFrom,
    },
  });
}
