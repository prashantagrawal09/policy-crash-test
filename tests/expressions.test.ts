import { describe, expect, it } from "vitest";
import { RESIDENTS } from "@/data/residents";
import { runTown, type Verdict } from "@/lib/engine";
import { expressionFor, expressionLabel, VERDICT_EXPRESSION } from "@/lib/expressions";
import { getPreset } from "@/lib/presets";

// The diary prompt's rule 4: which moods fit which verdict.
const MOODS_THAT_FIT: Record<Verdict, string[]> = {
  better_off: ["happy", "relieved"],
  barely_affected: ["neutral"],
  unaffected: ["neutral"],
  feels_it: ["worried"],
  hard_hit: ["stressed"],
};

const facesFor = (presetId: string) =>
  Object.fromEntries(runTown(RESIDENTS, getPreset(presetId)!.levers).map((r) => [r.id, expressionFor(r.verdict)]));

describe("character expressions", () => {
  it("are calm before any run", () => {
    expect(expressionFor(null)).toBe("neutral");
  });

  it("follow the verdict with a face that fits the diary rules", () => {
    for (const [verdict, face] of Object.entries(VERDICT_EXPRESSION)) {
      expect(MOODS_THAT_FIT[verdict as Verdict]).toContain(face);
    }
  });

  it("switch to the diary's own mood once it lands", () => {
    expect(expressionFor("better_off", "relieved")).toBe("relieved");
    expect(expressionFor("hard_hit", "stressed")).toBe("stressed");
  });

  it("flip between fares and petrol the way the demo shows", () => {
    expect(facesFor("fares-20")).toMatchObject({ chloe: "worried", raju: "worried", faizal: "neutral", marcus: "neutral" });
    expect(facesFor("petrol-15")).toMatchObject({ faizal: "stressed", marcus: "worried", chloe: "neutral", raju: "neutral" });
    expect(facesFor("childcare-half")).toMatchObject({ faizal: "happy", nurul: "happy", marcus: "neutral" });
  });

  it("are described in words for screen readers", () => {
    expect(expressionLabel("Uncle Raju", "worried")).toBe("Uncle Raju, looking worried");
    expect(expressionLabel("Tan Wei Jie", "neutral")).toBe("Tan Wei Jie, looking calm");
  });
});
