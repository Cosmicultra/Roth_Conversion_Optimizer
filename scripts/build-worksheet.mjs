import fs from "fs";
import path from "path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const extractPath = path.join(root, "_roth_extract.txt");
let body = fs.readFileSync(extractPath, "utf8");

body = body.replace(/^\s*<CardContent className="space-y-8 p-6 md:p-8">\s*\n/, "");
body = body.replace(
  /\s*<WorkflowStepFooter[\s\S]*$/,
  ""
);
body = body.replace(
  /Capture Roth inputs for this case\. Entries here are saved with the client profile; the Roth PDF uses your qualified balance below\./,
  "Enter household and conversion inputs below. Run the illustrative analysis and download a Roth Option PDF when ready."
);
body = body.replace(
  /<p className="text-xs text-slate-500">Married status is set during intake \(Question 1\)\.<\/p>/,
  `<div className="space-y-3 border-t border-slate-200 pt-4">
                <p className="text-sm text-slate-700">Married filing jointly?</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant={client.married ? "default" : "outline"} className="h-11 rounded-none" onClick={() => setClient({ ...client, married: true })}>Yes</Button>
                  <Button type="button" variant={!client.married ? "default" : "outline"} className="h-11 rounded-none" onClick={() => setClient({ ...client, married: false })}>No</Button>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Federal marginal tax bracket</label>
                  <Select value={client.federalTaxBracket || "22"} onValueChange={(v) => setClient({ ...client, federalTaxBracket: v })}>
                    <SelectTrigger className="mt-2 h-12 rounded-none bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FEDERAL_TAX_BRACKET_IDS.map((id) => (
                        <SelectItem key={id} value={id}>{id}%</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Retirement age</label>
                  <Input className="mt-2 h-12 rounded-none bg-white" type="number" value={client.retirementAge} onChange={(e) => setClient({ ...client, retirementAge: e.target.value })} placeholder="67" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-700">Taking Social Security?</p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant={client.takingSocialSecurity ? "default" : "outline"} className="h-11 rounded-none" onClick={() => setClient({ ...client, takingSocialSecurity: true })}>Yes</Button>
                    <Button type="button" variant={!client.takingSocialSecurity ? "default" : "outline"} className="h-11 rounded-none" onClick={() => setClient({ ...client, takingSocialSecurity: false })}>No</Button>
                  </div>
                </div>
              </div>`
);
body = body.replace(
  /“Qualified” here means traditional tax-deferred balances \(Confirm step\)\. Roth IRAs and taxable accounts never flow into this cap automatically\./,
  "“Qualified” here means traditional tax-deferred balances (IRAs, 401(k)s, etc.). Enter your traditional qualified pool below."
);
body = body.replace(
  /<p className="text-xs text-slate-500">\s*Statement total \(all wrappers\):[\s\S]*?<\/p>/,
  `<p className="text-xs text-slate-500">
                  Traditional qualified pool:{" "}
                  <span className="font-semibold text-slate-800">{currency(traditionalQualifiedTotal)}</span>.
                  Roth illustration amount after caps:{" "}
                  <span className="font-semibold text-slate-700">{currency(rothPdfQualifiedTotal || 0)}</span>
                  {rothPdfQualifiedTotal <= 0
                    ? ". Choose Yes/No above and enter an amount so the PDF can run."
                    : "."}
                </p>`
);
body = body.replace(/From intake \(&quot;taking Social Security&quot;\)\. Updates here sync to the client profile\./g, "Enter monthly Social Security amounts below.");
body = body.replace(/Pulled from intake as AGI \(Form 1040, line 11 on recent-year returns\)\./, "Enter adjusted gross income (Form 1040, line 11 on recent-year returns).");
body = body.replace(/From intake: how much spendable income the client needs in retirement annually\. Edits here update the client profile\./, "How much spendable income is needed in retirement annually?");
body = body.replace(/complete intake so the illustration can run/, "complete the fields above so the illustration can run");
body = body.replace(/Â·/g, "·");

const header = `"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookmarkPlus, Download, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencyAmountInput } from "@/components/currency-amount-input";
import { RothComparisonVisuals } from "@/components/roth/roth-comparison-visuals";
import {
  buildRothConversionModelForAdvisorUi,
  computeOptimizedRothPremiumForAdvisorUi,
} from "@/lib/roth-conversion-ui-model";
import { RMD_ILLUSTRATION_START_AGE } from "@/lib/roth-conversion-analysis";
import { parseClientAgeForIllustration } from "@/lib/roth-inputs";
import {
  clientDisplayName,
  emptyRothClient,
  FEDERAL_TAX_BRACKET_IDS,
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
  type RothWorksheet,
} from "@/lib/roth-worksheet";
import { loadRothSession, saveRothSession } from "@/lib/roth-session-storage";

const ROTH_FIC_TEMPLATE_PICKER_NONE = "__none_roth_fic__";

function currency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function parseManualQualifiedBalance(raw: string): number {
  const n = Number(String(raw || "").replace(/[$,]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function RothConversionWorksheet() {
  const [client, setClient] = useState<RothClient>(() => emptyRothClient());
  const [manualTraditionalQualified, setManualTraditionalQualified] = useState("");
  const [rothWorksheet, setRothWorksheet] = useState<RothWorksheet>(() => emptyRothWorksheet());
  const rothWorksheetSafe = useMemo(() => normalizeRothWorksheet(rothWorksheet), [rothWorksheet]);
  const commitRothWorksheet = useCallback((updater: React.SetStateAction<RothWorksheet>) => {
    setRothWorksheet((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return normalizeRothWorksheet(next);
    });
  }, []);
  const [rothLiveAnalysisOpen, setRothLiveAnalysisOpen] = useState(false);
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
    return buildRothConversionModelForAdvisorUi(client, rothWorksheetSafe, rothPdfQualifiedTotal, rothFullQualifiedPool);
  }, [rothLiveAnalysisOpen, client, rothWorksheetSafe, rothPdfQualifiedTotal, rothFullQualifiedPool, rothIllustrationNonce]);
  const rothClientAge = useMemo(() => parseClientAgeForIllustration(client), [client]);
  const rothOptimizePremiumDisabledReason = useMemo(() => {
    if (traditionalQualifiedTotal <= 0) return "Enter traditional qualified balance first.";
    if (rothClientAge >= RMD_ILLUSTRATION_START_AGE) {
      return \`Client must be younger than RMD age \${RMD_ILLUSTRATION_START_AGE} (modeled age \${rothClientAge}).\`;
    }
    const need = Math.max(0, Number(String(client.retirementSpendableIncomeAnnual || "").replace(/[$,]/g, "")) || 0);
    if (need <= 0) return "Enter annual retirement spendable income first.";
    if (rothWorksheetSafe.retirementIncomeFromConversionAccount === null) {
      return 'Answer "Income received from conversion account?" first.';
    }
    if (rothClientAge < 60) return "Roth illustration runs for clients age 60 and older.";
    return null;
  }, [traditionalQualifiedTotal, rothClientAge, client.retirementSpendableIncomeAnnual, rothWorksheetSafe.retirementIncomeFromConversionAccount]);

  const savedRothFicTemplates = useMemo(() => loadRothFicProductTemplates(), [rothFicTemplateListGen]);

  useEffect(() => {
    const saved = loadRothSession();
    if (!saved) return;
    setClient(saved.client);
    setManualTraditionalQualified(saved.manualTraditionalQualified);
    setRothWorksheet(normalizeRothWorksheet(saved.rothWorksheet));
    if (saved.rothLiveAnalysisOpen) setRothLiveAnalysisOpen(true);
  }, []);

  useEffect(() => {
    saveRothSession({
      client,
      manualTraditionalQualified,
      rothWorksheet: rothWorksheetSafe,
      rothLiveAnalysisOpen,
    });
  }, [client, manualTraditionalQualified, rothWorksheetSafe, rothLiveAnalysisOpen]);

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
      const built = buildRothConversionModelForAdvisorUi(client, normalized, qualified, fullPool);
      if (built.ok) {
        setRothIllustrationNonce((n) => n + 1);
        setRothLiveAnalysisOpen(true);
      }
    },
    [showRothOptionReport, client, totalValue, traditionalQualifiedTotal]
  );

  function withRothAutoRun<T extends (...args: never[]) => void>(fn: T): T {
    return ((...args: Parameters<T>) => {
      fn(...args);
      void maybeRunRothAnalysis();
    }) as T;
  }

  return (
    <div className="ap-app-bg min-h-screen py-6 md:py-10">
      <div className="mx-auto max-w-5xl px-4">
        <Card className="rounded-none ap-glass border-0">
          <CardContent className="space-y-8 p-6 md:p-8">
`;

const footer = `
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
`;

// Insert manual qualified balance field before qualified balance Yes/No section
const qualifiedSectionMarker = `<div className="space-y-4 rounded-none border border-slate-200 bg-white p-5 md:p-6">
                <p className="text-sm font-semibold text-slate-800">Qualified balance for conversion</p>`;
const qualifiedInsert = `<div className="space-y-4 rounded-none border border-slate-200 bg-white p-5 md:p-6">
                <p className="text-sm font-semibold text-slate-800">Traditional qualified balance</p>
                <p className="text-xs text-slate-500">Total traditional tax-deferred balance available for this illustration (IRAs, 401(k)s, etc.).</p>
                <CurrencyAmountInput
                  className="h-12 max-w-md border-blue-100 focus-within:ring-sky-500"
                  value={manualTraditionalQualified}
                  onChange={setManualTraditionalQualified}
                  placeholder="500000"
                />
              </div>

              <div className="space-y-4 rounded-none border border-slate-200 bg-white p-5 md:p-6">
                <p className="text-sm font-semibold text-slate-800">Qualified balance for conversion</p>`;

body = body.replace(qualifiedSectionMarker, qualifiedInsert);

const out = header + body + footer;
fs.writeFileSync(path.join(root, "components", "roth", "roth-conversion-worksheet.tsx"), out, "utf8");
console.log("Wrote roth-conversion-worksheet.tsx", out.length, "chars");
