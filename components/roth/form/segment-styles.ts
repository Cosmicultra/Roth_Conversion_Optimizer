import { cn } from "@/lib/utils";

export function segmentShellClassName(width: "md" | "full" = "md") {
  return cn(
    "inline-flex h-12 w-full overflow-hidden rounded-none border border-[#2a2a38]",
    width === "md" ? "max-w-md" : "max-w-none"
  );
}

export function segmentOptionClassName(selected: boolean, isFirst: boolean) {
  return cn(
    "flex-1 text-sm font-semibold transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#fbbf24] focus-visible:ring-inset",
    !isFirst && "border-l border-[#2a2a38]",
    selected ? "bg-[#fbbf24] text-[#0c0c0f]" : "bg-[#14141d] text-[#94a3b8] hover:text-[#e2e8f0]"
  );
}
