import { NextResponse } from "next/server";
import {
  isValidUuid,
  type ClientProfileRow,
  type UpdateClientProfileInput,
} from "@/lib/client-profiles";
import { normalizeRothWorksheet } from "@/lib/roth-worksheet";
import { isMondayConfigured } from "@/lib/monday/config";
import { syncProspectToMonday } from "@/lib/monday/sync-prospect";
import { requireAdvisorUser } from "@/lib/supabase/auth-server";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Database is not configured." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ ok: false, error: "Invalid profile id." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("client_profiles").select("*").eq("id", id).single();
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.code === "PGRST116" ? 404 : 500 });
    }

    return NextResponse.json({ ok: true, profile: data as ClientProfileRow });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not load profile.";
    console.error("GET /api/prospect-profiles/[id]:", err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Database is not configured." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ ok: false, error: "Invalid profile id." }, { status: 400 });
    }

    const body = (await req.json()) as UpdateClientProfileInput;
    const patch: Record<string, unknown> = {};

    if (body.status) patch.status = body.status;
    if (body.client) patch.client = body.client;
    if (body.rothWorksheet) patch.roth_worksheet = normalizeRothWorksheet(body.rothWorksheet);
    if (body.socialSecurity) patch.social_security = body.socialSecurity;
    if (body.manualTraditionalQualified !== undefined) {
      patch.manual_traditional_qualified = body.manualTraditionalQualified;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: "No fields to update." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("client_profiles")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const profile = data as ClientProfileRow;

    if (isMondayConfigured()) {
      try {
        await syncProspectToMonday(profile);
      } catch (err) {
        console.error("Monday sync failed:", err);
      }
    }

    return NextResponse.json({ ok: true, profile });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not update profile.";
    console.error("PATCH /api/prospect-profiles/[id]:", err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Database is not configured." }, { status: 503 });
  }

  const user = await requireAdvisorUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ ok: false, error: "Invalid profile id." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("client_profiles").delete().eq("id", id).select("id").maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: "Profile not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not delete profile.";
    console.error("DELETE /api/prospect-profiles/[id]:", err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
