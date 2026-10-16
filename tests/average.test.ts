import { describe, expect, it } from "vitest";
import { RESIDENTS } from "@/data/residents";
import { averageResident, averageStory } from "@/lib/average";
import { runTown } from "@/lib/engine";
import { getPreset } from "@/lib/presets";

const storyFor = (presetId: string) => averageStory(RESIDENTS, runTown(RESIDENTS, getPreset(presetId)!.levers));

describe("average vs. the people", () => {
  it("fares: the average resident is barely affected, but two feel it and two aren't touched", () => {
    expect(storyFor("fares-20")).toMatchObject({
      headline: "The average resident is barely affected: −$28 a month.",
      hidden: "But Chloe and Uncle Raju feel it, and Faizal and Marcus aren't touched at all.",
    });
  });

  it("petrol: the average resident feels it, but Faizal is hit hard and six aren't touched", () => {
    expect(storyFor("petrol-15")).toMatchObject({
      headline: "The average resident feels it: −$60 a month.",
      hidden: "But Faizal is hit hard, and 6 people aren't touched at all.",
    });
  });

  it("childcare: the average resident is better off, though only two gain", () => {
    expect(storyFor("childcare-half")).toMatchObject({
      headline: "The average resident is better off: +$75 a month.",
      hidden: "But 6 people aren't touched at all.",
    });
  });

  it("one-off: the average spreads the payout over a year", () => {
    const story = storyFor("one-off-300")!;
    expect(story.headline).toBe("The average resident is barely affected: +$6 a month, with one-offs spread over a year.");
    expect(story.hidden).toBe("But Chloe and Uncle Raju are better off, and 6 people aren't touched at all.");
  });

  it("uses the town's mean, judged by the engine's own verdict rules", () => {
    const average = averageResident(runTown(RESIDENTS, getPreset("fares-20")!.levers));
    expect(average).toMatchObject({ monthly: -27.75, oneOff: 0, verdict: "barely_affected" });
  });

  it("has nothing to say when nobody is affected", () => {
    expect(averageStory(RESIDENTS, runTown(RESIDENTS, []))).toBeNull();
  });
});
