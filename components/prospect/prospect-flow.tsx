"use client";

import { useCallback, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProspectLeadCapture } from "@/components/prospect/prospect-lead-capture";
import { ProspectTeaserResults } from "@/components/prospect/prospect-teaser-results";
import { ProspectCalendlyCta } from "@/components/prospect/prospect-calendly-cta";
import { ClientProfileStep } from "@/components/roth/intake/client-profile-step";
import { TaxProfileStep } from "@/components/roth/intake/tax-profile-step";
import { IncomeStep } from "@/components/roth/intake/income-step";
import { BalancesStep } from "@/components/roth/intake/balances-step";
import { ConversionStep } from "@/components/roth/intake/conversion-step";
import { SocialSecuritySection } from "@/components/roth/social-security-section";
import { assessProspectAgeEligibility } from "@/lib/prospect-age-eligibility";
import { assessRothConversionFeasibility } from "@/lib/roth-conversion-feasibility";
import { buildRothConversionModelForAdvisorUi } from "@/lib/roth-conversion-ui-model";
import { emptyRothClient, type RothClient } from "@/lib/roth-client";
import { applyProspectFicDefaults } from "@/lib/prospect-default-fic-template";
import { createProspectProfile, useProspectProfileSave } from "@/lib/prospect-profile-api";
import { validateLeadCapture, validateProspectStep, type ProspectWizardStep } from "@/lib/prospect-wizard-validation";
import { parseClientAgeForIllustration } from "@/lib/roth-inputs";
import { emptyRothSocialSecurityState, type RothSocialSecurityState } from "@/lib/roth-social-security";
import {
  emptyRothWorksheet,
  normalizeRothWorksheet,
  patchRothWorksheet,
  patchRothWorksheetFic,
  rothFullQualifiedPoolBalance,
  rothIllustrationQualifiedBalance,
  type RothWorksheet,
} from "@/lib/roth-worksheet";

type PreviewOutcome =
  | { kind: "consultation"; message: string }
  | { kind: "ineligible"; message: string };

type FlowStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Prospect wizard validates age 18+; use that floor for bracket feasibility (preview still requires 60+). */
const PROSPECT_FEASIBILITY_MIN_AGE = 18;

function parseManualQualifiedBalance(raw: string): number {
  const n = Number(String(raw || "").replace(/[$,]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function ProspectFlow() {
  const [flowStep, setFlowStep] = useState<FlowStep>(0);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [leadFirstName, setLeadFirstName] = useState("");
  const [leadLastName, setLeadLastName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadBusy, setLeadBusy] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [taxBracketError, setTaxBracketError] = useState<string | null>(null);

  const [client, setClient] = useState<RothClient>(emptyRothClient);
  const [rothWorksheet, setRothWorksheet] = useState<RothWorksheet>(emptyRothWorksheet);
  const [socialSecurity, setSocialSecurity] = useState<RothSocialSecurityState>(emptyRothSocialSecurityState);
  const [manualTraditionalQualified, setManualTraditionalQualified] = useState("");

  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [previewOutcome, setPreviewOutcome] = useState<PreviewOutcome | null>(null);
  const [teaserModel, setTeaserModel] = useState<ReturnType<typeof buildRothConversionModelForAdvisorUi> | null>(null);

  const { saving, saveError, persist } = useProspectProfileSave();

  const rothWorksheetSafe = useMemo(() => normalizeRothWorksheet(rothWorksheet), [rothWorksheet]);
  const prospectWorksheet = useMemo(
    () => applyProspectFicDefaults(rothWorksheetSafe, client.federalTaxBracket),
    [rothWorksheetSafe, client.federalTaxBracket],
  );
  const traditionalQualifiedTotal = useMemo(
    () => parseManualQualifiedBalance(manualTraditionalQualified),
    [manualTraditionalQualified],
  );
  const rothPdfQualifiedTotal = useMemo(
    () => rothIllustrationQualifiedBalance(prospectWorksheet, 0, traditionalQualifiedTotal),
    [prospectWorksheet, traditionalQualifiedTotal],
  );
  const rothFullQualifiedPool = useMemo(
    () => rothFullQualifiedPoolBalance(prospectWorksheet, 0, traditionalQualifiedTotal),
    [prospectWorksheet, traditionalQualifiedTotal],
  );

  const patchClient = useCallback((patch: Partial<RothClient>) => {
    setClient((prev) => ({ ...prev, ...patch }));
  }, []);

  const commitRothWorksheet = useCallback((updater: (ws: RothWorksheet) => RothWorksheet) => {
    setRothWorksheet((prev) => normalizeRothWorksheet(updater(prev)));
  }, []);

  const clearTaxBracketError = useCallback(() => {
    setTaxBracketError(null);
  }, []);

  const patchClientWithBracketSync = useCallback(
    (patch: Partial<RothClient>) => {
      patchClient(patch);
      if (patch.federalTaxBracket !== undefined) {
        commitRothWorksheet((w) => patchRothWorksheetFic(w, { maxTaxRatePct: patch.federalTaxBracket! }));
        clearTaxBracketError();
      }
    },
    [patchClient, commitRothWorksheet, clearTaxBracketError],
  );

  const patchSocialSecurity = useCallback((patch: Partial<RothSocialSecurityState>) => {
    setSocialSecurity((prev) => ({ ...prev, ...patch }));
  }, []);

  async function persistCurrent(status?: "started" | "wizard_complete" | "teaser_viewed") {
    if (!profileId) return true;
    return persist(profileId, {
      status,
      client,
      rothWorksheet: rothWorksheetSafe,
      socialSecurity,
      manualTraditionalQualified,
    });
  }

  async function submitLead() {
    const err = validateLeadCapture(leadFirstName, leadLastName, leadEmail);
    if (err) {
      setLeadError(err);
      return;
    }
    setLeadBusy(true);
    setLeadError(null);
    const result = await createProspectProfile({
      firstName: leadFirstName.trim(),
      lastName: leadLastName.trim(),
      email: leadEmail.trim(),
    });
    setLeadBusy(false);
    if (!result.ok) {
      setLeadError(result.error);
      return;
    }
    setProfileId(result.profile.id);
    setClient({
      ...emptyRothClient(),
      ...result.profile.client,
      firstName: result.profile.client.firstName || leadFirstName.trim(),
      lastName: result.profile.client.lastName || leadLastName.trim(),
    });
    setRothWorksheet(normalizeRothWorksheet(result.profile.roth_worksheet));
    setSocialSecurity({ ...emptyRothSocialSecurityState(), ...result.profile.social_security });
    setManualTraditionalQualified(result.profile.manual_traditional_qualified ?? "");
    setFlowStep(1);
  }

  async function runTeaserAnalysis() {
    setAnalysisBusy(true);
    setAnalysisError(null);
    setPreviewOutcome(null);
    setTeaserModel(null);
    try {
      const feasibility = assessRothConversionFeasibility(
        client,
        prospectWorksheet,
        rothPdfQualifiedTotal,
        rothFullQualifiedPool,
        { minClientAge: PROSPECT_FEASIBILITY_MIN_AGE, socialSecurity },
      );
      if (!feasibility.ok) {
        if (feasibility.code === "bracket_exhausted" || feasibility.code === "holdout_exceeds_balance") {
          setTaxBracketError(feasibility.message);
          setFlowStep(2);
          return;
        }
      }

      const ageEligibility = assessProspectAgeEligibility(parseClientAgeForIllustration(client));
      if (ageEligibility.tier === "ineligible") {
        setPreviewOutcome({ kind: "ineligible", message: ageEligibility.message });
        await persist(profileId!, {
          status: "wizard_complete",
          client,
          rothWorksheet: rothWorksheetSafe,
          socialSecurity,
          manualTraditionalQualified,
        });
        return;
      }
      if (ageEligibility.tier === "consultation") {
        setPreviewOutcome({ kind: "consultation", message: ageEligibility.message });
        await persist(profileId!, {
          status: "wizard_complete",
          client,
          rothWorksheet: rothWorksheetSafe,
          socialSecurity,
          manualTraditionalQualified,
        });
        return;
      }

      const pre = await fetch("/api/roth-analysis", { method: "POST" });
      const j = (await pre.json().catch(() => ({}))) as { ok?: boolean; proceed?: boolean; error?: string };
      if (!pre.ok || !j.ok || j.proceed === false) {
        setAnalysisError(j.error || "Analysis could not complete. Try adjusting your inputs.");
        return;
      }

      if (!feasibility.ok) {
        setAnalysisError(feasibility.message);
        return;
      }
      setTeaserModel({ ok: true, model: feasibility.model });
      await persist(profileId!, {
        status: "teaser_viewed",
        client,
        rothWorksheet: rothWorksheetSafe,
        socialSecurity,
        manualTraditionalQualified,
      });
    } catch {
      setAnalysisError("Something went wrong running your preview.");
    } finally {
      setAnalysisBusy(false);
    }
  }

  async function goNext() {
    setStepError(null);
    if (flowStep === 0) {
      await submitLead();
      return;
    }
    if (flowStep >= 1 && flowStep <= 6) {
      let wsForValidation = rothWorksheetSafe;
      if (flowStep === 6 && wsForValidation.useEntireQualifiedBalance === true && traditionalQualifiedTotal > 0) {
        wsForValidation = patchRothWorksheet(wsForValidation, {
          qualifiedAssetValue: Math.round(traditionalQualifiedTotal).toLocaleString("en-US"),
        });
        commitRothWorksheet(() => wsForValidation);
      }
      const err = validateProspectStep(
        flowStep as ProspectWizardStep,
        client,
        wsForValidation,
        socialSecurity,
        manualTraditionalQualified,
      );
      if (err) {
        setStepError(err);
        return;
      }
      const ok = await persistCurrent(flowStep === 6 ? "wizard_complete" : undefined);
      if (!ok) {
        setStepError(saveError || "Could not save progress.");
        return;
      }
      if (flowStep === 6) {
        const wsForFeasibility =
          wsForValidation.useEntireQualifiedBalance === true && traditionalQualifiedTotal > 0
            ? applyProspectFicDefaults(
                patchRothWorksheet(wsForValidation, {
                  qualifiedAssetValue: Math.round(traditionalQualifiedTotal).toLocaleString("en-US"),
                }),
                client.federalTaxBracket,
              )
            : applyProspectFicDefaults(wsForValidation, client.federalTaxBracket);
        const premium = rothIllustrationQualifiedBalance(wsForFeasibility, 0, traditionalQualifiedTotal);
        const fullPool = rothFullQualifiedPoolBalance(wsForFeasibility, 0, traditionalQualifiedTotal);
        const feasibility = assessRothConversionFeasibility(
          client,
          wsForFeasibility,
          premium,
          fullPool,
          { minClientAge: PROSPECT_FEASIBILITY_MIN_AGE, socialSecurity },
        );
        if (!feasibility.ok && (feasibility.code === "bracket_exhausted" || feasibility.code === "holdout_exceeds_balance")) {
          setTaxBracketError(feasibility.message);
          setFlowStep(2);
          return;
        }

        const ageEligibility = assessProspectAgeEligibility(parseClientAgeForIllustration(client));
        if (ageEligibility.tier === "ineligible") {
          setPreviewOutcome({ kind: "ineligible", message: ageEligibility.message });
          setFlowStep(7);
          void persistCurrent("wizard_complete");
          return;
        }
        if (ageEligibility.tier === "consultation") {
          setPreviewOutcome({ kind: "consultation", message: ageEligibility.message });
          setFlowStep(7);
          void persistCurrent("wizard_complete");
          return;
        }

        setPreviewOutcome(null);
        setFlowStep(7);
        void runTeaserAnalysis();
        return;
      }
      setFlowStep((flowStep + 1) as FlowStep);
    }
  }

  function goBack() {
    setStepError(null);
    if (flowStep > 1 && flowStep < 7) {
      setFlowStep((flowStep - 1) as FlowStep);
    }
  }

  const wizardProgress = flowStep >= 1 && flowStep <= 6 ? `Step ${flowStep} of 6` : null;

  return (
    <div className="ap-app-bg min-h-screen py-6 md:py-10">
      <div className="mx-auto w-full max-w-4xl px-4 md:px-8">
        <Card className="rounded-none ap-glass border-0">
          <CardContent className="space-y-8 p-6 md:p-8">
            {flowStep === 0 ? (
              <ProspectLeadCapture
                firstName={leadFirstName}
                lastName={leadLastName}
                email={leadEmail}
                error={leadError}
                busy={leadBusy}
                onFirstNameChange={setLeadFirstName}
                onLastNameChange={setLeadLastName}
                onEmailChange={setLeadEmail}
                onSubmit={() => void goNext()}
              />
            ) : null}

            {flowStep >= 1 && flowStep <= 6 ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="ap-eyebrow">Roth optimization preview</p>
                    <p className="mt-1 text-sm font-medium text-[#fbbf24]">{wizardProgress}</p>
                  </div>
                  <ProspectCalendlyCta
                    firstName={leadFirstName}
                    lastName={leadLastName}
                    email={leadEmail}
                    className="hidden sm:flex"
                  />
                </div>

                {flowStep === 1 ? <ClientProfileStep client={client} onClientChange={patchClient} /> : null}
                {flowStep === 2 ? (
                  <TaxProfileStep
                    client={client}
                    worksheet={rothWorksheetSafe}
                    onClientChange={patchClientWithBracketSync}
                    onWorksheetChange={commitRothWorksheet}
                    bracketError={taxBracketError}
                    onBracketErrorClear={clearTaxBracketError}
                  />
                ) : null}
                {flowStep === 3 ? (
                  <SocialSecuritySection
                    client={client}
                    socialSecurity={socialSecurity}
                    onClientChange={patchClient}
                    onSocialSecurityChange={patchSocialSecurity}
                  />
                ) : null}
                {flowStep === 4 ? (
                  <IncomeStep
                    client={client}
                    worksheet={rothWorksheetSafe}
                    mode="prospect"
                    onClientChange={patchClient}
                    onWorksheetChange={commitRothWorksheet}
                  />
                ) : null}
                {flowStep === 5 ? (
                  <BalancesStep
                    manualTraditionalQualified={manualTraditionalQualified}
                    onManualTraditionalQualifiedChange={setManualTraditionalQualified}
                  />
                ) : null}
                {flowStep === 6 ? (
                  <ConversionStep
                    client={client}
                    worksheet={rothWorksheetSafe}
                    manualTraditionalQualified={manualTraditionalQualified}
                    traditionalQualifiedTotal={traditionalQualifiedTotal}
                    rothPdfQualifiedTotal={rothPdfQualifiedTotal}
                    mode="prospect"
                    onWorksheetChange={commitRothWorksheet}
                  />
                ) : null}

                {stepError || saveError ? (
                  <p className="text-sm text-[#fca5a5]" role="alert">
                    {stepError || saveError}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1e1e2e] pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 rounded-none border-[#2a2a38]"
                    disabled={flowStep <= 1 || saving}
                    onClick={goBack}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="h-12 min-w-[8rem] rounded-none ap-cta-solid"
                    disabled={saving}
                    onClick={() => void goNext()}
                  >
                    {saving ? "Saving…" : flowStep === 6 ? "See my preview" : "Next"}
                  </Button>
                </div>
              </div>
            ) : null}

            {flowStep === 7 ? (
              <div className="space-y-6">
                {analysisBusy ? (
                  <p className="text-center text-sm text-[#fbbf24]" role="status">
                    Building your preview…
                  </p>
                ) : null}
                {previewOutcome?.kind === "ineligible" ? (
                  <div className="mx-auto max-w-lg space-y-6 text-center">
                    <p className="text-sm leading-relaxed text-[#fca5a5]" role="alert">
                      {previewOutcome.message}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 rounded-none border-[#2a2a38]"
                      onClick={() => {
                        setPreviewOutcome(null);
                        setFlowStep(1);
                      }}
                    >
                      Review your profile
                    </Button>
                  </div>
                ) : null}
                {previewOutcome?.kind === "consultation" ? (
                  <div className="mx-auto max-w-lg space-y-6 text-center">
                    <p className="text-sm leading-relaxed text-[#94a3b8]">{previewOutcome.message}</p>
                    <ProspectCalendlyCta
                      firstName={leadFirstName}
                      lastName={leadLastName}
                      email={leadEmail}
                      className="flex justify-center"
                    />
                  </div>
                ) : null}
                {!previewOutcome && analysisError ? (
                  <div className="mx-auto max-w-lg space-y-6 text-center">
                    <p className="text-sm leading-relaxed text-[#94a3b8]">{analysisError}</p>
                    <ProspectCalendlyCta
                      firstName={leadFirstName}
                      lastName={leadLastName}
                      email={leadEmail}
                      className="flex justify-center"
                    />
                  </div>
                ) : null}
                {!previewOutcome && teaserModel?.ok ? (
                  <ProspectTeaserResults
                    model={teaserModel.model}
                    firstName={leadFirstName}
                    lastName={leadLastName}
                    email={leadEmail}
                  />
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
