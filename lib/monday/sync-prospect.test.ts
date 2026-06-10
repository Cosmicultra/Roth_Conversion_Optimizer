import { describe, expect, it } from "vitest";
import type { ClientProfileRow } from "@/lib/client-profiles";
import { emptyRothClient } from "@/lib/roth-client";
import { emptyRothSocialSecurityState } from "@/lib/roth-social-security";
import { emptyRothWorksheet } from "@/lib/roth-worksheet";
import {
  MONDAY_STATUS_PREVIEW_VIEWED,
  MONDAY_STATUS_WIZARD_COMPLETE,
} from "@/lib/monday/config";
import { buildMondayColumnValues } from "@/lib/monday/sync-prospect";

function sampleProfile(over: Partial<ClientProfileRow> = {}): ClientProfileRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    email: "jane@example.com",
    first_name: "Jane",
    last_name: "Doe",
    source: "meta_optimize",
    status: "wizard_complete",
    client: {
      ...emptyRothClient(),
      age: "62",
      married: true,
      stateOfResidence: "TX",
    },
    roth_worksheet: emptyRothWorksheet(),
    social_security: emptyRothSocialSecurityState(),
    manual_traditional_qualified: "500000",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
    ...over,
  };
}

const columns = {
  email: "email_col",
  status: "status_col",
  state: "state_col",
  age: "age_col",
  assets: "assets_col",
  source: "source_col",
};

describe("buildMondayColumnValues", () => {
  it("maps wizard_complete profile fields to Monday column ids", () => {
    const values = buildMondayColumnValues(sampleProfile(), columns);

    expect(values).toEqual({
      email_col: { email: "jane@example.com", text: "jane@example.com" },
      status_col: { label: MONDAY_STATUS_WIZARD_COMPLETE },
      state_col: "Texas",
      age_col: "62",
      assets_col: "500000",
      source_col: "meta_optimize",
    });
  });

  it("uses preview viewed label for teaser_viewed status", () => {
    const values = buildMondayColumnValues(
      sampleProfile({ status: "teaser_viewed", monday_item_id: "999" }),
      { status: "status_col" },
    );

    expect(values).toEqual({
      status_col: { label: MONDAY_STATUS_PREVIEW_VIEWED },
    });
  });

  it("allows explicit status override", () => {
    const values = buildMondayColumnValues(sampleProfile(), { status: "status_col" }, "Custom status");

    expect(values).toEqual({
      status_col: { label: "Custom status" },
    });
  });

  it("skips empty optional fields", () => {
    const values = buildMondayColumnValues(
      sampleProfile({
        client: emptyRothClient(),
        manual_traditional_qualified: "",
        source: "",
      }),
      columns,
    );

    expect(values).toEqual({
      email_col: { email: "jane@example.com", text: "jane@example.com" },
      status_col: { label: MONDAY_STATUS_WIZARD_COMPLETE },
    });
  });
});
