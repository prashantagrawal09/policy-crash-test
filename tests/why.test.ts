import { describe, expect, it } from "vitest";
import { RESIDENTS } from "@/data/residents";
import { runResident } from "@/lib/engine";
import { getPreset, PRESETS } from "@/lib/presets";
import { whyFor } from "@/lib/why";
import { resident } from "./helpers";

const why = (presetId: string, id: string) => {
  const levers = getPreset(presetId)!.levers;
  return whyFor(resident(id), runResident(resident(id), levers), levers);
};

describe("the Why? drawer", () => {
  it("shows Uncle Raju's bus and MRT going from $60 to $72, and spare money deciding his verdict", () => {
    const raju = why("fares-20", "raju");
    expect(raju.spending.find((line) => line.changed)).toEqual({ label: "Bus and MRT", before: 60, after: 72, changed: true });
    expect(raju.checks.income).toMatchObject({ share: "0.9%", lens: "barely_affected" });
    expect(raju.checks.spare).toMatchObject({ share: "12%", lens: "feels_it", rule: "more than 10% of spare money" });
    expect(raju.checks.decidedBy).toBe("spare");
    expect([raju.spareBefore, raju.spareAfter]).toEqual([100, 88]);
  });

  it("shows Nurul's $40 staying under the spare-money line, so income decides", () => {
    const nurul = why("fares-20", "nurul");
    expect(nurul.checks.spare).toMatchObject({ share: "8%", lens: null, rule: "under 10% of spare money" });
    expect(nurul.checks.decidedBy).toBe("income");
  });

  it("says why a policy misses someone", () => {
    expect(why("one-off-300", "lim").reach[0]).toMatchObject({ applies: false, reason: "Earns $3,200, over $3,000" });
    expect(why("petrol-15", "chloe").reach[0]).toMatchObject({ applies: false, reason: "Spends nothing on car" });
    expect(why("childcare-half", "marcus").reach[0]).toMatchObject({ applies: false, reason: "Spends nothing on childcare" });
    expect(why("childcare-half", "tan").reach[0]).toMatchObject({ applies: false, reason: "No children at home" });
    expect(why("petrol-15", "faizal").reach[0]).toMatchObject({ applies: true, reason: "−$300 a month" });
    expect(why("one-off-300", "chloe").reach[0]).toMatchObject({ applies: true, reason: "+$300 one-off" });
  });

  it("names both checks when they agree, and none when nothing changes", () => {
    expect(why("petrol-15", "faizal").checks.decidedBy).toBe("both");
    expect(why("petrol-15", "lim").checks.decidedBy).toBeNull();
  });

  it("adds up to the card's monthly change for every resident under every preset", () => {
    for (const preset of PRESETS) {
      for (const person of RESIDENTS) {
        const result = runResident(person, preset.levers);
        const w = whyFor(person, result, preset.levers);
        const cents = Math.round((w.income.after - w.income.before - (w.totalAfter - w.totalBefore)) * 100);
        expect(cents, `${preset.id} ${person.id}`).toBe(result.cents.monthly);
        expect(Math.round((w.spareAfter - w.spareBefore) * 100)).toBe(result.cents.monthly);
        expect(w.spending.reduce((sum, line) => sum + Math.round(line.after * 100), 0) + Math.round(w.taxableFixed * 100)).toBe(Math.round(w.totalAfter * 100));
      }
    }
  });
});
