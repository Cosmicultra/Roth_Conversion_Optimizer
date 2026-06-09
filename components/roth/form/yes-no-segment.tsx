import { cn } from "@/lib/utils";
import { segmentOptionClassName, segmentShellClassName } from "@/components/roth/form/segment-styles";

type YesNoSegmentProps = {
  value: boolean | null;
  onChange: (value: boolean) => void;
  label?: string;
  hint?: string;
  yesLabel?: string;
  noLabel?: string;
  width?: "md" | "full";
  className?: string;
};

export function YesNoSegment({
  value,
  onChange,
  label,
  hint,
  yesLabel = "Yes",
  noLabel = "No",
  width = "md",
  className,
}: YesNoSegmentProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label ? <p className="text-sm text-[#94a3b8]">{label}</p> : null}
      {hint ? <p className="text-xs text-[#94a3b8]">{hint}</p> : null}
      <div
        role="radiogroup"
        aria-label={label ?? "Yes or no"}
        className={segmentShellClassName(width)}
      >
        <button
          type="button"
          role="radio"
          aria-checked={value === true}
          onClick={() => onChange(true)}
          className={segmentOptionClassName(value === true, true)}
        >
          {yesLabel}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={value === false}
          onClick={() => onChange(false)}
          className={segmentOptionClassName(value === false, false)}
        >
          {noLabel}
        </button>
      </div>
    </div>
  );
}
