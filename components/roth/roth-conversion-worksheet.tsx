"use client";

import { useCallback, useEffect, useMemo, useState, type SetStateAction } from "react";
import Link from "next/link";
import { ArrowLeft, BookmarkPlus, CloudUpload, Download } from "lucide-react";
import { RothWorksheetIcon } from "@/components/roth/roth-worksheet-icon";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencyAmountInput } from "@/components/currency-amount-input";
import { RothComparisonVisuals } from "@/components/roth/roth-comparison-visuals";
import { AnalysisYearCards } from "@/components/roth/analysis-year-cards";
import { BalancesStep } from "@/components/roth/intake/balances-step";
import { buildOptimizePremiumHint, ConversionStep } from "@/components/roth/intake/conversion-step";
import { ClientProfileStep } from "@/components/roth/intake/client-profile-step";
import { IncomeStep } from "@/components/roth/intake/income-step";
import { TaxProfileStep } from "@/components/roth/intake/tax-profile-step";
import { SocialSecuritySection } from "@/components/roth/social-security-section";
import { FormField } from "@/components/roth/form/form-field";
import { FormSection } from "@/components/roth/form/form-section";
import { FormSubsection } from "@/components/roth/form/form-subsection";
import { YesNoSegment } from "@/components/roth/form/yes-no-segment";
import {
  buildRothConversionModelForAdvisorUi,
  computeOptimizedRothPremiumForAdvisorUi,
} from "@/lib/roth-conversion-ui-model";
import { assessRothConversionFeasibility } from "@/lib/roth-conversion-feasibility";
import { loadRothSession, normalizeRothSession, saveRothSession, type RothSession } from "@/lib/roth-session-storage";
import { parseClientAgeForIllustration } from "@/lib/roth-inputs";
import {
  clientDisplayName,
  emptyRothClient,
  type RothClient,
} from "@/lib/roth-client";
import {
  appendRothFicProductTemplate,
  applyRothFicProductTemplate,
  applyRothFicProductTemplateCarrierProductOnly,
  extractRothFicProductTemplate,
  formatRothFicTemplateDisplayName,
  isRothFicProductTemplateSpecComplete,
  loadRothFicProductTemplates,
  replaceRothFicProductTemplateById,
  type RothFicProductTemplateSaved,
} from "@/lib/roth-fic-template-storage";
import {
  emptyRothWorksheet,
  normalizeRothWorksheet,
  patchRothWorksheet,
  patchRothWorksheetFic,
  parseMoneyInput as parseRothMoneyInput,
  rothFullQualifiedPoolBalance,
  rothIllustrationQualifiedBalance,
  retirementIncomeNeedIsValid,
  type RothWorksheet,
} from "@/lib/roth-worksheet";
import { emptyRothSocialSecurityState, type RothSocialSecurityState } from "@/lib/roth-social-security";

const ROTH_FIC_TEMPLATE_PICKER_NONE = "__none_roth_fic__";

function currency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function parseManualQualifiedBalance(raw: string): number {
  const n = Number(String(raw || "").replace(/[$,]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export type RothConversionWorksheetProps = {
  profileId?: string | null;
  initialSession?: RothSession | null;
  advisorPortalMode?: boolean;
  clientLabel?: string;
};

export function RothConversionWorksheet({
  profileId = null,
  initialSession = null,
  advisorPortalMode = false,
  clientLabel,
}: RothConversionWorksheetProps = {}) {
  const [client, setClient] = useState<RothClient>(() => {
    if (initialSession) return initialSession.client;
    if (typeof window === "undefined") return emptyRothClient();
    return loadRothSession()?.client ?? emptyRothClient();
  });
  const [manualTraditionalQualified, setManualTraditionalQualified] = useState(() => {
    if (initialSession) return initialSession.manualTraditionalQualified;
    if (typeof window === "undefined") return "";
    return loadRothSession()?.manualTraditionalQualified ?? "";
  });
  const [rothWorksheet, setRothWorksheet] = useState<RothWorksheet>(() => {
    if (initialSession) return normalizeRothWorksheet(initialSession.rothWorksheet);
    if (typeof window === "undefined") return emptyRothWorksheet();
    const saved = loadRothSession()?.rothWorksheet;
    return saved ? normalizeRothWorksheet(saved) : emptyRothWorksheet();
  });
  const rothWorksheetSafe = useMemo(() => normalizeRothWorksheet(rothWorksheet), [rothWorksheet]);
  const commitRothWorksheet = useCallback((updater: SetStateAction<RothWorksheet>) => {
    setRothWorksheet((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return normalizeRothWorksheet(next);
    });
  }, []);
  const [rothLiveAnalysisOpen, setRothLiveAnalysisOpen] = useState(() => {
    if (initialSession) return initialSession.rothLiveAnalysisOpen;
    if (typeof window === "undefined") return false;
    return Boolean(loadRothSession()?.rothLiveAnalysisOpen);
  });
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [rothAnalysisPrecheckMessages, setRothAnalysisPrecheckMessages] = useState<string[]>([]);
  const [rothAnalysisBusy, setRothAnalysisBusy] = useState(false);
  const [rothOptimizePremiumHint, setRothOptimizePremiumHint] = useState<string | null>(null);
  const [rothIllustrationNonce, setRothIllustrationNonce] = useState(0);
  const [rothFicTemplatePickerValue, setRothFicTemplatePickerValue] = useState<string>(ROTH_FIC_TEMPLATE_PICKER_NONE);
  const [rothFicTemplateSaveOpen, setRothFicTemplateSaveOpen] = useState(false);
  const [rothFicTemplateNotice, setRothFicTemplateNotice] = useState<{ variant: "success" | "error"; message: string } | null>(null);
  const [rothFicTemplateListGen, setRothFicTemplateListGen] = useState(0);
  const [rothFicTemplateLoadSpecConfirmOpen, setRothFicTemplateLoadSpecConfirmOpen] = useState(false);
  const [rothFicPendingLoadTemplate, setRothFicPendingLoadTemplate] = useState<RothFicProductTemplateSaved | null>(null);
  const [rothFicTemplateRemapTargetId, setRothFicTemplateRemapTargetId] = useState<string | null>(null);
  const [socialSecurity, setSocialSecurity] = useState<RothSocialSecurityState>(() => {
    if (initialSession) return initialSession.socialSecurity;
    if (typeof window === "undefined") return emptyRothSocialSecurityState();
    return loadRothSession()?.socialSecurity ?? emptyRothSocialSecurityState();
  });
  const [loadedProfileId, setLoadedProfileId] = useState<string | null>(profileId);
  const [cloudSaveNotice, setCloudSaveNotice] = useState<{ variant: "success" | "error"; message: string } | null>(
    null,
  );
  const [taxBracketError, setTaxBracketError] = useState<string | null>(null);

  const patchClient = useCallback((patch: Partial<RothClient>) => {
    setClient((prev) => ({ ...prev, ...patch }));
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

  const scrollToTaxProfile = useCallback(() => {
    document.getElementById("intake-step-02")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleBracketInfeasible = useCallback(
    (message: string) => {
      setTaxBracketError(message);
      setRothLiveAnalysisOpen(false);
      scrollToTaxProfile();
    },
    [scrollToTaxProfile],
  );

  const patchSocialSecurity = useCallback((patch: Partial<RothSocialSecurityState>) => {
    setSocialSecurity((prev) => ({ ...prev, ...patch }));
  }, []);

  const saveToCloud = useCallback(async () => {
    if (!loadedProfileId) {
      setCloudSaveNotice({ variant: "error", message: "No cloud profile linked to this worksheet." });
      return;
    }
    const res = await fetch(`/api/prospect-profiles/${loadedProfileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client,
        rothWorksheet: rothWorksheetSafe,
        socialSecurity,
        manualTraditionalQualified,
      }),
    });
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !j.ok) {
      setCloudSaveNotice({ variant: "error", message: j.error || "Could not save to cloud." });
      return;
    }
    setCloudSaveNotice({ variant: "success", message: "Saved to cloud." });
  }, [loadedProfileId, client, rothWorksheetSafe, socialSecurity, manualTraditionalQualified]);

  const modelOptions = useMemo(() => ({ socialSecurity }), [socialSecurity]);

  const showRothOptionReport = true;
  const totalValue = 0;
  const traditionalQualifiedTotal = useMemo(
    () => parseManualQualifiedBalance(manualTraditionalQualified),
    [manualTraditionalQualified]
  );
  const rothPdfQualifiedTotal = useMemo(
    () => rothIllustrationQualifiedBalance(rothWorksheet, totalValue || 0, traditionalQualifiedTotal),
    [rothWorksheet, totalValue, traditionalQualifiedTotal]
  );
  const rothFullQualifiedPool = useMemo(
    () => rothFullQualifiedPoolBalance(rothWorksheet, totalValue || 0, traditionalQualifiedTotal),
    [rothWorksheet, totalValue, traditionalQualifiedTotal]
  );
  const rothLiveIllustration = useMemo(() => {
    if (!rothLiveAnalysisOpen) return null;
    return buildRothConversionModelForAdvisorUi(
      client,
      rothWorksheetSafe,
      rothPdfQualifiedTotal,
      rothFullQualifiedPool,
      modelOptions
    );
  }, [
    rothLiveAnalysisOpen,
    client,
    rothWorksheetSafe,
    rothPdfQualifiedTotal,
    rothFullQualifiedPool,
    rothIllustrationNonce,
    modelOptions,
  ]);
  const rothClientAge = useMemo(() => parseClientAgeForIllustration(client), [client]);
  const rothOptimizePremiumDisabledReason = useMemo(() => {
    if (traditionalQualifiedTotal <= 0) return "Enter traditional qualified balance first.";
    if (
      !retirementIncomeNeedIsValid(
        client.retirementSpendableIncomeAnnual,
        rothWorksheetSafe.variableRetirementIncomeAmounts
      )
    ) {
      return "Enter total retirement income need first.";
    }
    if (rothWorksheetSafe.retirementIncomeFromConversionAccount === null) {
      return 'Answer "Income received from conversion account?" first.';
    }
    if (rothClientAge < 60) return "Roth illustration runs for clients age 60 and older.";
    return null;
  }, [
    traditionalQualifiedTotal,
    rothClientAge,
    client.retirementSpendableIncomeAnnual,
    rothWorksheetSafe.retirementIncomeFromConversionAccount,
    rothWorksheetSafe.variableRetirementIncomeAmounts,
  ]);

  const savedRothFicTemplates = useMemo(() => loadRothFicProductTemplates(), [rothFicTemplateListGen]);

  useEffect(() => {
    setSessionHydrated(true);
  }, []);

  useEffect(() => {
    if (!sessionHydrated) return;
    saveRothSession({
      client,
      manualTraditionalQualified,
      rothWorksheet: rothWorksheetSafe,
      rothLiveAnalysisOpen,
      socialSecurity,
    });
  }, [sessionHydrated, client, manualTraditionalQualified, rothWorksheetSafe, rothLiveAnalysisOpen, socialSecurity]);

  async function runRothReportDownload(): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch("/api/generate-roth-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client,
          totalValue: rothPdfQualifiedTotal || 0,
          fullQualifiedPool: rothFullQualifiedPool || rothPdfQualifiedTotal || 0,
          traditionalQualifiedTotal: traditionalQualifiedTotal || 0,
          portfolioStatementTotal: totalValue || 0,
          rothWorksheet,
          socialSecurity,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        let msg = errText;
        try {
          const j = JSON.parse(errText) as { error?: string };
          if (j?.error) msg = j.error;
        } catch {
          /* use raw */
        }
        return { ok: false, error: msg || "Could not generate Roth Option PDF." };
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Roth_Option.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return { ok: true };
    } catch (e) {
      console.error(e);
      return { ok: false, error: "Failed to download Roth Option PDF." };
    }
  }

  async function downloadRothOptionPdf() {
    if (!showRothOptionReport) {
      alert("Roth Option is available for clients age 60 and older.");
      return;
    }
    if (!rothLiveAnalysisOpen) {
      alert("Complete the Roth worksheet choices first, then you can download the Roth Report PDF.");
      return;
    }
    const out = await runRothReportDownload();
    if (!out.ok) alert(out.error || "Could not generate Roth Option PDF.");
  }

  async function runRothAnalysisWithTaxPrecheck() {
    if (!showRothOptionReport) {
      alert("Roth Option is available for clients age 60 and older.");
      return;
    }
    const qualified = rothIllustrationQualifiedBalance(rothWorksheetSafe, totalValue || 0, traditionalQualifiedTotal);
    if (qualified <= 0) return;

    const feasibility = assessRothConversionFeasibility(
      client,
      rothWorksheetSafe,
      qualified,
      rothFullQualifiedPool,
      modelOptions,
    );
    if (!feasibility.ok) {
      if (feasibility.code === "bracket_exhausted" || feasibility.code === "holdout_exceeds_balance") {
        handleBracketInfeasible(feasibility.message);
        return;
      }
      return;
    }

    setRothAnalysisBusy(true);
    try {
      const pre = await fetch("/api/roth-analysis", { method: "POST" });
      const j = (await pre.json().catch(() => ({}))) as {
        ok?: boolean;
        proceed?: boolean;
        error?: string;
        messages?: string[];
      };
      if (!pre.ok || !j.ok || j.proceed === false) {
        alert(String(j.error || "Roth analysis tax-parameter check did not complete."));
        return;
      }
      setRothAnalysisPrecheckMessages(Array.isArray(j.messages) ? j.messages : []);
      setRothIllustrationNonce((n) => n + 1);
      setRothLiveAnalysisOpen(true);
    } catch (e) {
      console.error(e);
      alert("Roth analysis failed.");
    } finally {
      setRothAnalysisBusy(false);
    }
  }

  async function maybeRunRothAnalysis() {
    if (!showRothOptionReport || rothLiveAnalysisOpen || rothAnalysisBusy) return;
    await runRothAnalysisWithTaxPrecheck();
  }

  const openRothLiveIllustrationIfReady = useCallback(
    (ws: RothWorksheet) => {
      if (!showRothOptionReport) return;
      const normalized = normalizeRothWorksheet(ws);
      const qualified = rothIllustrationQualifiedBalance(normalized, totalValue || 0, traditionalQualifiedTotal);
      if (qualified <= 0) return;
      const fullPool = rothFullQualifiedPoolBalance(normalized, totalValue || 0, traditionalQualifiedTotal);
      const feasibility = assessRothConversionFeasibility(client, normalized, qualified, fullPool, modelOptions);
      if (!feasibility.ok) {
        if (feasibility.code === "bracket_exhausted" || feasibility.code === "holdout_exceeds_balance") {
          handleBracketInfeasible(feasibility.message);
        }
        return;
      }
      setRothIllustrationNonce((n) => n + 1);
      setRothLiveAnalysisOpen(true);
    },
    [
      showRothOptionReport,
      client,
      totalValue,
      traditionalQualifiedTotal,
      modelOptions,
      handleBracketInfeasible,
    ],
  );

  function withRothAutoRun<Args extends unknown[]>(fn: (...args: Args) => void): (...args: Args) => void {
    return (...args: Args) => {
      fn(...args);
      void maybeRunRothAnalysis();
    };
  }

  return (
    <div className="ap-app-bg min-h-screen py-6 md:py-10">
      <div className="mx-auto w-full max-w-[1800px] px-4 md:px-8 lg:px-12">
        <Card className="rounded-none ap-glass border-0">
          <CardContent className="space-y-8 p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 max-md:flex-col max-md:items-stretch">
                <div className="flex items-center gap-3 max-md:flex-col max-md:items-stretch">
                  {advisorPortalMode ? (
                    <Link
                      href="/advisor"
                      className="flex h-12 items-center gap-2 rounded-none border border-[#2a2a38] bg-[#14141d] px-4 text-sm font-medium text-[#fbbf24] hover:bg-[#1a1a24] max-md:w-full max-md:justify-center"
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden />
                      Back to portal
                    </Link>
                  ) : null}
                  <div className="flex items-center gap-3 max-md:w-full">
                    <div className="ap-icon-tile ap-icon-tile-amber flex h-12 w-12 shrink-0 items-center justify-center rounded-none">
                      <RothWorksheetIcon className="h-7 w-7" />
                    </div>
                    <div className="min-w-0">
                      <p className="ap-eyebrow">Roth Conversion · Worksheet</p>
                      <h2 className="ap-hero-title mt-1 text-2xl sm:text-3xl md:text-5xl">Roth conversion worksheet</h2>
                      <p className="mt-1 text-sm text-[#94a3b8]">
                        {advisorPortalMode && (clientLabel || clientDisplayName(client))
                          ? `Client: ${clientLabel || clientDisplayName(client)}`
                          : "Enter household and conversion inputs below. Run the illustrative analysis and download a Roth Option PDF when ready."}
                      </p>
                    </div>
                  </div>
                </div>
                {advisorPortalMode ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-none border-[#2a2a38] text-[#fbbf24] max-md:w-full"
                    disabled={!loadedProfileId}
                    onClick={() => void saveToCloud()}
                  >
                    <CloudUpload className="mr-2 h-4 w-4" />
                    Save to cloud
                  </Button>
                ) : null}
              </div>
              {cloudSaveNotice ? (
                <div
                  role="status"
                  className={
                    cloudSaveNotice.variant === "success"
                      ? "rounded-none border border-[#3a3115] bg-[#15130a] px-4 py-3 text-sm text-[#fcd34d]"
                      : "rounded-none border border-[#5a2020] bg-[#1c0d0d] px-4 py-3 text-sm text-[#fca5a5]"
                  }
                >
                  {cloudSaveNotice.message}
                </div>
              ) : null}

              <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] xl:items-start">
                <div className="space-y-8">

              <ClientProfileStep client={client} onClientChange={patchClient} />

              <TaxProfileStep
                client={client}
                worksheet={rothWorksheetSafe}
                onClientChange={patchClientWithBracketSync}
                onWorksheetChange={commitRothWorksheet}
                bracketError={taxBracketError}
                onBracketErrorClear={clearTaxBracketError}
              />

              <SocialSecuritySection
                client={client}
                socialSecurity={socialSecurity}
                onClientChange={patchClient}
                onSocialSecurityChange={patchSocialSecurity}
              />

              <IncomeStep
                client={client}
                worksheet={rothWorksheetSafe}
                onClientChange={patchClient}
                onWorksheetChange={commitRothWorksheet}
                onRetirementIncomeFromConversionChange={(yes) => {
                  commitRothWorksheet((w) =>
                    patchRothWorksheet(w, {
                      retirementIncomeFromConversionAccount: yes,
                      ...(yes ? {} : { incomeHoldoutReserve: "" }),
                    })
                  );
                  void maybeRunRothAnalysis();
                }}
                onVariableIncomeSaved={() => {
                  void maybeRunRothAnalysis();
                }}
              />

              <BalancesStep
                manualTraditionalQualified={manualTraditionalQualified}
                onManualTraditionalQualifiedChange={setManualTraditionalQualified}
              />

              <ConversionStep
                client={client}
                worksheet={rothWorksheetSafe}
                manualTraditionalQualified={manualTraditionalQualified}
                traditionalQualifiedTotal={traditionalQualifiedTotal}
                rothPdfQualifiedTotal={rothPdfQualifiedTotal}
                rothOptimizePremiumDisabledReason={rothOptimizePremiumDisabledReason}
                rothOptimizePremiumHint={rothOptimizePremiumHint}
                onWorksheetChange={commitRothWorksheet}
                onUseEntireQualifiedBalanceChange={withRothAutoRun((yes) => {
                  if (yes) {
                    commitRothWorksheet((w) => {
                      const next = patchRothWorksheet(w, { useEntireQualifiedBalance: true });
                      if (traditionalQualifiedTotal > 0 && parseRothMoneyInput(next.qualifiedAssetValue) <= 0) {
                        return patchRothWorksheet(next, {
                          qualifiedAssetValue: Math.round(traditionalQualifiedTotal).toLocaleString("en-US"),
                        });
                      }
                      return next;
                    });
                  } else {
                    commitRothWorksheet((w) => patchRothWorksheet(w, { useEntireQualifiedBalance: false }));
                  }
                })}
                onSpecificConversionAmountChange={withRothAutoRun((v) => {
                  setRothOptimizePremiumHint(null);
                  let nextWs: RothWorksheet | null = null;
                  commitRothWorksheet((w) => {
                    nextWs = patchRothWorksheet(w, {
                      useEntireQualifiedBalance: false,
                      specificConversionAmount: v,
                      incomeHoldoutReserve: "",
                    });
                    return nextWs;
                  });
                  if (nextWs) openRothLiveIllustrationIfReady(nextWs);
                })}
                onOptimizePremium={withRothAutoRun(() => {
                  setRothOptimizePremiumHint(null);
                  const result = computeOptimizedRothPremiumForAdvisorUi(
                    client,
                    rothWorksheet,
                    traditionalQualifiedTotal,
                    modelOptions
                  );
                  if (!result.ok) {
                    alert(result.error);
                    return;
                  }
                  const holdoutPatch =
                    rothWorksheetSafe.retirementIncomeFromConversionAccount === true &&
                    result.holdoutReserve > 0
                      ? { incomeHoldoutReserve: result.holdoutReserve.toLocaleString("en-US") }
                      : { incomeHoldoutReserve: "" };
                  let nextWs: RothWorksheet | null = null;
                  commitRothWorksheet((w) => {
                    nextWs = patchRothWorksheet(w, {
                      useEntireQualifiedBalance: false,
                      specificConversionAmount: result.amount.toLocaleString("en-US"),
                      ...holdoutPatch,
                    });
                    return nextWs;
                  });
                  if (nextWs) openRothLiveIllustrationIfReady(nextWs);
                  setRothOptimizePremiumHint(
                    buildOptimizePremiumHint({ client, worksheet: rothWorksheetSafe, result })
                  );
                })}
                onProtectInitialInvestmentChange={withRothAutoRun((yes) =>
                  commitRothWorksheet((w) => patchRothWorksheetFic(w, { protectInitialInvestment: yes }))
                )}
                onPayConversionTaxFromExternalChange={withRothAutoRun((yes) =>
                  commitRothWorksheet((w) =>
                    patchRothWorksheetFic(w, {
                      payConversionTaxFrom: yes ? "external" : "conversion_account",
                    })
                  )
                )}
              />

              <FormSection id="intake-step-07" step="07 / Product" title="Fixed indexed contract">
                <YesNoSegment
                  label="Use a fixed index contract to perform the conversion?"
                  value={rothWorksheetSafe.useFixedIndexContract}
                  onChange={withRothAutoRun((yes) =>
                    commitRothWorksheet((w) => patchRothWorksheet(w, { useFixedIndexContract: yes }))
                  )}
                />
                {rothWorksheetSafe.useFixedIndexContract === false ? (
                  <p className="text-xs text-[#94a3b8]">Illustration runs without a fixed index contract.</p>
                ) : null}
                {rothWorksheetSafe.useFixedIndexContract === true ? (
                  <>
                    <FormSubsection
                      title="Saved templates"
                      description="Stored in this browser only. Separate from FIA calculator templates."
                    >
                      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
                        <FormField id="fic-saved-template" label="Load saved template" className="flex-1 min-w-0 sm:max-w-md">
                          <Select
                            value={rothFicTemplatePickerValue}
                            onValueChange={(id) => {
                              setRothFicTemplatePickerValue(id);
                              if (id === ROTH_FIC_TEMPLATE_PICKER_NONE) return;
                              const row = savedRothFicTemplates.find((t) => t.id === id);
                              if (!row) return;
                              setRothFicPendingLoadTemplate(row);
                              setRothFicTemplateLoadSpecConfirmOpen(true);
                              window.setTimeout(() => setRothFicTemplatePickerValue(ROTH_FIC_TEMPLATE_PICKER_NONE), 0);
                            }}
                            disabled={savedRothFicTemplates.length === 0}
                          >
                            <SelectTrigger id="fic-saved-template" className="h-12 rounded-none" aria-label="Load saved Roth FIC product template">
                              <SelectValue
                                placeholder={
                                  savedRothFicTemplates.length === 0
                                    ? "No Roth FIC templates — save one first"
                                    : "Load saved Roth FIC template…"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={ROTH_FIC_TEMPLATE_PICKER_NONE}>— Select —</SelectItem>
                              {savedRothFicTemplates.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.displayName.length > 80 ? `${t.displayName.slice(0, 77)}…` : t.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormField>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 shrink-0 rounded-none border-[#2a2a38] bg-[#14141d]"
                          onClick={() => {
                            const c = rothWorksheet.fic.carrierName.trim();
                            const p = rothWorksheet.fic.productName.trim();
                            if (!c || !p) {
                              setRothFicTemplateNotice({
                                variant: "error",
                                message: "Enter carrier and product name before saving a Roth FIC template.",
                              });
                              return;
                            }
                            setRothFicTemplateNotice(null);
                            setRothFicTemplateSaveOpen(true);
                          }}
                        >
                          <BookmarkPlus className="mr-2 h-4 w-4" aria-hidden />
                          Save Roth FIC template
                        </Button>
                      </div>
                    </FormSubsection>
                    {rothFicTemplateNotice ? (
                      <div
                        role="status"
                        className={
                          rothFicTemplateNotice.variant === "success"
                            ? "rounded-none border border-[#3a3115] bg-[#15130a] px-4 py-3 text-sm text-[#fcd34d]"
                            : "rounded-none border border-[#5a2020] bg-[#1c0d0d] px-4 py-3 text-sm text-[#fca5a5]"
                        }
                      >
                        {rothFicTemplateNotice.message}
                      </div>
                    ) : null}
                    {rothFicTemplateRemapTargetId ? (
                      <div
                        role="region"
                        aria-label="Update saved Roth FIC template"
                        className="rounded-none border border-[#3a3115] bg-[#15130a] px-4 py-3 text-sm text-[#fbbf24]"
                      >
                        <p className="font-semibold">Remapping Roth FIC template</p>
                        <p className="mt-1 text-xs leading-relaxed text-[#fcd34d] sm:text-sm">
                          Carrier and product name stay as saved. Re-enter bonuses, estimated return, withdrawal terms, and
                          max tax rate below, then update the stored template. Qualified balance and other Roth worksheet
                          fields are unchanged.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            className="h-12 rounded-none ap-cta-solid"
                            onClick={() => {
                              const id = rothFicTemplateRemapTargetId;
                              if (!id) return;
                              const origRow = savedRothFicTemplates.find((t) => t.id === id);
                              if (!origRow) {
                                setRothFicTemplateNotice({
                                  variant: "error",
                                  message: "That template is no longer in this browser. Cancel or load another template.",
                                });
                                setRothFicTemplateRemapTargetId(null);
                                return;
                              }
                              const tpl = extractRothFicProductTemplate(rothWorksheet);
                              const origC = String(origRow.template.carrierName ?? "").trim();
                              const origP = String(origRow.template.productName ?? "").trim();
                              if (
                                String(tpl.carrierName ?? "").trim() !== origC ||
                                String(tpl.productName ?? "").trim() !== origP
                              ) {
                                setRothFicTemplateNotice({
                                  variant: "error",
                                  message:
                                    "Keep carrier and product name unchanged to update this template, or cancel remapping and load again.",
                                });
                                return;
                              }
                              if (!isRothFicProductTemplateSpecComplete(tpl)) {
                                setRothFicTemplateNotice({
                                  variant: "error",
                                  message:
                                    "Fill max tax rate (10–37%), estimated return %, premium bonus, surrender term, withdrawal %, and trail bonus years when trailing bonus is set. Then try Update again.",
                                });
                                return;
                              }
                              const display = formatRothFicTemplateDisplayName(tpl.carrierName, tpl.productName);
                              const result = replaceRothFicProductTemplateById(id, tpl, display);
                              if (!result.ok) {
                                setRothFicTemplateNotice({ variant: "error", message: result.error });
                                return;
                              }
                              setRothFicTemplateListGen((g) => g + 1);
                              setRothFicTemplateRemapTargetId(null);
                              commitRothWorksheet((w) => applyRothFicProductTemplate(w, tpl));
                              setRothFicTemplateNotice({
                                variant: "success",
                                message: `Updated Roth FIC template "${display}" with the specifications you entered.`,
                              });
                            }}
                          >
                            Update template
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-12 rounded-none border-[#3a3115] bg-[#14141d]"
                            onClick={() => {
                              setRothFicTemplateRemapTargetId(null);
                              setRothFicTemplateNotice({
                                variant: "success",
                                message: "Stopped remapping. Your worksheet was not saved as a template update.",
                              });
                            }}
                          >
                            Cancel remapping
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    <FormSubsection title="Product details">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField id="fic-carrier-name" label="Carrier name" className="md:col-span-2">
                      <Input
                        id="fic-carrier-name"
                        className="h-12 rounded-none"
                        value={rothWorksheetSafe.fic.carrierName}
                        onChange={(e) =>
                          commitRothWorksheet((w) => patchRothWorksheetFic(w, { carrierName: e.target.value }))
                        }
                      />
                    </FormField>
                    <FormField id="fic-product-name" label="Product name" className="md:col-span-2">
                      <Input
                        id="fic-product-name"
                        className="h-12 rounded-none"
                        value={rothWorksheetSafe.fic.productName}
                        onChange={(e) =>
                          commitRothWorksheet((w) => patchRothWorksheetFic(w, { productName: e.target.value }))
                        }
                      />
                    </FormField>
                    <FormField id="fic-premium-bonus" label="Premium bonus %">
                      <Input
                        id="fic-premium-bonus"
                        className="h-12 w-full rounded-none sm:max-w-[12rem]"
                        type="text"
                        inputMode="decimal"
                        value={rothWorksheetSafe.fic.premiumBonusPct}
                        onChange={(e) =>
                          commitRothWorksheet((w) => patchRothWorksheetFic(w, { premiumBonusPct: e.target.value }))
                        }
                      />
                    </FormField>
                    <FormField id="fic-trailing-bonus" label="Trailing bonus %">
                      <Input
                        id="fic-trailing-bonus"
                        className="h-12 w-full rounded-none sm:max-w-[12rem]"
                        type="text"
                        inputMode="decimal"
                        value={rothWorksheetSafe.fic.trailingBonusPct}
                        onChange={(e) =>
                          commitRothWorksheet((w) => patchRothWorksheetFic(w, { trailingBonusPct: e.target.value }))
                        }
                      />
                    </FormField>
                    <FormField id="fic-trail-years" label="Trail bonus years">
                      <Input
                        id="fic-trail-years"
                        className="h-12 w-full rounded-none sm:max-w-[12rem]"
                        type="text"
                        inputMode="numeric"
                        value={rothWorksheetSafe.fic.trailBonusYears}
                        onChange={(e) =>
                          commitRothWorksheet((w) => patchRothWorksheetFic(w, { trailBonusYears: e.target.value }))
                        }
                        placeholder="e.g. 10"
                      />
                    </FormField>
                    <FormField id="fic-return-rate" label="Contract estimated rate of return %">
                      <Input
                        id="fic-return-rate"
                        className="h-12 w-full rounded-none sm:max-w-[12rem]"
                        type="text"
                        inputMode="decimal"
                        value={rothWorksheetSafe.fic.contractEstimatedRateOfReturnPct}
                        onChange={(e) =>
                          commitRothWorksheet((w) =>
                            patchRothWorksheetFic(w, { contractEstimatedRateOfReturnPct: e.target.value })
                          )
                        }
                      />
                    </FormField>
                    <FormField id="fic-penalty-free" label="Penalty-free withdrawal amount from contract %">
                      <Input
                        id="fic-penalty-free"
                        className="h-12 w-full rounded-none sm:max-w-[12rem]"
                        type="text"
                        inputMode="decimal"
                        value={rothWorksheetSafe.fic.penaltyFreeWithdrawalPct}
                        onChange={(e) =>
                          commitRothWorksheet((w) =>
                            patchRothWorksheetFic(w, { penaltyFreeWithdrawalPct: e.target.value })
                          )
                        }
                      />
                    </FormField>
                    <FormField id="fic-surrender-years" label="Surrender years of contract">
                      <Input
                        id="fic-surrender-years"
                        className="h-12 w-full rounded-none sm:max-w-[12rem]"
                        type="text"
                        inputMode="decimal"
                        value={rothWorksheetSafe.fic.surrenderYears}
                        onChange={(e) =>
                          commitRothWorksheet((w) => patchRothWorksheetFic(w, { surrenderYears: e.target.value }))
                        }
                      />
                    </FormField>
                  </div>
                    </FormSubsection>
                  </>
                ) : null}
              </FormSection>

              {rothFicTemplateLoadSpecConfirmOpen && rothFicPendingLoadTemplate ? (
                <div
                  className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 p-4"
                  role="presentation"
                  onClick={() => {
                    setRothFicTemplateLoadSpecConfirmOpen(false);
                    setRothFicPendingLoadTemplate(null);
                  }}
                >
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="roth-fic-template-load-spec-heading"
                    className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-none border border-[#1e1e2e] bg-[#101017] p-6 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 id="roth-fic-template-load-spec-heading" className="font-serif text-xl font-bold text-[#e2e8f0]">
                      Load Roth FIC template?
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-[#94a3b8]">
                      Update product specifications for{" "}
                      <span className="font-semibold text-[#e2e8f0]">{rothFicPendingLoadTemplate.displayName}</span>?
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-[#94a3b8]">
                      <span className="font-medium text-[#94a3b8]">No</span> loads every saved Roth FIC field (including max
                      tax rate and protect initial investment). <span className="font-medium text-[#94a3b8]">Yes</span> keeps
                      carrier and product name only so you can re-enter terms, then use <span className="font-medium text-[#94a3b8]">Update template</span>.
                    </p>
                    <div className="mt-6 flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 rounded-none"
                        onClick={() => {
                          setRothFicTemplateLoadSpecConfirmOpen(false);
                          setRothFicPendingLoadTemplate(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 rounded-none border-[#2a2a38]"
                        onClick={withRothAutoRun(() => {
                          const row = rothFicPendingLoadTemplate;
                          setRothFicTemplateLoadSpecConfirmOpen(false);
                          setRothFicPendingLoadTemplate(null);
                          setRothFicTemplateRemapTargetId(null);
                          commitRothWorksheet((w) => applyRothFicProductTemplate(w, row.template));
                          setRothFicTemplateNotice({
                            variant: "success",
                            message: `Loaded Roth FIC template "${row.displayName}".`,
                          });
                        })}
                      >
                        No, load as saved
                      </Button>
                      <Button
                        type="button"
                        className="h-12 rounded-none ap-cta-solid"
                        onClick={withRothAutoRun(() => {
                          const row = rothFicPendingLoadTemplate;
                          setRothFicTemplateLoadSpecConfirmOpen(false);
                          setRothFicPendingLoadTemplate(null);
                          commitRothWorksheet((w) => applyRothFicProductTemplateCarrierProductOnly(w, row.template));
                          setRothFicTemplateRemapTargetId(row.id);
                          setRothFicTemplateNotice({
                            variant: "success",
                            message: `Carrier and product set from "${row.displayName}". Enter remaining Roth FIC terms, then Update template.`,
                          });
                        })}
                      >
                        Yes, remap specs
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              {rothFicTemplateSaveOpen ? (
                <div
                  className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 p-4"
                  role="presentation"
                  onClick={() => setRothFicTemplateSaveOpen(false)}
                >
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="roth-fic-template-save-heading"
                    className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-none border border-[#1e1e2e] bg-[#101017] p-6 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 id="roth-fic-template-save-heading" className="font-serif text-xl font-bold text-[#e2e8f0]">
                      Save this Roth FIC template?
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-[#94a3b8]">
                      Saves Roth fixed-index contract fields only (carrier through surrender years, max tax rate %, protect
                      initial investment). Not saved: qualified balance, conversion amount, or client profile. Stored separately
                      from FIA calculator templates in this browser.
                    </p>
                    <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[#94a3b8]">Template name</p>
                    <p className="mt-1 rounded-none border border-[#1e1e2e] bg-[#14141d] px-3 py-2.5 text-base font-semibold text-[#e2e8f0]">
                      {formatRothFicTemplateDisplayName(
                        rothWorksheet.fic.carrierName.trim(),
                        rothWorksheet.fic.productName.trim()
                      )}
                    </p>
                    <div className="mt-6 flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 rounded-none"
                        onClick={() => setRothFicTemplateSaveOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        className="h-12 rounded-none ap-cta-solid"
                        onClick={() => {
                          const tpl = extractRothFicProductTemplate(rothWorksheet);
                          const display = formatRothFicTemplateDisplayName(tpl.carrierName, tpl.productName);
                          const result = appendRothFicProductTemplate(tpl, display);
                          setRothFicTemplateSaveOpen(false);
                          if (!result.ok) {
                            setRothFicTemplateNotice({ variant: "error", message: result.error });
                            return;
                          }
                          setRothFicTemplateListGen((g) => g + 1);
                          setRothFicTemplateNotice({
                            variant: "success",
                            message: `Saved Roth FIC template "${display}" in this browser (Roth list only).`,
                          });
                          window.setTimeout(() => {
                            setRothFicTemplateNotice((n) => (n?.variant === "success" ? null : n));
                          }, 8000);
                        }}
                      >
                        Save template
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              {rothAnalysisBusy ? (
                <p className="text-sm text-[#fbbf24]" role="status" aria-live="polite">
                  Running Roth check…
                </p>
              ) : null}

                </div>

                <div>
              {rothLiveAnalysisOpen && rothLiveIllustration ? (
                <div className="space-y-5 rounded-none border border-[#3a3115] bg-[#15130a] p-5 md:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-serif text-xl font-bold text-[#e2e8f0]">Illustrative Roth analysis</p>
                      <p className="mt-1 max-w-4xl text-xs leading-relaxed text-[#94a3b8]">
                        Comparison charts summarize stay vs. Roth paths; year-by-year tables below use the same model as the Roth Option PDF. Change inputs above — values update live. Illustrative only, not tax or investment advice.
                      </p>
                    </div>
                    <Button
                      className="h-12 shrink-0 rounded-none ap-cta-solid touch-manipulation"
                      onClick={() => void downloadRothOptionPdf()}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Roth Report
                    </Button>
                  </div>
                  {rothAnalysisPrecheckMessages.length > 0 ? (
                    <div className="rounded-none border border-[#1e1e2e] bg-[#101017] px-4 py-3 text-xs text-[#94a3b8]" role="status">
                      <p className="font-semibold text-[#e2e8f0]">Tax illustration reference</p>
                      <ul className="mt-2 list-disc space-y-1 pl-4">
                        {rothAnalysisPrecheckMessages.map((msg, i) => (
                          <li key={`${i}-${msg}`}>{msg}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {rothLiveIllustration.ok ? (
                    (() => {
                      const model = rothLiveIllustration.model;
                      const stayRows = model.stayTraditional;
                      const stayLast = stayRows.length ? stayRows[stayRows.length - 1]! : null;
                      const rt = model.rothConversionTotals;
                      const st = model.stayTraditionalTotals;
                      const stayIncomeColumnSum = stayRows.reduce((sum, r) => sum + r.reportIncomeAnnual, 0);
                      const rothIncomeColumnSum = model.rothConversion.reduce((sum, r) => sum + r.reportIncomeAnnual, 0);
                      return (
                        <>
                          <RothComparisonVisuals
                            model={model}
                            clientName={clientDisplayName(client) || undefined}
                            useEntireQualifiedBalance={rothWorksheetSafe.useEntireQualifiedBalance}
                          />
                          <p className="text-xs leading-relaxed text-[#94a3b8]">{model.rothGrowthAssumptionLabel}</p>
                          <Tabs
                            key={`roth-tabs-${model.startingBalance}-${model.conversionPremium}-${model.incomeHoldoutReserve}-${model.rothConversion.length}`}
                            defaultValue="stay"
                            className="w-full"
                          >
                            <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-1">
                              <TabsTrigger value="stay" className="text-xs sm:text-sm">
                                Current allocation (traditional + RMDs)
                              </TabsTrigger>
                              <TabsTrigger value="roth" className="text-xs sm:text-sm">
                                Roth conversion path
                              </TabsTrigger>
                            </TabsList>
                            <TabsContent value="stay" className="mt-4 space-y-2">
                              <p className="text-xs font-semibold text-[#94a3b8]">
                                Current allocation · 10% annual growth with RMDs from age 73
                              </p>
                              <AnalysisYearCards
                                rows={stayRows.map((r) => ({
                                  key: `stay-${r.age}-${r.calendarYearOffset}`,
                                  title: `Year ${r.calendarYearOffset} · Age ${r.age}`,
                                  fields: [
                                    { label: "IRA balance", value: currency(r.yearStartBalance) },
                                    { label: "Total income", value: currency(r.reportIncomeAnnual) },
                                    {
                                      label: "Illust. tax",
                                      value: currency(r.illustrativeFederalTax + r.illustrativeStateTax),
                                    },
                                    { label: "End bal", value: currency(r.endBalance), highlight: true },
                                    { label: "RMD", value: currency(r.rmd) },
                                    { label: "IRMAA", value: currency(r.irmaaSurchargeAnnual) },
                                  ],
                                }))}
                                totalRow={{
                                  key: "stay-total",
                                  title: "Total",
                                  fields: [
                                    { label: "Total income", value: currency(stayIncomeColumnSum) },
                                    { label: "Illust. tax", value: currency(st.totalTaxAttributableToRmds) },
                                    { label: "End bal", value: currency(stayLast?.endBalance ?? 0) },
                                    { label: "RMD", value: currency(st.totalRmdWithdrawals) },
                                    { label: "IRMAA", value: currency(st.totalIrmaaPaid) },
                                  ],
                                }}
                              />
                            </TabsContent>
                            <TabsContent value="roth" className="mt-4 space-y-2">
                              <p className="text-xs font-semibold text-[#94a3b8]">Roth conversion path</p>
                              <AnalysisYearCards
                                rows={model.rothConversion.map((r) => {
                                  const z = r.rothOnlyPhase;
                                  return {
                                    key: `roth-${r.sequence}`,
                                    title: `Year ${r.sequence} · Age ${r.age}`,
                                    fields: [
                                      {
                                        label: "Taxable IRA",
                                        value: z ? currency(0) : currency(r.yearStartTraditional),
                                      },
                                      { label: "Total income", value: currency(r.reportIncomeAnnual) },
                                      {
                                        label: "Gross conv",
                                        value: z ? currency(0) : currency(r.grossConversion),
                                      },
                                      {
                                        label: "Tax",
                                        value: z ? currency(0) : currency(r.illustrativeTaxOnConversion),
                                      },
                                      {
                                        label: "Net conv",
                                        value: z ? currency(0) : currency(r.netConversionToRoth),
                                      },
                                      {
                                        label: "Total Roth",
                                        value: currency(r.totalRothBalance),
                                        highlight: true,
                                      },
                                      { label: "RMD", value: z ? currency(0) : currency(r.rmdTraditional) },
                                      {
                                        label: "IRMAA",
                                        value: z ? currency(0) : currency(r.irmaaSurchargeAnnual),
                                      },
                                    ],
                                  };
                                })}
                                totalRow={{
                                  key: "roth-total",
                                  title: "Total",
                                  fields: [
                                    { label: "Total income", value: currency(rothIncomeColumnSum) },
                                    { label: "Gross conv", value: currency(rt.totalGrossConversion) },
                                    { label: "Tax", value: currency(rt.totalConversionTaxPaid) },
                                    { label: "Net conv", value: currency(rt.totalNetConversionToRoth) },
                                    { label: "Total Roth", value: currency(rt.endingTotalRothBalance) },
                                    { label: "RMD", value: currency(rt.totalRmdTraditional) },
                                    { label: "IRMAA", value: currency(rt.totalIrmaaPaid) },
                                  ],
                                }}
                              />
                            </TabsContent>
                          </Tabs>
                          <details className="rounded-none border border-[#1e1e2e] bg-[#101017] px-4 py-3 text-xs text-[#94a3b8]">
                            <summary className="cursor-pointer font-semibold text-[#e2e8f0]">
                              {`Model assumptions (${model.federalBracketId}% bracket ceiling · ${
                                model.marriedFilingJointly ? "MFJ" : "Single"
                              } illustration)`}
                            </summary>
                            <ul className="mt-2 list-disc space-y-2 pl-4">
                              {model.assumptions.map((a, i) => (
                                <li key={i}>{a}</li>
                              ))}
                            </ul>
                          </details>
                        </>
                      );
                    })()
                  ) : (
                    <div className="rounded-none border border-[#5a2020] bg-[#1c0d0d] px-4 py-3 text-sm text-[#fca5a5]">
                      {rothLiveIllustration.error} Adjust the fields above or complete the fields above so the illustration can run.
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-none border border-[#1e1e2e] bg-[#101017] p-6 md:p-8">
                  <p className="ap-eyebrow">Illustrative analysis</p>
                  <p className="mt-3 text-sm leading-relaxed text-[#94a3b8]">
                    Your illustrative comparison charts and year-by-year tables will appear here as you complete the inputs.
                  </p>
                </div>
              )}

                </div>
              </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
