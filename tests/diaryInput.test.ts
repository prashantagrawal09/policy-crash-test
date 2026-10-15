import { describe, expect, it } from "vitest";
import { RESIDENTS } from "@/data/residents";
import { buildDiaryInput, cardStrings } from "@/lib/diaryInput";
import { runTown } from "@/lib/engine";
import { getPreset } from "@/lib/presets";

// The diary writer gets each resident's exact card strings (spec small call 8).

const fares = getPreset("fares-20")!;
const results = runTown(RESIDENTS, fares.levers);
const allIds = RESIDENTS.map((r) => r.id);
const input = buildDiaryInput({ policyText: fares.chip, residents: RESIDENTS, results, ids: allIds });

describe("diary input", () => {
  it("carries the policy, the town summary and the ids to write for", () => {
    expect(input).toContain("<policy>Bus and train fares rise 20%</policy>");
    expect(input).toContain("Town summary (all 8 residents): 2 feel it, 4 barely affected, 2 unaffected");
    expect(input).toContain("Residents to write for, one line each: lim, faizal, chloe, goh, raju, nurul, marcus, tan");
  });

  it("gives each resident the exact strings on their card", () => {
    expect(input).toContain(
      [
        "id: raju",
        "Name: Uncle Raju",
        "Age: 72",
        "Role: Retiree",
        "Everyday life: Lives alone on payouts and help from his children; takes the bus to the polyclinic.",
        "Household: 1 person, HDB 2-room flat",
        "Before the policy: Earns $1,300 a month, $100 spare each month",
        "Verdict: Feels it",
        "Change: −$12 a month",
        "Share of income: 0.9% of income",
        "Spare money: $12 = 12% of what's left each month",
      ].join("\n"),
    );
  });

  it("tells Unaffected residents their budget doesn't change", () => {
    expect(input).toContain("id: faizal");
    expect(input).toMatch(/id: faizal[\s\S]*?Verdict: Unaffected\nChange: none\. Their monthly budget does not change\./);
  });

  it("covers only the requested residents on a retry, with the whole-town summary", () => {
    const retry = buildDiaryInput({ policyText: fares.chip, residents: RESIDENTS, results, ids: ["chloe", "tan"] });
    expect(retry).toContain("Residents to write for, one line each: chloe, tan");
    expect(retry.match(/^id: /gm)).toHaveLength(2);
    expect(retry).toContain("2 feel it, 4 barely affected, 2 unaffected");
  });

  it("lists every card string a diary may quote", () => {
    const raju = results.find((r) => r.id === "raju")!;
    expect(cardStrings(RESIDENTS.find((r) => r.id === "raju")!, raju)).toEqual([
      "Earns $1,300 a month",
      "$100 spare each month",
      "Feels it",
      "−$12 a month",
      "0.9% of income",
      "$12 = 12% of what's left each month",
    ]);
  });
});
