"use client";

import { useMemo } from "react";
import type { RothConversionModelResult } from "@/lib/roth-conversion-analysis";
import { buildRothComparisonVisualData } from "@/lib/roth-comparison-visuals";
import { RothWealthAllocationChart } from "@/components/roth/roth-wealth-allocation-chart";
import { ProspectCalendlyCta } from "@/components/prospect/prospect-calendly-cta";

type Props = {
  model: RothConversionModelResult;
  firstName?: string;
  lastName?: string;
  email?: string;
  profileId?: string;
  useEntireQualifiedBalance?: boolean | null;
};

export function ProspectTeaserResults({
  model,
  firstName,
  lastName,
  email,
  profileId,
  useEntireQualifiedBalance,
}: Props) {
  const data = useMemo(
    () => buildRothComparisonVisualData(model, { useEntireQualifiedBalance }),
    [model, useEntireQualifiedBalance],
  );

  return (
    <div className="relative mx-auto w-full max-w-4xl space-y-8 pb-24 md:pb-0">
      <div className="space-y-4 text-center">
        <p className="ap-eyebrow">Your preview</p>
        <h2 className="font-serif text-2xl font-bold text-[#e2e8f0] md:text-3xl">
          Here&apos;s a glimpse of how your dollars could be allocated
        </h2>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-[#94a3b8]">
          This is an illustrative comparison only — not tax, Medicare, or investment advice. Book a consultation to
          review the full analysis with a specialist.
        </p>
        <ProspectCalendlyCta
          firstName={firstName}
          lastName={lastName}
          email={email}
          profileId={profileId}
          className="flex justify-center"
        />
      </div>

      <div className="rounded-none border border-[#1e1e2e] bg-[#101017] p-5 md:p-6 border-t-[3px] border-t-[var(--ap-cyan)]">
        <RothWealthAllocationChart data={data} />
      </div>

      <div className="hidden justify-center pb-4 md:flex">
        <ProspectCalendlyCta firstName={firstName} lastName={lastName} email={email} profileId={profileId} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#1e1e2e] ap-glass px-4 py-3 pb-safe md:hidden">
        <ProspectCalendlyCta
          firstName={firstName}
          lastName={lastName}
          email={email}
          profileId={profileId}
          shortLabel
          compact
        />
      </div>
    </div>
  );
}
