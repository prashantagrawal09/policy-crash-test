import type { ResidentResult } from "@/lib/engine";
import { effectivePercent } from "@/lib/engine";
import type { Lever } from "@/lib/schemas";

// Pure layout and logic for the town map (prd.md > Town Map). The map shows no numbers of its
// own: only which places a policy touches, which way costs move there, and who gets a one-off.

export type Landmark =
  | "mrt"
  | "bus"
  | "hawker"
  | "petrol"
  | "childcare"
  | "clinic"
  | "campus"
  | "power"
  | "mart"
  | "mall"
  | "offices"
  | "homes";

export type Direction = "up" | "down" | "mixed";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

// The scene is drawn in a 1000 × 440 box.
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 440;

export const LANDMARKS: Record<Exclude<Landmark, "homes">, { label: string; box: Box }> = {
  mrt: { label: "MRT station", box: { x: 26, y: 46, w: 150, h: 70 } },
  hawker: { label: "Hawker centre", box: { x: 22, y: 210, w: 160, h: 88 } },
  bus: { label: "Bus stop", box: { x: 190, y: 246, w: 66, h: 80 } },
  offices: { label: "Offices", box: { x: 912, y: 90, w: 80, h: 208 } },
  petrol: { label: "Petrol station", box: { x: 16, y: 344, w: 116, h: 90 } },
  childcare: { label: "Childcare centre", box: { x: 140, y: 344, w: 116, h: 90 } },
  clinic: { label: "Polyclinic", box: { x: 264, y: 344, w: 116, h: 90 } },
  campus: { label: "University", box: { x: 388, y: 344, w: 116, h: 90 } },
  power: { label: "Power and water", box: { x: 512, y: 344, w: 104, h: 90 } },
  mart: { label: "Supermarket", box: { x: 624, y: 344, w: 104, h: 90 } },
  mall: { label: "Mall", box: { x: 736, y: 344, w: 140, h: 90 } },
};

// Each resident's home, and where their pin stands (the pin's tip, on the roof).
export const HOMES: Record<string, { label: string; box: Box; pin: { x: number; y: number } }> = {
  lim: { label: "Blk 21, 3-room", box: { x: 264, y: 140, w: 66, h: 158 }, pin: { x: 297, y: 136 } },
  raju: { label: "Blk 22, 2-room", box: { x: 338, y: 190, w: 58, h: 108 }, pin: { x: 367, y: 186 } },
  nurul: { label: "Blk 23, 3-room", box: { x: 404, y: 150, w: 66, h: 148 }, pin: { x: 437, y: 146 } },
  faizal: { label: "Blk 24, 4-room", box: { x: 520, y: 120, w: 70, h: 178 }, pin: { x: 555, y: 116 } },
  chloe: { label: "Family home", box: { x: 600, y: 222, w: 72, h: 76 }, pin: { x: 636, y: 214 } },
  goh: { label: "Rented flat", box: { x: 682, y: 166, w: 62, h: 132 }, pin: { x: 713, y: 162 } },
  tan: { label: "Rented room", box: { x: 754, y: 206, w: 58, h: 92 }, pin: { x: 783, y: 202 } },
  marcus: { label: "Condo", box: { x: 828, y: 70, w: 74, h: 228 }, pin: { x: 865, y: 66 } },
  // An empty plot by the MRT station until you move in (prd.md > Add Yourself).
  you: { label: "Your place", box: { x: 196, y: 74, w: 58, h: 60 }, pin: { x: 225, y: 72 } },
};

// Where each kind of spending happens in town.
export const TARGET_LANDMARKS: Record<Lever["target"], Landmark[]> = {
  housing: ["homes"],
  food: ["hawker", "mart"],
  public_transport: ["mrt", "bus"],
  private_transport: ["petrol"],
  utilities: ["power"],
  healthcare: ["clinic"],
  childcare: ["childcare"],
  education: ["campus"],
  other: ["mall"],
  income: ["offices"],
  all_taxable_spending: ["hawker", "mart", "mrt", "bus", "petrol", "power", "mall"],
};

// The places a policy's monthly changes touch, and which way costs (or pay, at the offices) move.
// One-off payments light no place; they drop coins on whoever gets them instead.
export function litLandmarks(levers: Lever[]): Map<Landmark, Direction> {
  const lit = new Map<Landmark, Direction>();
  for (const lever of levers) {
    const change = effectivePercent(lever);
    if (lever.kind === "one_off_payment" || change === 0) continue;
    const direction: Direction = change > 0 ? "up" : "down";
    for (const landmark of TARGET_LANDMARKS[lever.target]) {
      const before = lit.get(landmark);
      lit.set(landmark, before && before !== direction ? "mixed" : direction);
    }
  }
  return lit;
}

// The tag over a lit place: costs at shops and services, pay at the offices.
export function directionLabel(landmark: Landmark, direction: Direction): string {
  const subject = landmark === "offices" ? "Pay" : "Costs";
  if (direction === "mixed") return `${subject} change`;
  return `${subject} ${direction}`;
}

// Residents who get a one-off payment: coins drop over their pins.
export function coinRecipients(results: ResidentResult[]): string[] {
  return results.filter((r) => r.cents.oneOff > 0).map((r) => r.id);
}
