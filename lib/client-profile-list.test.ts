import { describe, expect, it } from "vitest";
import { buildProspectListItem, filterProspectListItems, sortProspectListItems } from "@/lib/client-profile-list";
import type { ClientProfileRow } from "@/lib/client-profiles";
import { emptyRothClient } from "@/lib/roth-client";
import { emptyRothWorksheet } from "@/lib/roth-worksheet";
import { emptyRothSocialSecurityState } from "@/lib/roth-social-security";

function sampleRow(over: Partial<ClientProfileRow> = {}): ClientProfileRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    email: "jane@example.com",
    first_name: "Jane",
    last_name: "Doe",
    source: "meta_optimize",
    status: "teaser_viewed",
    client: {
      ...emptyRothClient(),
      firstName: "Jane",
      lastName: "Doe",
      age: "62",
      married: true,
      stateOfResidence: "TX",
      adjustedGrossIncomeAnnual: "165000",
      federalTaxBracket: "22",
    },
    roth_worksheet: emptyRothWorksheet(),
    social_security: emptyRothSocialSecurityState(),
    manual_traditional_qualified: "500000",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
    ...over,
  };
}

describe("client-profile-list", () => {
  it("builds glance fields from profile row", () => {
    const item = buildProspectListItem(sampleRow());
    expect(item.name).toBe("Jane Doe");
    expect(item.email).toBe("jane@example.com");
    expect(item.maritalStatus).toBe("Married (MFJ)");
    expect(item.age).toBe("62");
    expect(item.stateCode).toBe("TX");
    expect(item.stateLabel).toBe("Texas");
    expect(item.qualifiedAssets).toBe(500000);
    expect(item.federalBracket).toBe("22%");
    expect(item.statusLabel).toBe("Viewed preview");
  });

  it("sorts by assets descending", () => {
    const a = buildProspectListItem(sampleRow({ manual_traditional_qualified: "100000" }));
    const b = buildProspectListItem(
      sampleRow({ id: "22222222-2222-4222-8222-222222222222", manual_traditional_qualified: "900000" }),
    );
    const sorted = sortProspectListItems([a, b], "assets", "desc");
    expect(sorted[0]!.qualifiedAssets).toBe(900000);
  });

  it("filters by status and search query", () => {
    const items = [
      buildProspectListItem(sampleRow()),
      buildProspectListItem(
        sampleRow({
          id: "22222222-2222-4222-8222-222222222222",
          email: "bob@example.com",
          first_name: "Bob",
          last_name: "Smith",
          status: "started",
        }),
      ),
    ];
    const filtered = filterProspectListItems(items, { status: "started", q: "bob" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.email).toBe("bob@example.com");
  });
});
