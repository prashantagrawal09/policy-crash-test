import { effectivePercent, runResident, type Verdict } from "@/lib/engine";
import { money, signedMoney, VERDICT_LABELS } from "@/lib/format";
import type { Lever, Resident } from "@/lib/schemas";

// What-if sliders and tipping points (prd.md > What-if Sliders and Tipping Points). All of this
// re-runs the tested engine; nothing here makes up a number.

export interface SliderSpec {
  min: number;
  max: number;
  step: number;
}

// Whole steps (1% or $1), wide enough to explore and always containing the policy's own value.
export function sliderSpec(lever: Lever): SliderSpec {
  const size = Math.abs(lever.value);
  if (lever.kind === "percent_change") {
    const reach = Math.max(100, Math.ceil((size * 2) / 10) * 10);
    return { min: Math.min(-100, lever.value), max: reach, step: 1 };
  }
  if (lever.kind === "tax_rate_change") {
    // The new rate, in half-point steps.
    return { min: 0, max: Math.max(30, Math.ceil(lever.value * 2)), step: 0.5 };
  }
  if (lever.kind === "one_off_payment") {
    const reach = Math.max(1000, Math.ceil((size * 3) / 100) * 100);
    return { min: Math.min(0, lever.value), max: reach, step: 1 };
  }
  const reach = Math.max(500, Math.ceil((size * 3) / 50) * 50);
  return { min: -reach, max: reach, step: 1 };
}

export function withValue(levers: Lever[], index: number, value: number): Lever[] {
  return levers.map((lever, i) => (i === index ? { ...lever, value } : lever));
}

// "+22%", "−$50 a month", "$300 one-off"
export function formatLeverValue(lever: Lever, value: number): string {
  if (lever.kind === "percent_change") return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value)}%`;
  if (lever.kind === "one_off_payment") return `${money(value)} one-off`;
  if (lever.kind === "tax_rate_change") return `${value}% rate`;
  return `${signedMoney(value)} a month`;
}

export interface TippingPoint {
  verdict: Verdict;
  at: number;
  label: string; // "Feels it from +22%"
}

// For a single-change policy: the first value, pushing further in the policy's own direction,
// at which this resident's verdict changes. Null if it never changes within the slider's reach.
export function tippingPoint(resident: Resident, levers: Lever[]): TippingPoint | null {
  if (levers.length !== 1) return null;
  const [lever] = levers;
  const now = runResident(resident, levers).verdict;
  const { min, max, step } = sliderSpec(lever);
  // Push further the way the policy goes: for a tax rate, the way its rate moves.
  const direction = (lever.kind === "tax_rate_change" ? effectivePercent(lever) : lever.value) < 0 ? -step : step;
  for (let value = lever.value + direction; direction > 0 ? value <= max : value >= min; value += direction) {
    const verdict = runResident(resident, withValue(levers, 0, value)).verdict;
    if (verdict !== now) return { verdict, at: value, label: `${VERDICT_LABELS[verdict]} from ${formatLeverValue(lever, value)}` };
  }
  return null;
}
