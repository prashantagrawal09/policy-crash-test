import { effectivePercent } from "@/lib/engine";
import type { Lever, ParseResult } from "@/lib/schemas";

// A reality check on the AI's reading of a typed policy (prd.md > Tax-Rate Changes): tested code,
// not the model, flags changes that look too large, so a misreading is caught even if the prompt
// misses it. Presets are hand-checked and never pass through here.

export const LIMITS = { broadPrices: 5, anyChange: 30, income: 20 }; // percent, either way

// Why each percentage change looks too large ("Beyond …" lines would cross the limit).
export function tooLarge(levers: Lever[]): string[] {
  const reasons: string[] = [];
  for (const lever of levers) {
    if (lever.kind !== "percent_change" && lever.kind !== "tax_rate_change") continue;
    const size = Math.abs(effectivePercent(lever));
    const shown = `${Math.round(size * 10) / 10}%`;
    if (lever.target === "all_taxable_spending" && size > LIMITS.broadPrices) reasons.push(`a ${shown} change to prices across the board`);
    else if (lever.target === "income" && size > LIMITS.income) reasons.push(`a ${shown} change to income`);
    else if (size > LIMITS.anyChange) reasons.push(`a ${shown} change`);
  }
  return reasons;
}

// The confidence to show: never above low when something looks too large.
export function shownConfidence(confidence: ParseResult["confidence"], levers: Lever[]): ParseResult["confidence"] {
  return tooLarge(levers).length > 0 ? "low" : confidence;
}
