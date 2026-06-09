"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/roth/form/form-field";

type Props = {
  firstName: string;
  lastName: string;
  email: string;
  error: string | null;
  busy: boolean;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onSubmit: () => void;
};

export function ProspectLeadCapture({
  firstName,
  lastName,
  email,
  error,
  busy,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onSubmit,
}: Props) {
  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <div className="space-y-2 text-center">
        <p className="ap-eyebrow">Free Roth optimization preview</p>
        <h1 className="ap-hero-title text-3xl md:text-4xl">See what a Roth conversion could mean for you</h1>
        <p className="text-sm leading-relaxed text-[#94a3b8]">
          Enter your name and email to start a personalized, step-by-step preview. Illustrative only — not tax advice.
        </p>
      </div>
      <div className="space-y-4 rounded-none border border-[#1e1e2e] bg-[#101017] p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="lead-first-name" label="First name">
            <Input
              id="lead-first-name"
              className="h-12 rounded-none"
              value={firstName}
              onChange={(e) => onFirstNameChange(e.target.value)}
              autoComplete="given-name"
            />
          </FormField>
          <FormField id="lead-last-name" label="Last name">
            <Input
              id="lead-last-name"
              className="h-12 rounded-none"
              value={lastName}
              onChange={(e) => onLastNameChange(e.target.value)}
              autoComplete="family-name"
            />
          </FormField>
        </div>
        <FormField id="lead-email" label="Email address">
          <Input
            id="lead-email"
            className="h-12 rounded-none"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />
        </FormField>
        {error ? (
          <p className="text-sm text-[#fca5a5]" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="button"
          className="h-12 w-full rounded-none ap-cta-solid"
          disabled={busy}
          onClick={onSubmit}
        >
          {busy ? "Saving…" : "Next"}
        </Button>
      </div>
    </div>
  );
}
