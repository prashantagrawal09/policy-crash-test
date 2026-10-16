import { describe, expect, it } from "vitest";
import { RESIDENTS } from "@/data/residents";
import { runTown } from "@/lib/engine";
import { getPreset } from "@/lib/presets";
import { clockLabel, darkness, DAY, gatherings, walk, whereAt } from "@/lib/townLife";
import { HOMES, MAP_HEIGHT, MAP_WIDTH } from "@/lib/townMap";
import { lever } from "./helpers";

const placesFor = (presetId: string) => {
  const levers = getPreset(presetId)!.levers;
  const found = gatherings(RESIDENTS, levers, runTown(RESIDENTS, levers));
  return Object.fromEntries(Object.entries(found).map(([id, g]) => [id, g.place]));
};

describe("the living town", () => {
  it("gives everyone a usual place inside the map, and has them home at night", () => {
    for (const resident of RESIDENTS) {
      expect(DAY[resident.id], resident.id).toBeDefined();
      for (let hour = 0; hour < 24; hour++) {
        const point = whereAt(resident.id, hour);
        expect(point.x).toBeGreaterThan(20);
        expect(point.x).toBeLessThan(MAP_WIDTH - 20);
        expect(point.y).toBeLessThanOrEqual(MAP_HEIGHT);
      }
      expect(whereAt(resident.id, 3)).toEqual(HOMES[resident.id].pin);
    }
  });

  it("sends Chloe to the university by day and Uncle Raju to the polyclinic in the morning", () => {
    expect(whereAt("chloe", 12)).toEqual({ x: 414, y: 342 });
    expect(whereAt("raju", 10)).toEqual({ x: 290, y: 342 });
    expect(whereAt("raju", 14)).toEqual(HOMES.raju.pin);
  });

  it("walks along the street rather than over roofs, and up the lane to the MRT", () => {
    expect(walk({ x: 300, y: 120 }, { x: 600, y: 342 })).toEqual([
      { x: 300, y: 120 },
      { x: 300, y: 318 },
      { x: 600, y: 318 },
      { x: 600, y: 342 },
    ]);
    expect(walk({ x: 636, y: 214 }, { x: 60, y: 170 })).toEqual([
      { x: 636, y: 214 },
      { x: 636, y: 318 },
      { x: 186, y: 318 },
      { x: 186, y: 170 },
      { x: 60, y: 170 },
    ]);
  });

  it("turns day into night and tells the time", () => {
    expect([darkness(12), darkness(18), darkness(19), darkness(23)]).toEqual([0, 0.35, 0.7, 1]);
    expect([clockLabel(0), clockLabel(9), clockLabel(12), clockLabel(21)]).toEqual(["12 am", "9 am", "12 pm", "9 pm"]);
  });

  it("sends fare-payers to their own stop: Chloe to the MRT, Uncle Raju to the bus stop", () => {
    expect(placesFor("fares-20")).toEqual({ lim: "bus", chloe: "mrt", goh: "mrt", raju: "bus", nurul: "bus", tan: "mrt" });
  });

  it("sends Faizal and Marcus to the petrol station under petrol", () => {
    expect(placesFor("petrol-15")).toEqual({ faizal: "petrol", marcus: "petrol" });
  });

  it("sends parents to the childcare centre, and payout recipients home for their coins", () => {
    expect(placesFor("childcare-half")).toEqual({ faizal: "childcare", nurul: "childcare" });
    expect(placesFor("one-off-300")).toEqual({ chloe: "homes", raju: "homes" });
  });

  it("follows the change that moves each person's money most", () => {
    // Food +10% costs Marcus $180 but petrol +5% only $60, so he goes to the hawker centre.
    const levers = [lever("percent_change", "private_transport", 5), lever("percent_change", "food", 10)];
    const found = gatherings(RESIDENTS, levers, runTown(RESIDENTS, levers));
    expect(found.marcus.place).toBe("hawker");
  });

  it("never puts two people on the same spot", () => {
    const levers = getPreset("fares-20")!.levers;
    const points = Object.values(gatherings(RESIDENTS, levers, runTown(RESIDENTS, levers))).map((g) => `${g.point.x},${g.point.y}`);
    expect(new Set(points).size).toBe(points.length);
  });
});
