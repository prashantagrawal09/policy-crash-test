import { describe, expect, it } from "vitest";
import { RESIDENTS } from "@/data/residents";
import { runTown } from "@/lib/engine";
import { cardText } from "@/lib/format";
import { getPreset } from "@/lib/presets";
import { formatLeverValue, sliderSpec, tippingPoint, withValue } from "@/lib/whatIf";
import { lever, resident } from "./helpers";

const fares = getPreset("fares-20")!.levers;
const tipFor = (id: string, levers = fares) => tippingPoint(resident(id), levers)?.label ?? null;

describe("what-if sliders", () => {
  it("have ranges that hold the policy's own value", () => {
    expect(sliderSpec(fares[0])).toEqual({ min: -100, max: 100, step: 1 });
    expect(sliderSpec(lever("one_off_payment", "income", 300))).toEqual({ min: 0, max: 1000, step: 1 });
    expect(sliderSpec(lever("fixed_monthly_change", "utilities", -50))).toEqual({ min: -500, max: 500, step: 1 });
    expect(sliderSpec(lever("percent_change", "food", 150))).toMatchObject({ max: 300 });
  });

  it("re-run the engine: fares at +35% give the engine's numbers on the cards", () => {
    const results = runTown(RESIDENTS, withValue(fares, 0, 35));
    const raju = cardText(results.find((r) => r.id === "raju")!);
    expect(raju).toMatchObject({ bigNumber: "−$21", spareLine: "$21 = 21% of what's left each month" });
  });

  it("describe values the way the cards do", () => {
    expect(formatLeverValue(fares[0], 22)).toBe("+22%");
    expect(formatLeverValue(lever("fixed_monthly_change", "utilities", -50), -50)).toBe("−$50 a month");
    expect(formatLeverValue(lever("one_off_payment", "income", 300), 450)).toBe("$450 one-off");
  });
});

describe("tipping points", () => {
  it("under fares: Nurul and Mdm Lim are two points from feeling it", () => {
    expect(tipFor("nurul")).toBe("Feels it from +22%");
    expect(tipFor("lim")).toBe("Feels it from +22%");
  });

  it("under fares: Chloe and Uncle Raju would be hit hard further up", () => {
    expect(tipFor("chloe")).toBe("Hard hit from +28%");
    expect(tipFor("raju")).toBe("Hard hit from +51%");
  });

  it("never tip people the policy can't reach", () => {
    expect(tipFor("faizal")).toBeNull();
    expect(tipFor("marcus")).toBeNull();
  });

  it("follow a cut downward, and payouts upward", () => {
    expect(tipFor("marcus", getPreset("childcare-half")!.levers)).toBeNull();
    expect(tipFor("lim", getPreset("one-off-300")!.levers)).toBeNull(); // she earns too much to qualify
    // Food -5% saves Tan $45 (0.69% of $6,500); a cut past 7.2% takes him over +1%.
    expect(tipFor("tan", [lever("percent_change", "food", -5)])).toBe("Better off from \u22128%");
  });

  it("only apply to policies with a single change", () => {
    expect(tippingPoint(resident("lim"), [...fares, lever("percent_change", "food", 5)])).toBeNull();
  });
});
