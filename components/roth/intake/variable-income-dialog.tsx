"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CurrencyAmountInput } from "@/components/currency-amount-input";
import { Button } from "@/components/ui/button";
import { retirementNeedInflationAnchorAge } from "@/lib/retirement-income-escalation";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  retireAge: number;
  illustrationStartAge: number;
  initialAmounts: string[];
  defaultFirstYearAmount: string;
  onSave: (amounts: string[]) => void;
};

function trimTrailingEmpty(amounts: string[]): string[] {
  const next = [...amounts];
  while (next.length > 0 && !String(next[next.length - 1] ?? "").trim()) {
    next.pop();
  }
  return next;
}

export function VariableIncomeDialog({
  open,
  onOpenChange,
  retireAge,
  illustrationStartAge,
  initialAmounts,
  defaultFirstYearAmount,
  onSave,
}: Props) {
  const anchorAge = useMemo(
    () => retirementNeedInflationAnchorAge({ retireAge, illustrationStartAge }),
    [retireAge, illustrationStartAge]
  );

  const [draftAmounts, setDraftAmounts] = useState<string[]>([""]);

  useEffect(() => {
    if (!open) return;
    if (initialAmounts.length > 0) {
      setDraftAmounts([...initialAmounts]);
      return;
    }
    setDraftAmounts([defaultFirstYearAmount.trim() || ""]);
  }, [open, initialAmounts, defaultFirstYearAmount]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  function updateRow(index: number, value: string) {
    setDraftAmounts((prev) => prev.map((row, i) => (i === index ? value : row)));
  }

  function addRow() {
    setDraftAmounts((prev) => [...prev, ""]);
  }

  function removeRow(index: number) {
    setDraftAmounts((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function handleSave() {
    const saved = trimTrailingEmpty(draftAmounts);
    onSave(saved);
    onOpenChange(false);
  }

  function handleClear() {
    onSave([]);
    onOpenChange(false);
  }

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 p-4"
      role="presentation"
      onClick={() => onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="variable-income-dialog-heading"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-none border border-[#1e1e2e] bg-[#101017] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="variable-income-dialog-heading" className="font-serif text-xl font-bold text-[#e2e8f0]">
          Variable retirement income
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[#94a3b8]">
          Enter retirement income by year. Amounts are used as entered with no cost-of-living adjustment until the
          last year; standard 3% inflation applies from that amount afterward.
        </p>

        <div className="mt-5 space-y-3">
          {draftAmounts.map((amount, index) => {
            const age = anchorAge + index;
            const isLast = index === draftAmounts.length - 1;
            return (
              <div key={index} className="flex items-center gap-2">
                <span className="w-10 shrink-0 text-sm font-semibold tabular-nums text-[#94a3b8]">{age}</span>
                <CurrencyAmountInput
                  id={`variable-income-${index}`}
                  className="h-12 min-w-0 flex-1"
                  value={amount}
                  onChange={(v) => updateRow(index, v)}
                  placeholder="85,000"
                />
                {isLast ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 shrink-0 rounded-none border-[#2a2a38]"
                    aria-label="Add another year"
                    onClick={addRow}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 shrink-0 rounded-none border-[#2a2a38]"
                    aria-label={`Remove age ${age}`}
                    onClick={() => removeRow(index)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-none border-[#2a2a38] text-[#94a3b8]"
            onClick={handleClear}
          >
            Clear variable income
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="h-12 rounded-none" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" className="h-12 rounded-none ap-cta-solid" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
