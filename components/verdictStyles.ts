import type { Verdict } from "@/lib/engine";

// Verdict colours (spec.md small call 13). Dark text on the amber and grey badges keeps them readable.
export const VERDICT_STYLES: Record<Verdict, { band: string; badge: string; swatch: string; tint: string }> = {
  better_off: { band: "bg-better", badge: "bg-better text-white", swatch: "bg-better", tint: "bg-better/[0.06]" },
  barely_affected: { band: "bg-barely", badge: "bg-barely text-ink", swatch: "bg-barely", tint: "bg-barely/[0.06]" },
  feels_it: { band: "bg-feels", badge: "bg-feels text-ink", swatch: "bg-feels", tint: "bg-feels/[0.08]" },
  hard_hit: { band: "bg-hard", badge: "bg-hard text-white", swatch: "bg-hard", tint: "bg-hard/[0.07]" },
  unaffected: {
    band: "bg-transparent",
    badge: "border border-ink/40 text-ink/70",
    swatch: "border border-ink/40",
    tint: "bg-white",
  },
};
