import { cn } from "@/lib/utils";
import { segmentOptionClassName, segmentShellClassName } from "@/components/roth/form/segment-styles";

export type OptionSegmentItem<T extends string> = {
  value: T;
  label: string;
};

type OptionSegmentProps<T extends string> = {
  value: T | null;
  options: OptionSegmentItem<T>[];
  onChange: (value: T) => void;
  label?: string;
  hint?: string;
  ariaLabel?: string;
  width?: "md" | "full";
  className?: string;
};

export function OptionSegment<T extends string>({
  value,
  options,
  onChange,
  label,
  hint,
  ariaLabel,
  width = "md",
  className,
}: OptionSegmentProps<T>) {
  return (
    <div className={cn("space-y-2", className)}>
      {label ? <p className="text-sm text-[#94a3b8]">{label}</p> : null}
      {hint ? <p className="text-xs text-[#94a3b8]">{hint}</p> : null}
      <div
        role="radiogroup"
        aria-label={ariaLabel ?? label ?? "Choose an option"}
        className={segmentShellClassName(width)}
      >
        {options.map((option, index) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={segmentOptionClassName(value === option.value, index === 0)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
