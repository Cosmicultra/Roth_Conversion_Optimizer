import { NextResponse } from "next/server";
import {
  isValidEmail,
  type ClientProfileRow,
  type CreateClientProfileInput,
} from "@/lib/client-profiles";
import {
  buildProspectListItem,
  filterProspectListItems,
  sortProspectListItems,
  type ProspectListSortField,
} from "@/lib/client-profile-list";
import { emptyRothClient } from "@/lib/roth-client";
import { emptyRothSocialSecurityState } from "@/lib/roth-social-security";
import { emptyRothWorksheet } from "@/lib/roth-worksheet";
import { requireAdvisorUser } from "@/lib/supabase/auth-server";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_SORTS = new Set<ProspectListSortField>([
  "updated_at",
  "created_at",
  "name",
  "email",
  "state",
  "assets",
  "status",
  "age",
]);

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Database is not configured." }, { status: 503 });
  }

  try {
    const body = (await req.json()) as Partial<CreateClientProfileInput>;
    const email = String(body.email ?? "").trim().toLowerCase();
    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const source = String(body.source ?? "meta_optimize").trim() || "meta_optimize";

    if (!firstName || !lastName) {
      return NextResponse.json({ ok: false, error: "First and last name are required." }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: "A valid email address is required." }, { status: 400 });
    }

    const client = {
      ...emptyRothClient(),
      firstName,
      lastName,
    };

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("client_profiles")
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        source,
        status: "started",
        client,
        roth_worksheet: emptyRothWorksheet(),
        social_security: emptyRothSocialSecurityState(),
        manual_traditional_qualified: "",
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, profile: data as ClientProfileRow });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not create profile.";
    console.error("POST /api/prospect-profiles:", err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Database is not configured." }, { status: 503 });
  }

  const user = await requireAdvisorUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") ?? "").trim();
    const status = String(searchParams.get("status") ?? "").trim();
    const state = String(searchParams.get("state") ?? "").trim();
    const meeting = String(searchParams.get("meeting") ?? "").trim();
    const sortRaw = String(searchParams.get("sort") ?? "updated_at").trim() as ProspectListSortField;
    const sort: ProspectListSortField = VALID_SORTS.has(sortRaw) ? sortRaw : "updated_at";
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 200) || 200));

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("client_profiles")
      .select(
        "id, email, first_name, last_name, status, created_at, updated_at, client, manual_traditional_qualified, meeting_booked_at, meeting_start_at, calendly_invitee_uri",
      )
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as ClientProfileRow[];
    let items = rows.map(buildProspectListItem);
    items = filterProspectListItems(items, {
      q,
      status: status || undefined,
      state: state || undefined,
      meeting: meeting === "booked" || meeting === "not_booked" ? meeting : undefined,
    });
    items = sortProspectListItems(items, sort, order);

    return NextResponse.json({ ok: true, prospects: items, total: items.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not list profiles.";
    console.error("GET /api/prospect-profiles:", err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
