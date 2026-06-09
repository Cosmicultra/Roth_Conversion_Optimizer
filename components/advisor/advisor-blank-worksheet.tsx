"use client";

import { RothConversionWorksheet } from "@/components/roth/roth-conversion-worksheet";
import { emptyRothSession } from "@/lib/roth-session-storage";

const blankSession = emptyRothSession();

export function AdvisorBlankWorksheet() {
  return (
    <RothConversionWorksheet
      initialSession={blankSession}
      advisorPortalMode
      clientLabel="New worksheet"
    />
  );
}
