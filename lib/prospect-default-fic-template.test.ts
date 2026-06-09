import { describe, expect, it } from "vitest";
import { emptyRothWorksheet } from "@/lib/roth-worksheet";
import { applyProspectFicDefaults, GENERIC_PRODUCT_FIC_TEMPLATE } from "@/lib/prospect-default-fic-template";

describe("applyProspectFicDefaults", () => {
  it("forces FIC on with generic product template", () => {
    const ws = emptyRothWorksheet();
    const next = applyProspectFicDefaults(ws);
    expect(next.useFixedIndexContract).toBe(true);
    expect(next.fic.carrierName).toBe(GENERIC_PRODUCT_FIC_TEMPLATE.carrierName);
    expect(next.fic.productName).toBe(GENERIC_PRODUCT_FIC_TEMPLATE.productName);
    expect(next.fic.premiumBonusPct).toBe(GENERIC_PRODUCT_FIC_TEMPLATE.premiumBonusPct);
  });

  it("preserves max tax rate from worksheet when set", () => {
    const ws = emptyRothWorksheet();
    ws.fic.maxTaxRatePct = "24";
    const next = applyProspectFicDefaults(ws);
    expect(next.fic.maxTaxRatePct).toBe("24");
  });
});
