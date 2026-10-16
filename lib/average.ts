import { verdict, type ResidentResult, type Verdict } from "@/lib/engine";
import { signedMoney } from "@/lib/format";
import type { Resident } from "@/lib/schemas";

// "Averages hide people" (scope.md > The Unique Kernel): the town's mean resident, judged by the
// same verdict rules as everyone else, set against who that average hides.

export interface AverageResident {
  monthly: number; // dollars a month
  oneOff: number; // dollars
  net: number; // dollars a month, one-offs spread over 12 months
  verdict: Verdict;
}

export function averageResident(results: ResidentResult[]): AverageResident {
  const mean = (pick: (r: ResidentResult) => number) => Math.round(results.reduce((sum, r) => sum + pick(r), 0) / results.length);
  const monthly = mean((r) => r.cents.monthly);
  const oneOff = mean((r) => r.cents.oneOff);
  return {
    monthly: monthly / 100,
    oneOff: oneOff / 100,
    net: (12 * monthly + oneOff) / 1200,
    verdict: verdict(monthly, oneOff, mean((r) => r.cents.income), mean((r) => r.cents.spare)),
  };
}

const ORDER: Verdict[] = ["hard_hit", "feels_it", "barely_affected", "better_off", "unaffected"];

function phrase(v: Verdict, who: string, one: boolean): string {
  switch (v) {
    case "hard_hit":
      return `${who} ${one ? "is" : "are"} hit hard`;
    case "feels_it":
      return `${who} ${one ? "feels" : "feel"} it`;
    case "barely_affected":
      return `${who} ${one ? "is" : "are"} barely affected`;
    case "better_off":
      return `${who} ${one ? "is" : "are"} better off`;
    case "unaffected":
      return `${who} ${one ? "isn't" : "aren't"} touched at all`;
  }
}

const AVERAGE_PHRASE: Record<Verdict, string> = {
  hard_hit: "is hit hard",
  feels_it: "feels it",
  barely_affected: "is barely affected",
  better_off: "is better off",
  unaffected: "isn't affected",
};

// "A", "A and B", "A, B and C"
const andList = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

export interface AverageStory {
  average: AverageResident;
  headline: string; // "The average resident is barely affected: −$28 a month."
  hidden: string; // "But Chloe and Uncle Raju feel it, and Faizal and Marcus aren't touched at all."
}

// Null when nobody is affected: there's nothing for the average to hide.
export function averageStory(residents: Resident[], results: ResidentResult[]): AverageStory | null {
  if (results.every((r) => r.verdict === "unaffected")) return null;
  const average = averageResident(results);
  const spread = average.oneOff !== 0 ? ", with one-offs spread over a year" : "";
  const headline = `The average resident ${AVERAGE_PHRASE[average.verdict]}: ${signedMoney(average.net)} a month${spread}.`;

  const name = (id: string) => residents.find((r) => r.id === id)?.shortName ?? id;
  const groups = ORDER.filter((v) => v !== average.verdict)
    .map((v) => ({ v, ids: results.filter((r) => r.verdict === v).map((r) => r.id) }))
    .filter((group) => group.ids.length > 0)
    .map(({ v, ids }) => phrase(v, ids.length > 3 ? `${ids.length} people` : andList(ids.map(name)), ids.length === 1));

  const hidden =
    groups.length === 0
      ? "This time the average tells the truth: everyone gets the same verdict."
      : `But ${groups.length === 1 ? groups[0] : `${groups.slice(0, -1).join(", ")}, and ${groups[groups.length - 1]}`}.`;
  return { average, headline, hidden };
}
