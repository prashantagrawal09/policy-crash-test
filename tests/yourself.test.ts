import { describe, expect, it } from "vitest";
import { RESIDENTS } from "@/data/residents";
import { runResident, runTown } from "@/lib/engine";
import { cardText } from "@/lib/format";
import { getPreset, PRESETS } from "@/lib/presets";
import { buildYou, startingAnswers, TEMPLATES, YourAnswersSchema, type YourAnswers } from "@/lib/yourself";

const you = (templateId: string, changes: Partial<YourAnswers> = {}) => buildYou({ ...startingAnswers(templateId), ...changes });

// Your card under a preset, with you living in town alongside the 8.
function yourCard(templateId: string, presetId: string, changes: Partial<YourAnswers> = {}) {
  const me = you(templateId, changes);
  const result = runTown([...RESIDENTS, me], getPreset(presetId)!.levers).find((r) => r.id === "you")!;
  const card = cardText(result);
  return { verdict: card.verdictLabel, bigNumber: card.bigNumber };
}

describe("moving in", () => {
  it("makes you resident #9 from your answers, called You unless you say otherwise", () => {
    const me = you("worker");
    expect(me).toMatchObject({ id: "you", name: "You", shortName: "You", income: 4200, housingType: "renting", tags: ["renter"] });
    expect(you("worker", { name: "Priya Nair" })).toMatchObject({ name: "Priya Nair", initials: "PN" });
  });

  it("only counts car costs with a car and childcare with children", () => {
    const spending = { ...startingAnswers("worker").spending, private_transport: 300, childcare: 500 };
    expect(you("worker", { spending }).budget).toMatchObject({ private_transport: 0, childcare: 0 });
    expect(you("worker", { spending, car: true, children: true, peopleAtHome: 3 }).budget).toMatchObject({ private_transport: 300, childcare: 500 });
    expect(you("worker", { car: true, children: true, peopleAtHome: 3 }).tags).toEqual(["has_children", "car_user", "renter"]);
    expect(you("retiree").tags).toEqual(["senior"]);
  });

  it("turns away answers that don't make sense", () => {
    const base = startingAnswers("worker");
    expect(YourAnswersSchema.safeParse({ ...base, age: 9 }).success).toBe(false);
    expect(YourAnswersSchema.safeParse({ ...base, income: -100 }).success).toBe(false);
    expect(YourAnswersSchema.safeParse({ ...base, name: "<b>hi</b>" }).success).toBe(false);
    expect(YourAnswersSchema.safeParse({ ...base, children: true, peopleAtHome: 1 }).success).toBe(false);
    expect(YourAnswersSchema.safeParse({ ...base, look: { ...base.look, hair: "mohawk" } }).success).toBe(false);
    for (const template of TEMPLATES) expect(YourAnswersSchema.safeParse(startingAnswers(template.id)).success, template.id).toBe(true);
  });
});

describe("your card under each preset", () => {
  it("as a young worker: fares cost you $24 a month, and the rest miss you", () => {
    expect(yourCard("worker", "fares-20")).toEqual({ verdict: "Barely affected", bigNumber: "−$24" });
    expect(yourCard("worker", "one-off-300")).toEqual({ verdict: "Unaffected", bigNumber: null }); // earns over $3,000
    expect(yourCard("worker", "petrol-15")).toEqual({ verdict: "Unaffected", bigNumber: null }); // no car
    expect(yourCard("worker", "childcare-half")).toEqual({ verdict: "Unaffected", bigNumber: null });
  });

  it("as a parent: half-price childcare is worth $350 a month", () => {
    expect(yourCard("family", "childcare-half")).toEqual({ verdict: "Better off", bigNumber: "+$350" });
    expect(yourCard("family", "fares-20")).toEqual({ verdict: "Barely affected", bigNumber: "−$40" });
  });

  it("as a retiree: you get the $300 payout, and a car would put you under at the pump", () => {
    expect(yourCard("retiree", "one-off-300")).toEqual({ verdict: "Better off", bigNumber: "+$300 one-off" });
    const spending = { ...startingAnswers("retiree").spending, private_transport: 300 };
    expect(yourCard("retiree", "petrol-15", { car: true, spending })).toEqual({ verdict: "Hard hit", bigNumber: "−$45" });
  });

  it("matches the engine for every preset and template, and leaves the 8 exactly as they were", () => {
    for (const preset of PRESETS) {
      const without = runTown(RESIDENTS, preset.levers);
      for (const template of TEMPLATES) {
        const me = you(template.id);
        const town = runTown([...RESIDENTS, me], preset.levers);
        expect(town).toHaveLength(9);
        expect(town.slice(0, 8)).toEqual(without);
        expect(town[8]).toEqual(runResident(me, preset.levers));
      }
    }
  });
});
