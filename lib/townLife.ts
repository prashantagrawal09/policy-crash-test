import { runResident, type ResidentResult } from "@/lib/engine";
import type { Lever, Resident } from "@/lib/schemas";
import { HOMES, LANDMARKS, TARGET_LANDMARKS, type Landmark } from "@/lib/townMap";

// The living town (prd.md > Living Town): where each resident spends the day, how they walk
// there along the streets, and where they go when a policy lands. Pure, so it can be tested.

export interface Point {
  x: number;
  y: number;
}

export const HOUR_MS = 1250; // a whole day passes in 30 seconds
export const WALK_SPEED = 0.32; // map units per millisecond
const STREET_Y = 318; // the main road, where everyone walks between places
const LANE_X = 186; // the path up between the hawker centre and the bus stop, to the MRT

type Place = Exclude<Landmark, "homes">;

// Each resident's usual place, and the hours they're out there, from their everyday lines.
export const DAY: Record<string, { place: Place; out: number; back: number }> = {
  lim: { place: "hawker", out: 5, back: 16 }, // the noodle stall, after the dawn market
  faizal: { place: "petrol", out: 7, back: 21 }, // long driving shifts
  chloe: { place: "campus", out: 8, back: 17 },
  goh: { place: "offices", out: 8, back: 18 },
  raju: { place: "clinic", out: 9, back: 12 }, // a morning at the polyclinic
  nurul: { place: "clinic", out: 13, back: 23 }, // a late hospital shift
  marcus: { place: "offices", out: 8, back: 19 },
  tan: { place: "offices", out: 9, back: 18 },
};

// Who takes the bus and who takes the MRT, from their everyday lines.
const TRANSPORT_STOP: Record<string, "mrt" | "bus"> = {
  lim: "bus",
  faizal: "bus",
  chloe: "mrt",
  goh: "mrt",
  raju: "bus",
  nurul: "bus",
  marcus: "mrt",
  tan: "mrt",
};

// Where people stand at each place: the first spot, then each next one this far along.
const below = (place: Place) => ({ x: LANDMARKS[place].box.x + 26, y: 342, step: 32 });
const SPOTS: Record<Place, { x: number; y: number; step: number }> = {
  mrt: { x: 60, y: 170, step: 34 },
  hawker: { x: 52, y: 300, step: 34 },
  bus: { x: 214, y: 300, step: 30 },
  offices: { x: 884, y: 300, step: 34 },
  petrol: below("petrol"),
  childcare: below("childcare"),
  clinic: below("clinic"),
  campus: below("campus"),
  power: below("power"),
  mart: below("mart"),
  mall: below("mall"),
};

const spot = (place: Place, slot: number): Point => ({ x: SPOTS[place].x + slot * SPOTS[place].step, y: SPOTS[place].y });

// The way from a point down to the main road: straight down, or round by the lane from the MRT.
function toStreet(p: Point): Point[] {
  if (p.x < LANE_X && p.y < 290) return [{ x: LANE_X, y: p.y }, { x: LANE_X, y: STREET_Y }];
  return [{ x: p.x, y: STREET_Y }];
}

// Out to the street, along it, and in: so walkers follow the roads instead of floating over roofs.
export function walk(from: Point, to: Point): Point[] {
  const path = [from, ...toStreet(from), ...toStreet(to).reverse(), to];
  return path.filter((p, i) => i === 0 || p.x !== path[i - 1].x || p.y !== path[i - 1].y);
}

// Where someone is at a given hour of the day (0–23) when nothing has happened.
export function whereAt(residentId: string, hour: number): Point {
  const { place, out, back } = DAY[residentId];
  if (hour < out || hour >= back) return HOMES[residentId].pin;
  const slot = Object.keys(DAY).filter((id) => DAY[id].place === place).indexOf(residentId);
  return spot(place, slot);
}

// How dark it is (0 day, 1 deep night), hour by hour.
export function darkness(hour: number): number {
  if (hour >= 7 && hour < 18) return 0;
  if (hour === 6 || hour === 18) return 0.35;
  if (hour === 5 || hour === 19) return 0.7;
  return 1;
}

export function clockLabel(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? "am" : "pm"}`;
}

// The place behind a change, for this resident.
function placeFor(residentId: string, lever: Lever): Landmark {
  if (lever.kind === "one_off_payment" || lever.target === "housing") return "homes";
  if (lever.target === "public_transport") return TRANSPORT_STOP[residentId];
  if (lever.target === "all_taxable_spending") return "mart";
  return TARGET_LANDMARKS[lever.target][0];
}

export interface Gathering {
  place: Landmark; // "homes" means they react at home (coins land there)
  point: Point;
}

// When a policy lands, everyone it touches goes to the place behind the change that moves their
// money most (each change run through the engine on its own). Unaffected residents carry on.
export function gatherings(residents: Resident[], levers: Lever[], results: ResidentResult[]): Record<string, Gathering> {
  const taken: Partial<Record<Place, number>> = {};
  const out: Record<string, Gathering> = {};
  for (const resident of residents) {
    const result = results.find((r) => r.id === resident.id);
    if (!result || result.verdict === "unaffected") continue;
    let biggest: { lever: Lever; size: number } | null = null;
    for (const lever of levers) {
      const size = Math.abs(runResident(resident, [lever]).net);
      if (size > 0 && (!biggest || size > biggest.size)) biggest = { lever, size };
    }
    if (!biggest) continue;
    const place = placeFor(resident.id, biggest.lever);
    if (place === "homes") {
      out[resident.id] = { place, point: HOMES[resident.id].pin };
    } else {
      const slot = taken[place] ?? 0;
      taken[place] = slot + 1;
      out[resident.id] = { place, point: spot(place, slot) };
    }
  }
  return out;
}
