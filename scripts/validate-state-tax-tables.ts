import { ALL_STATE_CODES, STATE_TAX_PROFILES } from "../lib/state-income-tax/profiles";

let failed = false;
for (const code of ALL_STATE_CODES) {
  const profile = STATE_TAX_PROFILES[code];
  if (!profile) {
    console.error(`Missing profile: ${code}`);
    failed = true;
    continue;
  }
  if (profile.hasIncomeTax && !profile.flatRate && !(profile.brackets.single?.length || profile.brackets.married?.length)) {
    console.error(`Taxable state ${code} missing brackets`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
console.log(`Validated ${ALL_STATE_CODES.length} state/DC tax profiles.`);
