import { cn } from "@/lib/utils";
import { ROTH_VISUAL_COLORS } from "@/lib/roth-visual-theme";

type RothWorksheetIconProps = {
  className?: string;
};

/**
 * Stay-traditional (flat) vs Roth conversion (stepped ascent) — the core comparison
 * visualized as a compact chart mark with the wealth-delta fill between paths.
 */
export function RothWorksheetIcon({ className }: RothWorksheetIconProps) {
  const stay = ROTH_VISUAL_COLORS.stay;
  const roth = ROTH_VISUAL_COLORS.roth;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("relative z-10", className)}
    >
      <defs>
        <linearGradient id="roth-ws-delta" x1="4" y1="20" x2="20" y2="6" gradientUnits="userSpaceOnUse">
          <stop stopColor={roth} stopOpacity="0.06" />
          <stop offset="1" stopColor={roth} stopOpacity="0.32" />
        </linearGradient>
      </defs>

      {/* Chart frame */}
      <path
        d="M4 20V6"
        stroke={stay}
        strokeOpacity="0.35"
        strokeWidth="1"
        strokeLinecap="square"
      />

      {/* Wealth delta between paths */}
      <path
        d="M4 20H9V16H14V12H19V7H20V20H4Z"
        fill="url(#roth-ws-delta)"
      />

      {/* Stay-traditional baseline */}
      <path
        d="M4 20H20"
        stroke={stay}
        strokeWidth="1.75"
        strokeLinecap="square"
      />

      {/* Roth conversion — bracket-stepped ascent */}
      <path
        d="M4 20H9V16H14V12H19V7H20"
        stroke={roth}
        strokeWidth="2.25"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />

      {/* Endpoints */}
      <rect x="3" y="19" width="2" height="2" fill={stay} />
      <rect x="19" y="6" width="2" height="2" fill={roth} />
    </svg>
  );
}
