import { cn } from "@/lib/utils";

type FormFieldProps = {
  id: string;
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
};

export function FormField({ id, label, hint, className, children }: FormFieldProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-[#94a3b8]">
        {label}
      </label>
      {hint ? <p className="mt-1 text-xs text-[#94a3b8]">{hint}</p> : null}
      <div className="mt-2">{children}</div>
    </div>
  );
}
