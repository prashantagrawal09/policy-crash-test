import type { ResidentResult } from "@/lib/engine";
import { money } from "@/lib/format";
import type { Resident } from "@/lib/schemas";

// A month in the life (prd.md > A Month in the Life): each resident's spare money, day by day,
// as the policy's monthly change adds up. A simplification, said on screen: the change is spread
// evenly over 30 days, and a one-off lands in full on day 1. Every value comes from the engine's cents.

export const DAYS = 30;

// Spare money in cents after `day` days (0 = payday, before anything has changed).
export function spareOnDay(result: ResidentResult, day: number): number {
  const { spare, monthly, oneOff } = result.cents;
  return spare + (monthly * day) / DAYS + (day >= 1 ? oneOff : 0);
}

// The first day spare money is all gone (0 if there was none to begin with), or null if it lasts.
// Exact: compares 30 × cents, so no rounding decides the day.
export function goneByDay(result: ResidentResult): number | null {
  const { spare, monthly, oneOff } = result.cents;
  if (spare <= 0) return 0;
  for (let day = 1; day <= DAYS; day++) {
    if (DAYS * (spare + oneOff) + monthly * day <= 0) return day;
  }
  return null;
}

// "$88 left" or "$200 short".
export function dayValueText(cents: number): string {
  return cents < 0 ? `${money(-cents / 100)} short` : `${money(cents / 100)} left`;
}

const joinNames = (names: string[]) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

// The line above the month: the day's most important moment.
export function monthHeadline(rows: { resident: Resident; result: ResidentResult }[], day: number): string {
  if (day === 0) return "Payday. Press play to live through the month.";
  const gone = rows.filter(({ result }) => {
    const gd = goneByDay(result);
    return gd !== null && gd > 0 && gd <= day && result.verdict !== "unaffected";
  });
  if (day === DAYS && gone.length === 1) {
    const end = spareOnDay(gone[0].result, DAYS);
    return `Day ${DAYS}. ${gone[0].resident.shortName} ends the month ${end < 0 ? dayValueText(end) : "with nothing left"}.`;
  }
  if (day === DAYS && gone.length > 1) return `Day ${DAYS}. ${joinNames(gone.map((r) => r.resident.shortName))} end the month short.`;
  if (gone.length === 1) return `Day ${day}. ${gone[0].resident.shortName}'s spare money is gone.`;
  if (gone.length > 1) return `Day ${day}. ${joinNames(gone.map((r) => r.resident.shortName))} have run out of spare money.`;
  if (day === DAYS) return `Day ${DAYS}. Everyone makes it to the end of the month.`;

  // Otherwise, whoever has lost the biggest share of their spare money so far.
  const losers = rows.filter(({ result }) => result.cents.monthly < 0 && result.cents.spare > 0);
  if (losers.length === 0) return `Day ${day}.`;
  const worst = losers.reduce((a, b) => (b.result.cents.monthly / b.result.cents.spare < a.result.cents.monthly / a.result.cents.spare ? b : a));
  const lost = Math.abs(worst.result.cents.monthly * day) / DAYS / 100;
  return `Day ${day}. ${worst.resident.shortName} is ${money(lost)} down so far.`;
}
