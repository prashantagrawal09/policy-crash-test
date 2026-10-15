import { RESIDENTS } from "@/data/residents";
import type { Lever, Resident } from "@/lib/schemas";

export const resident = (id: string): Resident => {
  const found = RESIDENTS.find((r) => r.id === id);
  if (!found) throw new Error(`No resident ${id}`);
  return found;
};

// A plain test resident with the given income and spare money (all spending in "other").
export function person(income: number, spare: number, extra: Partial<Resident> = {}): Resident {
  return {
    id: "test", name: "Test Person", shortName: "Test", initials: "TP", age: 40, role: "Tester", everydayLine: "",
    householdSize: 1, housingType: "hdb_3_room", tags: [], icon: "laptop", income,
    budget: {
      housing: 0, food: 0, public_transport: 0, private_transport: 0, utilities: 0,
      healthcare: 0, childcare: 0, education: 0, other: income - spare,
    },
    ...extra,
  };
}

export const lever = (
  kind: Lever["kind"],
  target: Lever["target"],
  value: number,
  eligibility: Lever["eligibility"] = {},
): Lever => ({ kind, target, value, eligibility, description: "test lever" });

// A monthly loss (a cost rise on "other") or gain (more income) of exactly this many dollars.
export const loss = (dollars: number) => [lever("fixed_monthly_change", "other", dollars)];
export const gain = (dollars: number) => [lever("fixed_monthly_change", "income", dollars)];
