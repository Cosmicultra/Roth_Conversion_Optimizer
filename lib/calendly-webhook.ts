import { createHmac, timingSafeEqual } from "node:crypto";
import { isValidUuid } from "@/lib/client-profiles";

export type CalendlyWebhookEvent = "invitee.created" | "invitee.canceled" | "invitee.rescheduled";

export type ParsedCalendlyInvitee = {
  event: CalendlyWebhookEvent;
  inviteeEmail: string;
  inviteeUri: string;
  profileId: string | null;
  meetingStartAt: string | null;
};

export type CalendlyBookingUpdate = {
  meetingBookedAt: string;
  meetingStartAt: string | null;
  calendlyInviteeUri: string;
};

export type CalendlyBookingClear = {
  calendlyInviteeUri: string;
};

export function verifyCalendlyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  signingKey: string,
): boolean {
  if (!signatureHeader?.trim() || !signingKey.trim()) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key?.trim(), value?.trim()];
    }),
  ) as { t?: string; v1?: string };

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const expected = createHmac("sha256", signingKey.trim())
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(sigBuf, expectedBuf);
  } catch {
    return false;
  }
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readNullableString(value: unknown): string | null {
  const s = readString(value);
  return s || null;
}

export function parseCalendlyWebhookPayload(body: unknown): ParsedCalendlyInvitee | null {
  if (!body || typeof body !== "object") return null;

  const root = body as Record<string, unknown>;
  const event = readString(root.event) as CalendlyWebhookEvent;
  if (event !== "invitee.created" && event !== "invitee.canceled" && event !== "invitee.rescheduled") {
    return null;
  }

  const payload = root.payload;
  if (!payload || typeof payload !== "object") return null;

  const invitee = payload as Record<string, unknown>;
  const inviteeEmail = readString(invitee.email).toLowerCase();
  const inviteeUri = readString(invitee.uri);
  if (!inviteeEmail || !inviteeUri) return null;

  const tracking = invitee.tracking;
  const trackingObj = tracking && typeof tracking === "object" ? (tracking as Record<string, unknown>) : {};
  const profileIdRaw = readNullableString(trackingObj.utm_content);
  const profileId = profileIdRaw && isValidUuid(profileIdRaw) ? profileIdRaw : null;

  const scheduledEvent = invitee.scheduled_event;
  const scheduledObj =
    scheduledEvent && typeof scheduledEvent === "object" ? (scheduledEvent as Record<string, unknown>) : {};
  const meetingStartAt = readNullableString(scheduledObj.start_time);

  return {
    event,
    inviteeEmail,
    inviteeUri,
    profileId,
    meetingStartAt,
  };
}

export function buildBookingUpdate(parsed: ParsedCalendlyInvitee, bookedAt: string): CalendlyBookingUpdate {
  return {
    meetingBookedAt: bookedAt,
    meetingStartAt: parsed.meetingStartAt,
    calendlyInviteeUri: parsed.inviteeUri,
  };
}

export function buildBookingClear(parsed: ParsedCalendlyInvitee): CalendlyBookingClear {
  return {
    calendlyInviteeUri: parsed.inviteeUri,
  };
}

export type ProfileLookupInput = {
  profileId: string | null;
  inviteeEmail: string;
};

export type CalendlyProfileLookupPlan =
  | { kind: "by_id"; profileId: string }
  | { kind: "by_email_newest"; email: string };

export function resolveProfileLookup(input: ProfileLookupInput): { byId: string | null; byEmail: string } {
  return {
    byId: input.profileId,
    byEmail: input.inviteeEmail.toLowerCase(),
  };
}

/** Resolves which profile lookup strategy to use for a Calendly booking webhook. */
export function planCalendlyProfileLookup(input: ProfileLookupInput): CalendlyProfileLookupPlan | null {
  if (input.profileId) {
    return { kind: "by_id", profileId: input.profileId };
  }
  const email = input.inviteeEmail.trim().toLowerCase();
  if (email) {
    return { kind: "by_email_newest", email };
  }
  return null;
}
