import { describe, expect, it } from "vitest";
import { RESIDENTS } from "@/data/residents";
import { buildChatterInput, isValidRemark } from "@/lib/chatterInput";
import { cardStrings } from "@/lib/diaryInput";
import { runTown } from "@/lib/engine";
import { getPreset } from "@/lib/presets";

const inputFor = (presetId: string) => {
  const preset = getPreset(presetId)!;
  const results = runTown(RESIDENTS, preset.levers);
  return { input: buildChatterInput({ policyText: preset.chip, levers: preset.levers, residents: RESIDENTS, results }), results };
};

describe("the chatter input", () => {
  it("carries the policy and every resident's exact card strings", () => {
    const { input, results } = inputFor("fares-20");
    expect(input).toContain("<policy>Bus and train fares rise 20%</policy>");
    for (const resident of RESIDENTS) {
      const result = results.find((r) => r.id === resident.id)!;
      for (const text of cardStrings(resident, result)) expect(input, `${resident.id}: ${text}`).toContain(text);
    }
  });

  it("says where people are, matching where the living town walks them", () => {
    const { input } = inputFor("fares-20");
    expect(input).toContain("chloe: at the MRT station");
    expect(input).toContain("raju: at the bus stop");
    expect(input).toContain("faizal: going about their day");
    expect(inputFor("petrol-15").input).toContain("marcus: at the petrol station");
    expect(inputFor("one-off-300").input).toContain("raju: at home");
  });
});

describe("remarks", () => {
  const ids = RESIDENTS.map((r) => r.id);

  it("need a speaker and a listener from the town who aren't the same person", () => {
    expect(isValidRemark({ speaker: "chloe", listener: "goh", text: "Hi" }, ids)).toBe(true);
    expect(isValidRemark({ speaker: "chloe", listener: "chloe", text: "Hi" }, ids)).toBe(false);
    expect(isValidRemark({ speaker: "mayor", listener: "goh", text: "Hi" }, ids)).toBe(false);
  });
});
