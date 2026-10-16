import type { ResidentResult } from "@/lib/engine";
import { residentBlock } from "@/lib/diaryInput";
import { summaryLine } from "@/lib/format";
import type { ChatterLine, Lever, Resident } from "@/lib/schemas";
import { gatherings } from "@/lib/townLife";
import type { Landmark } from "@/lib/townMap";

// Builds the chatter writer's input (prd.md > Town Chatter): the policy, where each person is
// when it lands (the same places the living town walks them to), and every resident's block
// with the exact strings their card shows. No numbers come from the browser.

const WHERE: Record<Landmark, string> = {
  homes: "at home",
  mrt: "at the MRT station",
  bus: "at the bus stop",
  hawker: "at the hawker centre",
  petrol: "at the petrol station",
  childcare: "at the childcare centre",
  clinic: "at the polyclinic",
  campus: "at the university",
  power: "at the power and water office",
  mart: "at the supermarket",
  mall: "at the mall",
  offices: "at work in the offices",
};

export function buildChatterInput(args: {
  policyText: string;
  levers: Lever[];
  residents: Resident[];
  results: ResidentResult[];
}): string {
  const { policyText, levers, residents, results } = args;
  const gathered = gatherings(residents, levers, results);
  const whereabouts = residents.map((resident) => {
    const spot = gathered[resident.id];
    return `${resident.id}: ${spot ? WHERE[spot.place] : "going about their day"}`;
  });
  const blocks = residents.map((resident) => {
    const result = results.find((r) => r.id === resident.id);
    if (!result) throw new Error(`No result for ${resident.id}`);
    return residentBlock(resident, result);
  });

  return [
    `<policy>${policyText}</policy>`,
    `Town summary (all ${results.length} residents): ${summaryLine(results)}`,
    "",
    "Where people are when the news lands:",
    ...whereabouts,
    "",
    blocks.join("\n\n"),
  ].join("\n");
}

// A remark the app can show: a speaker and a listener from the town, who aren't the same person.
export function isValidRemark(remark: ChatterLine, ids: string[]): boolean {
  return ids.includes(remark.speaker) && ids.includes(remark.listener) && remark.speaker !== remark.listener;
}
