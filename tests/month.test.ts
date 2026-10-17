import { describe, expect, it } from "vitest";
import { RESIDENTS } from "@/data/residents";
import { runTown } from "@/lib/engine";
import { dayValueText, goneByDay, monthHeadline, spareOnDay } from "@/lib/month";
import { getPreset, PRESETS } from "@/lib/presets";

const town = (presetId: string) => runTown(RESIDENTS, getPreset(presetId)!.levers);
const of = (presetId: string, id: string) => town(presetId).find((r) => r.id === id)!;
const rows = (presetId: string) => RESIDENTS.map((resident) => ({ resident, result: of(presetId, resident.id) }));

describe("a month in the life", () => {
  it("under petrol, Faizal's spare money is gone by day 10 and he's $200 short on day 30", () => {
    const faizal = of("petrol-15", "faizal");
    expect(goneByDay(faizal)).toBe(10);
    expect(spareOnDay(faizal, 9)).toBeGreaterThan(0);
    expect(spareOnDay(faizal, 10)).toBe(0);
    expect(dayValueText(spareOnDay(faizal, 30))).toBe("$200 short");
    expect(goneByDay(of("petrol-15", "marcus"))).toBeNull();
  });

  it("drains Uncle Raju's $100 to $88 over the month under fares", () => {
    const raju = of("fares-20", "raju");
    expect(dayValueText(spareOnDay(raju, 0))).toBe("$100 left");
    expect(dayValueText(spareOnDay(raju, 15))).toBe("$94 left");
    expect(dayValueText(spareOnDay(raju, 30))).toBe("$88 left");
  });

  it("lands a one-off in full on day 1", () => {
    const chloe = of("one-off-300", "chloe");
    expect(spareOnDay(chloe, 0)).toBe(chloe.cents.spare);
    expect(spareOnDay(chloe, 1)).toBe(chloe.cents.spare + 30000);
  });

  it("ends day 30 at spare money plus the monthly change plus any one-off, for every preset", () => {
    for (const preset of PRESETS) {
      for (const result of town(preset.id)) {
        expect(spareOnDay(result, 30), `${preset.id} ${result.id}`).toBe(result.cents.spare + result.cents.monthly + result.cents.oneOff);
        if (result.cents.oneOff === 0) expect(spareOnDay(result, 30) / 100).toBeCloseTo(result.spareAfter, 6);
      }
    }
  });

  it("tells the month as it goes", () => {
    expect(monthHeadline(rows("petrol-15"), 0)).toBe("Payday. Press play to live through the month.");
    expect(monthHeadline(rows("petrol-15"), 9)).toBe("Day 9. Faizal is $90 down so far.");
    expect(monthHeadline(rows("petrol-15"), 10)).toBe("Day 10. Faizal's spare money is gone.");
    expect(monthHeadline(rows("petrol-15"), 30)).toBe("Day 30. Faizal ends the month $200 short.");
    // Petrol at +5% costs Faizal exactly his $100 spare.
    const petrol5 = [{ ...getPreset("petrol-15")!.levers[0], value: 5 }];
    const at5 = RESIDENTS.map((resident) => ({ resident, result: runTown(RESIDENTS, petrol5).find((r) => r.id === resident.id)! }));
    expect(monthHeadline(at5, 30)).toBe("Day 30. Faizal ends the month with nothing left.");
    expect(monthHeadline(rows("fares-20"), 30)).toBe("Day 30. Everyone makes it to the end of the month.");
    expect(monthHeadline(rows("fares-20"), 15)).toBe("Day 15. Chloe is $12 down so far.");
  });
});
