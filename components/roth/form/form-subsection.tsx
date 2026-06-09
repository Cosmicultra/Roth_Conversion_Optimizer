import { cn } from "@/lib/utils";

type FormSubsectionProps = {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
};

export function FormSubsection({ title, description, className, children }: FormSubsectionProps) {
  return (
    <div className={cn("mt-1 space-y-4 border-t border-[#1e1e2e] pt-5", className)}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">{title}</p>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-[#94a3b8]">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
