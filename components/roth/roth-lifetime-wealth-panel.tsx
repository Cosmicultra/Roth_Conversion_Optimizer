"use client";

import type { RothComparisonVisualData } from "@/lib/roth-comparison-visuals";
import { RothImpactDriversChart } from "@/components/roth/roth-impact-drivers-chart";
import { RothWealthComparisonHero } from "@/components/roth/roth-wealth-comparison-hero";
import { cn } from "@/lib/utils";

type RothLifetimeWealthPanelProps = {
  data: RothComparisonVisualData;
  clientName?: string;
  className?: string;
};

function PanelCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-none border border-[#1e1e2e] bg-[#14141d] p-4 md:p-5", className)}>{children}</div>
  );
}

export function RothLifetimeWealthPanel({ data, clientName, className }: RothLifetimeWealthPanelProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <RothWealthComparisonHero data={data} clientName={clientName} />
      <PanelCard>
        <RothImpactDriversChart data={data} />
      </PanelCard>
    </section>
  );
}
