import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildBookingClear,
  buildBookingUpdate,
  parseCalendlyWebhookPayload,
  planCalendlyProfileLookup,
  resolveProfileLookup,
  verifyCalendlyWebhookSignature,
} from "@/lib/calendly-webhook";

const PROFILE_ID = "11111111-1111-4111-8111-111111111111";
const INVITEE_URI = "https://api.calendly.com/scheduled_events/abc/invitees/def";

function samplePayload(event: string, over: Record<string, unknown> = {}) {
  return {
    event,
    payload: {
      email: "jane@example.com",
      uri: INVITEE_URI,
      tracking: {
        utm_content: PROFILE_ID,
      },
      scheduled_event: {
        start_time: "2026-06-15T14:00:00.000000Z",
      },
      ...over,
    },
  };
}

function signBody(rawBody: string, secret: string, timestamp = "1492774577"): string {
  const signature = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

describe("calendly-webhook", () => {
  describe("verifyCalendlyWebhookSignature", () => {
    it("accepts a valid signature", () => {
      const secret = "test-signing-key";
      const rawBody = JSON.stringify(samplePayload("invitee.created"));
      const header = signBody(rawBody, secret);
      expect(verifyCalendlyWebhookSignature(rawBody, header, secret)).toBe(true);
    });

    it("rejects an invalid signature", () => {
      const rawBody = JSON.stringify(samplePayload("invitee.created"));
      expect(verifyCalendlyWebhookSignature(rawBody, "t=123,v1=deadbeef", "test-signing-key")).toBe(false);
    });

    it("rejects when signing key is missing", () => {
      const rawBody = JSON.stringify(samplePayload("invitee.created"));
      expect(verifyCalendlyWebhookSignature(rawBody, "t=123,v1=abc", "")).toBe(false);
    });
  });

  describe("parseCalendlyWebhookPayload", () => {
    it("extracts profile id from utm_content", () => {
      const parsed = parseCalendlyWebhookPayload(samplePayload("invitee.created"));
      expect(parsed).toEqual({
        event: "invitee.created",
        inviteeEmail: "jane@example.com",
        inviteeUri: INVITEE_URI,
        profileId: PROFILE_ID,
        meetingStartAt: "2026-06-15T14:00:00.000000Z",
      });
    });

    it("ignores invalid utm_content and falls back to email lookup", () => {
      const parsed = parseCalendlyWebhookPayload(
        samplePayload("invitee.created", { tracking: { utm_content: "not-a-uuid" } }),
      );
      expect(parsed?.profileId).toBeNull();
      expect(parsed?.inviteeEmail).toBe("jane@example.com");
    });

    it("returns null for unsupported events", () => {
      expect(parseCalendlyWebhookPayload({ event: "routing_form_submission", payload: {} })).toBeNull();
    });

    it("parses invitee.canceled events", () => {
      const parsed = parseCalendlyWebhookPayload(samplePayload("invitee.canceled"));
      expect(parsed?.event).toBe("invitee.canceled");
    });
  });

  describe("resolveProfileLookup", () => {
    it("prefers profile id when present", () => {
      expect(resolveProfileLookup({ profileId: PROFILE_ID, inviteeEmail: "Jane@Example.com" })).toEqual({
        byId: PROFILE_ID,
        byEmail: "jane@example.com",
      });
    });
  });

  describe("planCalendlyProfileLookup", () => {
    it("uses profile id when utm_content is a valid uuid", () => {
      expect(planCalendlyProfileLookup({ profileId: PROFILE_ID, inviteeEmail: "jane@example.com" })).toEqual({
        kind: "by_id",
        profileId: PROFILE_ID,
      });
    });

    it("falls back to newest-by-email when profile id is absent", () => {
      expect(planCalendlyProfileLookup({ profileId: null, inviteeEmail: "Jane@Example.com" })).toEqual({
        kind: "by_email_newest",
        email: "jane@example.com",
      });
    });

    it("returns null when neither id nor email is available", () => {
      expect(planCalendlyProfileLookup({ profileId: null, inviteeEmail: "  " })).toBeNull();
    });
  });

  describe("buildBookingUpdate", () => {
    it("builds update payload from parsed invitee", () => {
      const parsed = parseCalendlyWebhookPayload(samplePayload("invitee.created"));
      expect(parsed).not.toBeNull();
      const update = buildBookingUpdate(parsed!, "2026-06-09T12:00:00.000Z");
      expect(update).toEqual({
        meetingBookedAt: "2026-06-09T12:00:00.000Z",
        meetingStartAt: "2026-06-15T14:00:00.000000Z",
        calendlyInviteeUri: INVITEE_URI,
      });
    });
  });

  describe("buildBookingClear", () => {
    it("returns invitee uri for cancel handling", () => {
      const parsed = parseCalendlyWebhookPayload(samplePayload("invitee.canceled"));
      expect(parsed).not.toBeNull();
      expect(buildBookingClear(parsed!)).toEqual({ calendlyInviteeUri: INVITEE_URI });
    });
  });

  describe("idempotency key", () => {
    it("uses the same invitee uri across duplicate created events", () => {
      const first = parseCalendlyWebhookPayload(samplePayload("invitee.created"));
      const second = parseCalendlyWebhookPayload(samplePayload("invitee.created"));
      expect(buildBookingUpdate(first!, "2026-06-09T12:00:00.000Z").calendlyInviteeUri).toBe(
        buildBookingUpdate(second!, "2026-06-09T13:00:00.000Z").calendlyInviteeUri,
      );
    });
  });
});
