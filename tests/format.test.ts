import { describe, expect, it } from "vitest";
import { RESIDENTS } from "@/data/residents";
import { runResident, runTown } from "@/lib/engine";
import { cardText, money, percent, signedMoney, summaryBeforeRun, summaryLine } from "@/lib/format";
import { PRESETS } from "@/lib/presets";
import { lever, loss, person, resident } from "./helpers";

describe("percentages", () => {
  it("round toward zero to one decimal, so a shown number never crosses a line the real one didn't", () => {
    expect(percent(40, 4200)).toBe("0.9%"); // Nurul's 0.952%, not "1.0%"
    expect(percent(-24, 110)).toBe("21.8%");
    expect(percent(300, 5200)).toBe("5.7%"); // 5.769%
  });

  it("drop a trailing .0", () => {
    expect(percent(12, 100)).toBe("12%");
    expect(percent(400, 500)).toBe("80%");
  });

  it("are exact where floating point would slip", () => {
    expect(percent(29, 100)).toBe("29%"); // 0.29 * 100 is 28.999... in floating point
    expect(percent(7, 100)).toBe("7%");
  });
});

describe("money", () => {
  it("shows whole dollars with separators and a real minus sign", () => {
    expect(money(3200)).toBe("$3,200");
    expect(money(12.5)).toBe("$13");
    expect(signedMoney(-12)).toBe("−$12");
    expect(signedMoney(400)).toBe("+$400");
    expect(signedMoney(0)).toBe("$0");
  });

  it("keeps the cents on a change under $1, so a real change never reads $0", () => {
    expect(money(0.2)).toBe("$0.20");
    const card = cardText(runResident(resident("chloe"), [lever("percent_change", "healthcare", 1)]));
    expect(card.bigNumber).toBe("−$0.20");
  });
});

describe("card lines never show a percentage over 100%", () => {
  const largestPercent = (text: string) =>
    Math.max(0, ...[...text.matchAll(/([\d.]+)%/g)].map((match) => Number(match[1])));

  it("for any preset card", () => {
    for (const preset of PRESETS) {
      for (const result of runTown(RESIDENTS, preset.levers)) {
        const text = cardText(result);
        expect(largestPercent(`${text.incomeLine} ${text.spareLine}`)).toBeLessThanOrEqual(100);
      }
    }
  });

  it("when a loss is bigger than the spare money or the whole income", () => {
    const card = cardText(runResident(person(1000, 500), loss(1500)));
    expect(card.incomeLine).toBe("More than a month's income");
    expect(card.spareLine).toBe("Eats all $500 spare, $1,000 short each month");
  });

  it("when a gain is bigger than the spare money", () => {
    const card = cardText(runResident(person(1000, 100), [lever("fixed_monthly_change", "income", 150)]));
    expect(card.spareLine).toBe("Spare money goes from $100 to $250 a month");
  });

  it("when a one-off spread over a year is bigger than the spare money", () => {
    const card = cardText(runResident(person(1000, 100), [lever("one_off_payment", "income", 3000)]));
    expect(card.spareLine).toBe("Spread over a year: spare money goes from $100 to $350 a month");
  });
});

describe("mixed policies", () => {
  it("show the monthly change as the big number and the one-off as a chip", () => {
    const card = cardText(runResident(person(1000, 500), [...loss(10), lever("one_off_payment", "income", 300)]));
    expect(card).toMatchObject({ bigNumber: "−$10", bigPerMonth: true, oneOffChip: "+$300 one-off" });
  });
});

describe("summary line", () => {
  it("before any run invites a policy", () => {
    expect(summaryBeforeRun(8)).toBe("8 residents. Pick a policy to crash-test the town.");
  });

  it("says nobody's budget changes when all 8 are Unaffected", () => {
    expect(summaryLine(runTown(RESIDENTS, []))).toBe("Nobody's monthly budget changes");
  });

  it("uses the singular for one person", () => {
    const results = [runResident(person(1000, 500), loss(20)), runResident(person(1000, 500), [])];
    expect(summaryLine(results)).toBe("1 feels it, 1 unaffected");
  });
});
