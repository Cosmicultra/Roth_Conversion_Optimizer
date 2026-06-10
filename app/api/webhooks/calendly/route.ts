import { NextResponse } from "next/server";
import {
  buildBookingClear,
  buildBookingUpdate,
  parseCalendlyWebhookPayload,
  verifyCalendlyWebhookSignature,
} from "@/lib/calendly-webhook";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function findProfileId(profileId: string | null, email: string): Promise<string | null> {
  const supabase = getSupabaseServerClient();

  if (profileId) {
    const { data } = await supabase.from("client_profiles").select("id").eq("id", profileId).maybeSingle();
    if (data?.id) return data.id as string;
  }

  const { data } = await supabase.from("client_profiles").select("id").eq("email", email).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

async function handleInviteeCreated(parsed: ReturnType<typeof parseCalendlyWebhookPayload>): Promise<void> {
  if (!parsed) return;

  const supabase = getSupabaseServerClient();
  const existingByUri = await supabase
    .from("client_profiles")
    .select("id")
    .eq("calendly_invitee_uri", parsed.inviteeUri)
    .maybeSingle();

  if (existingByUri.data?.id) return;

  const profileId = await findProfileId(parsed.profileId, parsed.inviteeEmail);
  if (!profileId) {
    console.warn(
      `[calendly webhook] No matching profile for invitee ${parsed.inviteeEmail} (utm_content=${parsed.profileId ?? "none"})`,
    );
    return;
  }

  const update = buildBookingUpdate(parsed, new Date().toISOString());
  const { error } = await supabase
    .from("client_profiles")
    .update({
      meeting_booked_at: update.meetingBookedAt,
      meeting_start_at: update.meetingStartAt,
      calendly_invitee_uri: update.calendlyInviteeUri,
    })
    .eq("id", profileId);

  if (error) {
    console.error("[calendly webhook] Failed to update booking:", error.message);
  }
}

async function handleInviteeCanceled(parsed: ReturnType<typeof parseCalendlyWebhookPayload>): Promise<void> {
  if (!parsed) return;

  const supabase = getSupabaseServerClient();
  const clear = buildBookingClear(parsed);
  const { error } = await supabase
    .from("client_profiles")
    .update({
      meeting_booked_at: null,
      meeting_start_at: null,
      calendly_invitee_uri: null,
    })
    .eq("calendly_invitee_uri", clear.calendlyInviteeUri);

  if (error) {
    console.error("[calendly webhook] Failed to clear booking:", error.message);
  }
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Database is not configured." }, { status: 503 });
  }

  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY?.trim();
  if (!signingKey) {
    return NextResponse.json({ ok: false, error: "Webhook signing key is not configured." }, { status: 503 });
  }

  const rawBody = await req.text();
  const signatureHeader = req.headers.get("calendly-webhook-signature");

  if (!verifyCalendlyWebhookSignature(rawBody, signatureHeader, signingKey)) {
    return NextResponse.json({ ok: false, error: "Invalid signature." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = parseCalendlyWebhookPayload(body);
  if (!parsed) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    if (parsed.event === "invitee.created" || parsed.event === "invitee.rescheduled") {
      await handleInviteeCreated(parsed);
    } else if (parsed.event === "invitee.canceled") {
      await handleInviteeCanceled(parsed);
    }
  } catch (err: unknown) {
    console.error("[calendly webhook] Handler error:", err);
    return NextResponse.json({ ok: false, error: "Webhook processing failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
