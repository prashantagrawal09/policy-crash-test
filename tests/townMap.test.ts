import { describe, expect, it } from "vitest";
import { RESIDENTS } from "@/data/residents";
import { runTown } from "@/lib/engine";
import { getPreset } from "@/lib/presets";
import { LEVER_TARGETS } from "@/lib/schemas";
import { coinRecipients, directionLabel, HOMES, LANDMARKS, litLandmarks, MAP_HEIGHT, MAP_WIDTH } from "@/lib/townMap";
import { lever } from "./helpers";

const litFor = (presetId: string) => Object.fromEntries(litLandmarks(getPreset(presetId)!.levers));

describe("town map", () => {
  it("gives every resident a home inside the map", () => {
    for (const resident of RESIDENTS) {
      const home = HOMES[resident.id];
      expect(home, resident.id).toBeDefined();
      expect(home.box.x + home.box.w).toBeLessThanOrEqual(MAP_WIDTH);
      expect(home.box.y + home.box.h).toBeLessThanOrEqual(MAP_HEIGHT);
      expect(home.pin.y).toBeLessThanOrEqual(home.box.y);
    }
  });

  it("keeps every place inside the map", () => {
    for (const { box } of Object.values(LANDMARKS)) {
      expect(box.x + box.w).toBeLessThanOrEqual(MAP_WIDTH);
      expect(box.y + box.h).toBeLessThanOrEqual(MAP_HEIGHT);
    }
  });

  it("lights the places each preset touches", () => {
    expect(litFor("fares-20")).toEqual({ mrt: "up", bus: "up" });
    expect(litFor("petrol-15")).toEqual({ petrol: "up" });
    expect(litFor("childcare-half")).toEqual({ childcare: "down" });
    expect(litFor("one-off-300")).toEqual({});
  });

  it("lights at least one place for every lever target", () => {
    for (const target of LEVER_TARGETS) {
      expect(litLandmarks([lever("percent_change", target, 5)]).size, target).toBeGreaterThan(0);
    }
  });

  it("marks a place whose costs move both ways as mixed", () => {
    const lit = litLandmarks([lever("percent_change", "food", 5), lever("percent_change", "all_taxable_spending", -1)]);
    expect(lit.get("hawker")).toBe("mixed");
    expect(lit.get("mrt")).toBe("down");
  });

  it("drops coins only on the residents who get a one-off", () => {
    expect(coinRecipients(runTown(RESIDENTS, getPreset("one-off-300")!.levers))).toEqual(["chloe", "raju"]);
    expect(coinRecipients(runTown(RESIDENTS, getPreset("fares-20")!.levers))).toEqual([]);
  });

  it("labels costs at shops and pay at the offices", () => {
    expect(directionLabel("mrt", "up")).toBe("Costs up");
    expect(directionLabel("offices", "down")).toBe("Pay down");
    expect(directionLabel("hawker", "mixed")).toBe("Costs change");
  });
});
