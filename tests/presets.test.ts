import { describe, expect, it } from "vitest";
import { RESIDENTS } from "@/data/residents";
import { runTown } from "@/lib/engine";
import { cardText, chartRows, leverText, SPILL_MAX, spareBar, summaryLine } from "@/lib/format";
import { PRESETS, getPreset } from "@/lib/presets";
import { PresetFileSchema } from "@/lib/schemas";

// prd.md > Expected Preset Results, card by card.

function run(presetId: string) {
  const preset = getPreset(presetId);
  if (!preset) throw new Error(`No preset ${presetId}`);
  const results = runTown(RESIDENTS, preset.levers);
  return {
    summary: summaryLine(results),
    verdicts: Object.fromEntries(results.map((r) => [r.id, r.verdict])),
    card: (id: string) => cardText(results.find((r) => r.id === id)!),
  };
}

const UNAFFECTED = { verdictLabel: "Unaffected", bigNumber: null, incomeLine: null, spareLine: null };

describe("preset files", () => {
  it("are the 4 chips, in order, and each passes the lever schema", () => {
    expect(PRESETS.map((p) => p.chip)).toEqual([
      "Bus and train fares rise 20%",
      "$300 one-off payout for adults earning under $3,000 a month",
      "Petrol prices rise 15%",
      "Childcare fees cut by half for working parents",
    ]);
    for (const preset of PRESETS) expect(PresetFileSchema.safeParse(preset).success).toBe(true);
  });

  it("give identical numbers every run", () => {
    for (const preset of PRESETS) expect(runTown(RESIDENTS, preset.levers)).toEqual(runTown(RESIDENTS, preset.levers));
  });
});

describe("Bus and train fares rise 20%", () => {
  const { summary, verdicts, card } = run("fares-20");

  it("summary", () => expect(summary).toBe("2 feel it, 4 barely affected, 2 unaffected"));

  it("verdicts", () =>
    expect(verdicts).toEqual({
      lim: "barely_affected", faizal: "unaffected", chloe: "feels_it", goh: "barely_affected",
      raju: "feels_it", nurul: "barely_affected", marcus: "unaffected", tan: "barely_affected",
    }));

  it("Chloe feels it", () =>
    expect(card("chloe")).toMatchObject({
      verdictLabel: "Feels it", bigNumber: "−$24", incomeLine: "2.4% of income",
      spareLine: "$24 = 21.8% of what's left each month",
    }));

  it("Uncle Raju feels it", () =>
    expect(card("raju")).toMatchObject({
      verdictLabel: "Feels it", bigNumber: "−$12", incomeLine: "0.9% of income",
      spareLine: "$12 = 12% of what's left each month",
    }));

  it("Nurul is barely affected", () =>
    expect(card("nurul")).toMatchObject({
      verdictLabel: "Barely affected", bigNumber: "−$40", incomeLine: "0.9% of income",
      spareLine: "$40 = 8% of what's left each month",
    }));

  it("Mdm Lim, the Gohs and Tan Wei Jie are barely affected", () => {
    expect(card("lim")).toMatchObject({
      verdictLabel: "Barely affected", bigNumber: "−$30", incomeLine: "0.9% of income",
      spareLine: "$30 = 2.5% of what's left each month",
    });
    expect(card("goh")).toMatchObject({
      verdictLabel: "Barely affected", bigNumber: "−$80", incomeLine: "0.8% of income",
      spareLine: "$80 = 2.1% of what's left each month",
    });
    expect(card("tan")).toMatchObject({
      verdictLabel: "Barely affected", bigNumber: "−$36", incomeLine: "0.5% of income",
      spareLine: "$36 = 1.4% of what's left each month",
    });
  });

  it("Faizal and Marcus are unaffected", () => {
    expect(card("faizal")).toMatchObject(UNAFFECTED);
    expect(card("marcus")).toMatchObject(UNAFFECTED);
  });
});

describe("Petrol prices rise 15%", () => {
  const { summary, verdicts, card } = run("petrol-15");

  it("summary", () => expect(summary).toBe("1 hit hard, 1 feels it, 6 unaffected"));

  it("verdicts", () =>
    expect(verdicts).toEqual({
      lim: "unaffected", faizal: "hard_hit", chloe: "unaffected", goh: "unaffected",
      raju: "unaffected", nurul: "unaffected", marcus: "feels_it", tan: "unaffected",
    }));

  it("Faizal is hit hard and runs short", () =>
    expect(card("faizal")).toMatchObject({
      verdictLabel: "Hard hit", bigNumber: "−$300", incomeLine: "5.7% of income",
      spareLine: "Eats all $100 spare, $200 short each month",
    }));

  it("Marcus feels it", () =>
    expect(card("marcus")).toMatchObject({
      verdictLabel: "Feels it", bigNumber: "−$180", incomeLine: "1.6% of income",
      spareLine: "$180 = 12% of what's left each month",
    }));

  it("Chloe and Uncle Raju are unaffected", () => {
    expect(card("chloe")).toMatchObject(UNAFFECTED);
    expect(card("raju")).toMatchObject(UNAFFECTED);
  });
});

describe("$300 one-off payout for adults earning under $3,000 a month", () => {
  const { summary, verdicts, card } = run("one-off-300");

  it("summary", () => expect(summary).toBe("2 better off, 6 unaffected"));

  it("verdicts", () =>
    expect(verdicts).toEqual({
      lim: "unaffected", faizal: "unaffected", chloe: "better_off", goh: "unaffected",
      raju: "better_off", nurul: "unaffected", marcus: "unaffected", tan: "unaffected",
    }));

  it("Chloe is better off", () =>
    expect(card("chloe")).toMatchObject({
      verdictLabel: "Better off", bigNumber: "+$300 one-off", bigPerMonth: false, bigIsGain: true,
      monthlyEquivalent: "About $25 a month over a year", incomeLine: "about 2.5% of income",
      spareLine: "Spread over a year: 22.7% more spare money each month",
    }));

  it("Uncle Raju is better off", () =>
    expect(card("raju")).toMatchObject({
      verdictLabel: "Better off", bigNumber: "+$300 one-off",
      monthlyEquivalent: "About $25 a month over a year", incomeLine: "about 1.9% of income",
      spareLine: "Spread over a year: 25% more spare money each month",
    }));

  it("Mdm Lim (earns $3,200) is unaffected", () => expect(card("lim")).toMatchObject(UNAFFECTED));
});

describe("Childcare fees cut by half for working parents", () => {
  const { summary, verdicts, card } = run("childcare-half");

  it("summary", () => expect(summary).toBe("2 better off, 6 unaffected"));

  it("verdicts", () =>
    expect(verdicts).toEqual({
      lim: "unaffected", faizal: "better_off", chloe: "unaffected", goh: "unaffected",
      raju: "unaffected", nurul: "better_off", marcus: "unaffected", tan: "unaffected",
    }));

  it("Faizal is better off, by more than his spare money", () =>
    expect(card("faizal")).toMatchObject({
      verdictLabel: "Better off", bigNumber: "+$200", bigIsGain: true, incomeLine: "3.8% of income",
      spareLine: "Spare money goes from $100 to $300 a month",
    }));

  it("Nurul is better off", () =>
    expect(card("nurul")).toMatchObject({
      verdictLabel: "Better off", bigNumber: "+$400", incomeLine: "9.5% of income",
      spareLine: "+$400 = 80% more spare money each month",
    }));

  it("Marcus (teenagers, no childcare) is unaffected", () => expect(card("marcus")).toMatchObject(UNAFFECTED));
});

describe("chart, spare-money bars and panel for the presets", () => {
  const rowsFor = (presetId: string) => chartRows(runTown(RESIDENTS, getPreset(presetId)!.levers));
  const barFor = (presetId: string, id: string) =>
    spareBar(runTown(RESIDENTS, getPreset(presetId)!.levers).find((r) => r.id === id)!);

  it("every chart amount matches its card's number", () => {
    for (const preset of PRESETS) {
      const results = runTown(RESIDENTS, preset.levers);
      const rows = chartRows(results);
      results.forEach((result, i) => {
        const card = cardText(result);
        if (result.verdict === "unaffected") expect(rows[i].label).toBe("$0");
        else if (card.bigPerMonth) expect(rows[i].label).toBe(card.bigNumber);
        else expect(card.monthlyEquivalent).toContain(rows[i].label.replace("+", ""));
      });
    }
  });

  it("the one-off preset shows striped +$25 bars for Chloe and Uncle Raju, and $0 for everyone else", () => {
    const rows = rowsFor("one-off-300");
    expect(rows.filter((r) => r.label !== "$0").map((r) => [r.id, r.label, r.monthly, r.oneOffShare])).toEqual([
      ["chloe", "+$25", 0, 25],
      ["raju", "+$25", 0, 25],
    ]);
  });

  it("Raju's fare bite crosses the 10% tick and Nurul's stops short", () => {
    expect(barFor("fares-20", "raju")).toMatchObject({ tone: "loss", keep: 88, solid: 12, striped: 0, tick: true });
    expect(barFor("fares-20", "nurul")).toMatchObject({ tone: "loss", keep: 92, solid: 8, striped: 0, tick: true });
  });

  it("Faizal's petrol bar fills red and spills into the hazard zone", () => {
    expect(barFor("petrol-15", "faizal")).toMatchObject({ tone: "loss", keep: 0, solid: 100, spill: SPILL_MAX });
  });

  it("gains extend the bar to the spare money after, with the added part shaded", () => {
    const nurul = barFor("childcare-half", "nurul"); // $500 -> $900
    expect(nurul.tone).toBe("gain");
    expect(nurul.keep).toBeCloseTo((500 / 900) * 100);
    expect(nurul.solid).toBeCloseTo((400 / 900) * 100);
    const chloe = barFor("one-off-300", "chloe"); // $110 + $25 one-off share, striped
    expect(chloe).toMatchObject({ tone: "gain", solid: 0 });
    expect(chloe.striped).toBeCloseTo((25 / 135) * 100);
  });

  it("Unaffected residents keep a full, unshaded bar", () => {
    expect(barFor("fares-20", "faizal")).toEqual({ keep: 100, solid: 0, striped: 0, tone: "none", spill: 0, tick: true });
  });

  it("the panel describes each preset's levers in plain English", () => {
    expect(PRESETS.map((p) => p.levers.map(leverText))).toEqual([
      ["Public transport fares go up 20%, for everyone"],
      ["A one-off payment of $300, for people aged 21 and over, earning up to $3,000 a month"],
      ["Private transport costs go up 15%, for everyone"],
      ["Childcare fees go down 50%, for parents"],
    ]);
  });
});
