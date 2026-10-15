import type { ResidentResult } from "@/lib/engine";
import { cardText, incomeText, money, summaryLine } from "@/lib/format";
import type { HousingType, Resident } from "@/lib/schemas";

// Builds the diary writer's input: one block per requested resident with the exact strings
// their card shows, plus the policy and the town summary (so Unaffected residents can
// notice who is affected). The diary prompt never takes numbers from the browser.

const HOUSING: Record<HousingType, string> = {
  hdb_2_room: "HDB 2-room flat",
  hdb_3_room: "HDB 3-room flat",
  hdb_4_room: "HDB 4-room flat",
  condo: "condo",
  renting: "rented home",
  with_parents: "lives with parents",
};

// Every string the resident's card shows, before and after the run.
export function cardStrings(resident: Resident, result: ResidentResult): string[] {
  const card = cardText(result);
  return [
    incomeText(resident.income),
    `${money(result.spareBefore)} spare each month`,
    card.verdictLabel,
    card.bigNumber ? `${card.bigNumber}${card.bigPerMonth ? " a month" : ""}` : null,
    card.oneOffChip,
    card.monthlyEquivalent,
    card.incomeLine,
    card.spareLine,
  ].filter((s): s is string => Boolean(s));
}

export function residentBlock(resident: Resident, result: ResidentResult): string {
  const card = cardText(result);
  const lines = [
    `id: ${resident.id}`,
    `Name: ${resident.name}`,
    `Age: ${resident.ageLabel ?? resident.age}`,
    `Role: ${resident.role}`,
    `Everyday life: ${resident.everydayLine}`,
    `Household: ${resident.householdSize} ${resident.householdSize === 1 ? "person" : "people"}, ${HOUSING[resident.housingType]}`,
    `Before the policy: ${incomeText(resident.income)}, ${money(result.spareBefore)} spare each month`,
    `Verdict: ${card.verdictLabel}`,
  ];
  if (result.verdict === "unaffected") {
    lines.push("Change: none. Their monthly budget does not change.");
  } else {
    lines.push(`Change: ${card.bigNumber}${card.bigPerMonth ? " a month" : ""}`);
    if (card.oneOffChip) lines.push(`One-off: ${card.oneOffChip}`);
    if (card.monthlyEquivalent) lines.push(`Spread out: ${card.monthlyEquivalent}`);
    lines.push(`Share of income: ${card.incomeLine}`);
    lines.push(`Spare money: ${card.spareLine}`);
    // Given so the writer never has to do sums: every number it can state comes from the engine.
    if (result.cents.monthly !== 0) {
      const after = (result.cents.spare + result.cents.monthly) / 100;
      lines.push(`Spare money after: ${after < 0 ? `none, ${money(after)} short each month` : `${money(after)} a month`}`);
    }
  }
  return lines.join("\n");
}

export function buildDiaryInput(args: {
  policyText: string;
  residents: Resident[];
  results: ResidentResult[]; // all 8, for the town summary
  ids: string[]; // the residents to write for (all 8, or the missing ones on a retry)
}): string {
  const { policyText, residents, results, ids } = args;
  const blocks = ids.map((id) => {
    const resident = residents.find((r) => r.id === id);
    const result = results.find((r) => r.id === id);
    if (!resident || !result) throw new Error(`Unknown resident ${id}`);
    return residentBlock(resident, result);
  });

  return [
    `<policy>${policyText}</policy>`,
    `Town summary (all ${results.length} residents): ${summaryLine(results)}`,
    `Residents to write for, one line each: ${ids.join(", ")}`,
    "",
    blocks.join("\n\n"),
  ].join("\n");
}
