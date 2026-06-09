import { cn } from "@/lib/utils";

type FormSectionProps = {
  id?: string;
  step: string;
  title: string;
  description?: string;
  variant?: "elevated" | "panel";
  className?: string;
  children: React.ReactNode;
};

export function FormSection({
  id,
  step,
  title,
  description,
  variant = "panel",
  className,
  children,
}: FormSectionProps) {
  return (
    <div
      id={id}
      className={cn(
        "space-y-5 rounded-none border border-[#1e1e2e] border-l-2 border-l-[#3a3115] p-5 md:p-6",
        variant === "elevated" ? "bg-[#14141d]" : "bg-[#101017]",
        className
      )}
    >
      <div>
        <p className="ap-eyebrow">{step}</p>
        <h3 className="mt-1 text-sm font-semibold text-[#e2e8f0]">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-[#94a3b8]">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
