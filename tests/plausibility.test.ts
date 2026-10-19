import { describe, expect, it } from "vitest";
import { shownConfidence, tooLarge } from "@/lib/plausibility";
import { PRESETS } from "@/lib/presets";
import type { Lever } from "@/lib/schemas";
import { lever } from "./helpers";

describe("the reality check on AI readings", () => {
  it("flags broad price changes beyond ±5%", () => {
    expect(tooLarge([lever("percent_change", "all_taxable_spending", 5)])).toEqual([]);
    expect(tooLarge([lever("percent_change", "all_taxable_spending", 5.5)])).toEqual(["a 5.5% change to prices across the board"]);
    expect(tooLarge([lever("percent_change", "all_taxable_spending", -6)])).toHaveLength(1);
  });

  it("flags the GST misreading but not the correct reading", () => {
    expect(tooLarge([lever("percent_change", "all_taxable_spending", 11.1)])).toEqual(["a 11.1% change to prices across the board"]);
    const gst: Lever = { ...lever("tax_rate_change", "all_taxable_spending", 10), fromRate: 9 };
    expect(tooLarge([gst])).toEqual([]);
  });

  it("flags income changes beyond ±20% and any change beyond ±30%", () => {
    expect(tooLarge([lever("percent_change", "income", -20)])).toEqual([]);
    expect(tooLarge([lever("percent_change", "income", -21)])).toEqual(["a 21% change to income"]);
    expect(tooLarge([lever("percent_change", "food", 30)])).toEqual([]);
    expect(tooLarge([lever("percent_change", "food", 100)])).toEqual(["a 100% change"]);
  });

  it("leaves fixed amounts and one-offs alone", () => {
    expect(tooLarge([lever("fixed_monthly_change", "utilities", -500), lever("one_off_payment", "income", 5000)])).toEqual([]);
  });

  it("caps the confidence shown at low when it fires", () => {
    expect(shownConfidence("high", [lever("percent_change", "food", 100)])).toBe("low");
    expect(shownConfidence("high", [lever("percent_change", "food", 10)])).toBe("high");
  });

  it("also flags a typed halving: a second look is cheap even when the reading is right", () => {
    // Presets never go through this check; only typed policies do.
    const halved = PRESETS.find((p) => p.id === "childcare-half")!.levers;
    expect(tooLarge(halved)).toEqual(["a 50% change"]);
    expect(PRESETS.filter((p) => p.id !== "childcare-half").flatMap((p) => tooLarge(p.levers))).toEqual([]);
  });
});
