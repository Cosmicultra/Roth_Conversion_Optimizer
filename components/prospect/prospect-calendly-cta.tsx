"use client";

import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  firstName?: string;
  lastName?: string;
  email?: string;
  profileId?: string;
  className?: string;
  shortLabel?: boolean;
  compact?: boolean;
};

function buildCalendlyUrl(
  base: string,
  firstName?: string,
  lastName?: string,
  email?: string,
  profileId?: string,
): string {
  try {
    const url = new URL(base);
    const name = [firstName, lastName].filter(Boolean).join(" ").trim();
    if (name) url.searchParams.set("name", name);
    if (email?.trim()) url.searchParams.set("email", email.trim());
    if (profileId?.trim()) url.searchParams.set("utm_content", profileId.trim());
    return url.toString();
  } catch {
    return base;
  }
}

export function ProspectCalendlyCta({
  firstName,
  lastName,
  email,
  profileId,
  className,
  shortLabel,
  compact,
}: Props) {
  const baseUrl = process.env.NEXT_PUBLIC_CALENDLY_URL?.trim() || "https://calendly.com";
  const href = buildCalendlyUrl(baseUrl, firstName, lastName, email, profileId);
  const label = shortLabel
    ? "Book consultation"
    : "Book Your Free Roth Optimization Consultation";

  return (
    <div className={className}>
      <Button
        asChild
        className={
          compact
            ? "h-12 w-full touch-manipulation rounded-none ap-cta-solid text-sm font-semibold"
            : "h-14 w-full rounded-none ap-cta-solid text-base font-semibold sm:w-auto sm:min-w-[20rem]"
        }
      >
        <a href={href} target="_blank" rel="noopener noreferrer">
          <CalendarDays className={compact ? "mr-2 h-4 w-4" : "mr-2 h-5 w-5"} aria-hidden />
          {label}
        </a>
      </Button>
    </div>
  );
}
