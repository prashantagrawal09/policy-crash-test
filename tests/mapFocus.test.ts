import { describe, expect, it } from "vitest";
import { RESIDENTS } from "@/data/residents";
import { runTown } from "@/lib/engine";
import { policyFocusX, scrollLeftFor, talkFocusX } from "@/lib/mapFocus";
import { getPreset } from "@/lib/presets";
import type { Lever } from "@/lib/schemas";
import { LANDMARKS } from "@/lib/townMap";
import { lever } from "./helpers";

const focusFor = (levers: Lever[]) => policyFocusX(RESIDENTS, levers, runTown(RESIDENTS, levers));
const preset = (id: string) => focusFor(getPreset(id)!.levers);

describe("where the phone map looks", () => {
  it("centres on the people a policy reaches", () => {
    expect(preset("fares-20")).toBe(167); // the MRT crowd (60–128) and the bus stop queue (214–274)
    expect(preset("petrol-15")).toBe(58); // Faizal and Marcus at the pumps
    expect(preset("childcare-half")).toBe(182); // Faizal and Nurul at the childcare centre
    expect(preset("one-off-300")).toBe(501.5); // coins at Uncle Raju's (367) and Chloe's (636) homes
  });

  it("falls back to the places a policy lights when it reaches nobody", () => {
    const nobody = [lever("percent_change", "healthcare", 10, { minAge: 90 })];
    const clinic = LANDMARKS.clinic.box;
    expect(focusFor(nobody)).toBe(clinic.x + clinic.w / 2);
  });

  it("follows a conversation between two people", () => {
    expect(talkFocusX({ x: 42, y: 342 }, { x: 74, y: 342 })).toBe(58);
    expect(talkFocusX({ x: 900, y: 300 }, undefined)).toBe(900);
  });

  it("scrolls the frame so the focus sits in the middle, without leaving the map", () => {
    expect(scrollLeftFor(56, 784, 341)).toBe(0); // near the left edge: no scroll
    expect(scrollLeftFor(400, 784, 341)).toBe(230);
    expect(scrollLeftFor(780, 784, 341)).toBe(443); // the right edge
    expect(scrollLeftFor(400, 784, 900)).toBe(0); // the whole map fits: nothing to do
  });
});
