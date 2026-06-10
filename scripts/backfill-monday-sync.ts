/**
 * One-time helper: sync prospects that never reached Monday (e.g. after fixing API bugs).
 * Usage: npx tsx scripts/backfill-monday-sync.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();

  const { syncProspectToMonday } = await import("../lib/monday/sync-prospect");
  const { isMondayConfigured } = await import("../lib/monday/config");
  const { getSupabaseServerClient } = await import("../lib/supabase/server");

  if (!isMondayConfigured()) {
    console.error("Monday is not configured in .env.local");
    process.exit(1);
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("client_profiles")
    .select("*")
    .in("status", ["wizard_complete", "teaser_viewed"])
    .is("monday_item_id", null)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  console.log(`Found ${data?.length ?? 0} prospects to sync`);

  for (const row of data ?? []) {
    try {
      await syncProspectToMonday(row);
      const { data: updated } = await supabase
        .from("client_profiles")
        .select("email, monday_item_id, status")
        .eq("id", row.id)
        .single();
      console.log(`OK ${updated?.email} -> monday_item_id=${updated?.monday_item_id}`);
    } catch (err) {
      console.error(`FAIL ${row.email}:`, err instanceof Error ? err.message : err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
