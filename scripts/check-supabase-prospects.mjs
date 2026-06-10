import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    env[line.slice(0, i)] = line.slice(i + 1);
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await supabase
  .from("client_profiles")
  .select("id, email, status, monday_item_id, meeting_booked_at, meeting_start_at")
  .order("updated_at", { ascending: false })
  .limit(3);

console.log("=== Supabase schema / recent prospects ===");
if (error) {
  console.log("ERROR:", error.message);
  if (error.message.includes("meeting_booked_at")) {
    console.log("-> Run supabase/migrations/003_meeting_booking.sql");
  }
  if (error.message.includes("monday_item_id")) {
    console.log("-> Run supabase/migrations/002_monday_item_id.sql");
  }
} else {
  console.log(JSON.stringify(data, null, 2));
}
