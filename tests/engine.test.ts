import { describe, expect, it } from "vitest";
import { RESIDENTS } from "@/data/residents";
import { effectivePercent, isEligible, runResident, runTown, spareMoney } from "@/lib/engine";
import { cardText, summaryLine } from "@/lib/format";
import { LeverSchema, type Lever } from "@/lib/schemas";
import { gain, lever, loss, person, resident } from "./helpers";

describe("spare money", () => {
  it("is income minus total spending for each resident", () => {
    expect(Object.fromEntries(RESIDENTS.map((r) => [r.id, spareMoney(r)]))).toEqual({
      lim: 1170, faizal: 100, chloe: 110, goh: 3800, raju: 100, nurul: 500, marcus: 1500, tan: 2470,
    });
  });
});

describe("eligibility", () => {
  it("treats age and income bounds as inclusive", () => {
    const chloe = resident("chloe"); // 21, earns $1,000
    expect(isEligible(chloe, { minAge: 21 })).toBe(true);
    expect(isEligible(chloe, { minAge: 22 })).toBe(false);
    expect(isEligible(chloe, { maxAge: 21 })).toBe(true);
    expect(isEligible(chloe, { maxAge: 20 })).toBe(false);
    expect(isEligible(chloe, { maxMonthlyIncome: 1000 })).toBe(true);
    expect(isEligible(chloe, { maxMonthlyIncome: 999.99 })).toBe(false);
    expect(isEligible(chloe, { minMonthlyIncome: 1000 })).toBe(true);
    expect(isEligible(chloe, { minMonthlyIncome: 1000.01 })).toBe(false);
  });

  it("matches housing types, children and any of the tags", () => {
    const hdb = { housingTypes: ["hdb_2_room", "hdb_3_room", "hdb_4_room"] as const };
    expect(isEligible(resident("raju"), { housingTypes: [...hdb.housingTypes] })).toBe(true);
    expect(isEligible(resident("tan"), { housingTypes: [...hdb.housingTypes] })).toBe(false);
    expect(isEligible(resident("marcus"), { mustHaveChildren: true })).toBe(true);
    expect(isEligible(resident("goh"), { mustHaveChildren: true })).toBe(false);
    expect(isEligible(resident("goh"), { mustHaveChildren: false })).toBe(true);
    expect(isEligible(resident("lim"), { tagsAny: ["senior", "student"] })).toBe(true);
    expect(isEligible(resident("tan"), { tagsAny: ["senior", "student"] })).toBe(false);
  });

  it("needs every rule given to pass, and treats empty lists as no rule", () => {
    expect(isEligible(resident("lim"), { minAge: 60, maxMonthlyIncome: 3000 })).toBe(false); // earns $3,200
    expect(isEligible(resident("lim"), {})).toBe(true);
    expect(isEligible(resident("lim"), { housingTypes: [], tagsAny: [] })).toBe(true);
  });
});

describe("levers", () => {
  it("percent_change scales one category", () => {
    expect(runResident(resident("raju"), [lever("percent_change", "public_transport", 20)]).monthlyChange).toBe(-12);
  });

  it("applies every percent change to the pre-policy amount, so order never matters", () => {
    const a = runResident(resident("lim"), [lever("percent_change", "food", 10), lever("percent_change", "food", 20)]);
    const b = runResident(resident("lim"), [lever("percent_change", "food", 20), lever("percent_change", "food", 10)]);
    expect(a.monthlyChange).toBe(-210); // $70 + $140 on $700, not compounded
    expect(b).toEqual(a);
  });

  it("fixed_monthly_change adds to a category or to income", () => {
    expect(runResident(resident("raju"), [lever("fixed_monthly_change", "utilities", -50)]).monthlyChange).toBe(50);
    expect(runResident(resident("raju"), [lever("fixed_monthly_change", "income", 100)]).monthlyChange).toBe(100);
  });

  it("percent_change on income scales income", () => {
    expect(runResident(resident("chloe"), [lever("percent_change", "income", 5)]).monthlyChange).toBe(50);
  });

  it("keeps a one_off_payment separate from the monthly change", () => {
    const r = runResident(resident("chloe"), [lever("one_off_payment", "income", 300)]);
    expect(r).toMatchObject({ monthlyChange: 0, oneOff: 300, net: 25, spareBefore: 110, spareAfter: 135 });
  });

  it("treats a one-off rebate on a spending target as money in", () => {
    expect(runResident(resident("raju"), [lever("one_off_payment", "utilities", -120)]).oneOff).toBe(120);
  });

  it("expands all_taxable_spending to food, both transports, utilities and other", () => {
    // Mdm Lim: 700 + 150 + 0 + 180 + 500 = $1,530 taxable; housing and healthcare untouched.
    expect(runResident(resident("lim"), [lever("percent_change", "all_taxable_spending", 1)]).monthlyChange).toBe(-15.3);
  });

  it("applies a fixed amount on all taxable spending once, not once per category", () => {
    expect(runResident(resident("lim"), [lever("fixed_monthly_change", "all_taxable_spending", 10)]).monthlyChange).toBe(-10);
  });

  it("skips residents who fail a lever's eligibility", () => {
    const r = runResident(resident("lim"), [lever("one_off_payment", "income", 300, { maxMonthlyIncome: 3000 })]);
    expect(r.verdict).toBe("unaffected");
  });

  it("rounds each lever's effect to the cent", () => {
    // 3.33% of Chloe's $20 healthcare is 66.6 cents, rounded to 67.
    expect(runResident(resident("chloe"), [lever("percent_change", "healthcare", 3.33)]).monthlyChange).toBe(-0.67);
  });

  it("never takes a bill below $0", () => {
    expect(runResident(resident("raju"), [lever("percent_change", "utilities", -150)]).monthlyChange).toBe(120);
    expect(runResident(resident("raju"), [lever("fixed_monthly_change", "utilities", -500)]).monthlyChange).toBe(120);
  });
});

describe("verdict lines: landing exactly on a line keeps the milder verdict", () => {
  it("-1% of income", () => {
    const p = person(1000, 500);
    expect(runResident(p, loss(10)).verdict).toBe("barely_affected");
    expect(runResident(p, loss(10.01)).verdict).toBe("feels_it");
  });

  it("-5% of income", () => {
    const p = person(1000, 1000);
    expect(runResident(p, loss(50)).verdict).toBe("feels_it");
    expect(runResident(p, loss(50.01)).verdict).toBe("hard_hit");
  });

  it("-10% of spare money", () => {
    const p = person(10000, 100); // income lens stays below 1%
    expect(runResident(p, loss(10)).verdict).toBe("barely_affected");
    expect(runResident(p, loss(10.01)).verdict).toBe("feels_it");
  });

  it("-30% of spare money", () => {
    const p = person(10000, 100);
    expect(runResident(p, loss(30)).verdict).toBe("feels_it");
    expect(runResident(p, loss(30.01)).verdict).toBe("hard_hit");
  });

  it("+1% of income", () => {
    const p = person(1000, 500);
    expect(runResident(p, gain(10)).verdict).toBe("barely_affected");
    expect(runResident(p, gain(10.01)).verdict).toBe("better_off");
  });
});

describe("verdict rules", () => {
  it("is hard hit when spare money goes below zero", () => {
    expect(runResident(person(100000, 50), loss(60)).verdict).toBe("hard_hit"); // only 0.06% of income
  });

  it("judges gains on income alone: the spare-money lens only makes losses worse", () => {
    expect(runResident(person(100000, 50), gain(60)).verdict).toBe("barely_affected"); // +120% of spare
    expect(runResident(person(1000, 1000), loss(60)).verdict).toBe("hard_hit"); // income lens is the worse one
  });

  it("is Unaffected only when the monthly change and the one-off are both exactly 0", () => {
    const p = person(1000, 500);
    expect(runResident(p, []).verdict).toBe("unaffected");
    expect(runResident(p, loss(0.01)).verdict).toBe("barely_affected");
    // A monthly cost and a one-off that cancel out over a year still count as affected.
    expect(runResident(p, [...loss(25), lever("one_off_payment", "income", 300)]).verdict).toBe("barely_affected");
  });

  it("counts one-offs at value / 12 a month", () => {
    const p = person(1000, 500);
    expect(runResident(p, [lever("one_off_payment", "income", 120)]).verdict).toBe("barely_affected"); // exactly +1%
    expect(runResident(p, [lever("one_off_payment", "income", 120.12)]).verdict).toBe("better_off");
  });
});

describe("tax-rate changes (prd.md > Tax-Rate Changes)", () => {
  const gst = (from: number, to: number): Lever => ({ ...lever("tax_rate_change", "all_taxable_spending", to), fromRate: from });

  it("turn GST from 9% to 10% into a 0.917% price rise, not 11.1%", () => {
    expect(effectivePercent(gst(9, 10))).toBeCloseTo(0.9174, 4);
    const lim = runResident(resident("lim"), [gst(9, 10)]);
    expect(cardText(lim).bigNumber).toBe("−$14");
    expect(summaryLine(runTown(RESIDENTS, [gst(9, 10)]))).toBe("1 hit hard, 7 barely affected");
  });

  it("turn an income-tax rise into the take-home change", () => {
    const incomeTax: Lever = { ...lever("tax_rate_change", "income", 17, { minMonthlyIncome: 5000 }), fromRate: 15 };
    expect(effectivePercent(incomeTax)).toBeCloseTo(-2.3529, 4);
  });

  it("go the other way for a cut, and do nothing when the rate stays put", () => {
    expect(effectivePercent(gst(9, 8))).toBeLessThan(0);
    expect(runResident(resident("lim"), [gst(9, 9)]).verdict).toBe("unaffected");
  });

  it("need both rates", () => {
    expect(LeverSchema.safeParse(lever("tax_rate_change", "all_taxable_spending", 10)).success).toBe(false);
    expect(LeverSchema.safeParse(gst(9, 10)).success).toBe(true);
  });
});
