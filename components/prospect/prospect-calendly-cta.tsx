"use client";

import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  firstName?: string;
  lastName?: string;
  email?: string;
  className?: string;
};

function buildCalendlyUrl(base: string, firstName?: string, lastName?: string, email?: string): string {
  try {
    const url = new URL(base);
    const name = [firstName, lastName].filter(Boolean).join(" ").trim();
    if (name) url.searchParams.set("name", name);
    if (email?.trim()) url.searchParams.set("email", email.trim());
    return url.toString();
  } catch {
    return base;
  }
}

export function ProspectCalendlyCta({ firstName, lastName, email, className }: Props) {
  const baseUrl = process.env.NEXT_PUBLIC_CALENDLY_URL?.trim() || "https://calendly.com";
  const href = buildCalendlyUrl(baseUrl, firstName, lastName, email);

  return (
    <div className={className}>
      <Button
        asChild
        className="h-14 w-full rounded-none ap-cta-solid text-base font-semibold sm:w-auto sm:min-w-[20rem]"
      >
        <a href={href} target="_blank" rel="noopener noreferrer">
          <CalendarDays className="mr-2 h-5 w-5" aria-hidden />
          Book Your Free Roth Optimization Consultation
        </a>
      </Button>
    </div>
  );
}
