"use client";

import { Input } from "@/components/ui/input";
import { FormField } from "@/components/roth/form/form-field";
import { FormSection } from "@/components/roth/form/form-section";
import { FormSubsection } from "@/components/roth/form/form-subsection";
import { YesNoSegment } from "@/components/roth/form/yes-no-segment";
import type { RothClient } from "@/lib/roth-client";

type Props = {
  client: RothClient;
  onClientChange: (patch: Partial<RothClient>) => void;
};

export function ClientProfileStep({ client, onClientChange }: Props) {
  return (
    <FormSection
      id="intake-step-01"
      step="01 / Filing & client"
      title="Client & spouse profile"
      variant="elevated"
    >
      <YesNoSegment
        label="Married filing jointly?"
        value={client.married}
        onChange={(married) => onClientChange({ married })}
      />
      <FormSubsection title="Client" className="mt-0 border-t-0 pt-0">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="client-first-name" label="First name">
            <Input
              id="client-first-name"
              className="h-12 rounded-none"
              value={client.firstName}
              onChange={(e) => onClientChange({ firstName: e.target.value })}
            />
          </FormField>
          <FormField id="client-last-name" label="Last name">
            <Input
              id="client-last-name"
              className="h-12 rounded-none"
              value={client.lastName}
              onChange={(e) => onClientChange({ lastName: e.target.value })}
            />
          </FormField>
        </div>
        <FormField id="client-age" label="Current age">
          <Input
            id="client-age"
            className="h-12 w-full rounded-none sm:max-w-[12rem]"
            type="number"
            value={client.age}
            onChange={(e) => onClientChange({ age: e.target.value })}
            placeholder="62"
          />
        </FormField>
      </FormSubsection>
      {client.married ? (
        <FormSubsection title="Spouse">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="spouse-first-name" label="First name">
              <Input
                id="spouse-first-name"
                className="h-12 rounded-none"
                value={client.spouseFirstName}
                onChange={(e) => onClientChange({ spouseFirstName: e.target.value })}
              />
            </FormField>
            <FormField id="spouse-last-name" label="Last name">
              <Input
                id="spouse-last-name"
                className="h-12 rounded-none"
                value={client.spouseLastName}
                onChange={(e) => onClientChange({ spouseLastName: e.target.value })}
              />
            </FormField>
          </div>
          <FormField id="spouse-age" label="Current age">
            <Input
              id="spouse-age"
              className="h-12 w-full rounded-none sm:max-w-[12rem]"
              type="number"
              value={client.spouseAge}
              onChange={(e) => onClientChange({ spouseAge: e.target.value })}
              placeholder="62"
            />
          </FormField>
        </FormSubsection>
      ) : null}
    </FormSection>
  );
}
