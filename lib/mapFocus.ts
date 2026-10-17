import type { ResidentResult } from "@/lib/engine";
import type { Lever, Resident } from "@/lib/schemas";
import { gatherings, type Point } from "@/lib/townLife";
import { LANDMARKS, litLandmarks } from "@/lib/townMap";

// The phone map follows the action (prd.md > Phone Map Follows the Action): where to centre the
// map's scroll frame, in map units across (0–1000), and how far to scroll for it.

const middle = (xs: number[]) => (Math.min(...xs) + Math.max(...xs)) / 2;

// When a policy lands: the middle of where the people it reaches gather, or, if it reaches nobody,
// the middle of the places it lights. Null when there's nothing to look at.
export function policyFocusX(residents: Resident[], levers: Lever[], results: ResidentResult[]): number | null {
  const people = Object.values(gatherings(residents, levers, results)).map((g) => g.point.x);
  if (people.length > 0) return middle(people);
  const places = [...litLandmarks(levers).keys()].flatMap((landmark) => {
    if (landmark === "homes") return [];
    const { box } = LANDMARKS[landmark];
    return [box.x + box.w / 2];
  });
  return places.length > 0 ? middle(places) : null;
}

// During the chatter: between the speaker and the listener.
export function talkFocusX(speaker: Point, listener: Point | undefined): number {
  return listener ? (speaker.x + listener.x) / 2 : speaker.x;
}

// The scroll position that puts `focusPx` in the middle of the frame, kept within the map.
export function scrollLeftFor(focusPx: number, contentPx: number, viewportPx: number): number {
  return Math.round(Math.min(Math.max(focusPx - viewportPx / 2, 0), Math.max(contentPx - viewportPx, 0)));
}
