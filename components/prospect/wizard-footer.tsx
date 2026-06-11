"use client";

import { Button } from "@/components/ui/button";

type Props = {
  onBack: () => void;
  onNext: () => void;
  backDisabled?: boolean;
  nextDisabled?: boolean;
  nextLabel: string;
};

export function WizardFooter({ onBack, onNext, backDisabled, nextDisabled, nextLabel }: Props) {
  return (
    <>
      {/* Mobile sticky footer */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#1e1e2e] ap-glass pb-safe md:hidden">
        <div className="mx-auto flex max-w-4xl gap-3 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1 touch-manipulation rounded-none border-[#2a2a38]"
            disabled={backDisabled}
            onClick={onBack}
          >
            Back
          </Button>
          <Button
            type="button"
            className="h-12 flex-1 touch-manipulation rounded-none ap-cta-solid"
            disabled={nextDisabled}
            onClick={onNext}
          >
            {nextLabel}
          </Button>
        </div>
      </div>

      {/* Desktop inline footer — unchanged from original */}
      <div className="hidden flex-wrap items-center justify-between gap-3 border-t border-[#1e1e2e] pt-6 md:flex">
        <Button
          type="button"
          variant="outline"
          className="h-12 rounded-none border-[#2a2a38]"
          disabled={backDisabled}
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          type="button"
          className="h-12 min-w-[8rem] rounded-none ap-cta-solid"
          disabled={nextDisabled}
          onClick={onNext}
        >
          {nextLabel}
        </Button>
      </div>
    </>
  );
}
