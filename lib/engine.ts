import { CATEGORIES, type Category, type Eligibility, type Lever, type Resident } from "@/lib/schemas";

// Pure policy engine: no AI, no I/O. Same input, same output, in the browser and on the server.
// Money is handled in whole cents so "exactly $0" and the verdict lines are exact.

export type Verdict = "better_off" | "barely_affected" | "feels_it" | "hard_hit" | "unaffected";
export type Lens = Exclude<Verdict, "unaffected">; // a verdict one lens can give

export interface ResidentResult {
  id: string;
  monthlyChange: number; // dollars: change in spare money each month, one-offs excluded
  oneOff: number; // dollars: one-off payment, positive means money in
  net: number; // dollars a month for the verdict: monthlyChange + oneOff / 12
  spareBefore: number;
  spareAfter: number; // spareBefore + net
  pctIncome: number; // net as % of income
  pctSpare: number; // net as % of spare money
  verdict: Verdict;
  cents: { monthly: number; oneOff: number; income: number; spare: number };
}

// "all_taxable_spending" expands to these (GST-style changes).
export const TAXABLE_CATEGORIES: Category[] = ["food", "public_transport", "private_transport", "utilities", "other"];

const roundCents = (cents: number) => Math.sign(cents) * Math.round(Math.abs(cents)) + 0;
const toCents = (dollars: number) => roundCents(dollars * 100);

export function totalSpending(resident: Resident): number {
  return CATEGORIES.reduce((sum, c) => sum + resident.budget[c], 0);
}

export function spareMoney(resident: Resident): number {
  return resident.income - totalSpending(resident);
}

// Every rule given must pass. Bounds are inclusive; an empty list means no rule.
export function isEligible(resident: Resident, rules: Eligibility): boolean {
  if (rules.minAge !== undefined && resident.age < rules.minAge) return false;
  if (rules.maxAge !== undefined && resident.age > rules.maxAge) return false;
  if (rules.minMonthlyIncome !== undefined && resident.income < rules.minMonthlyIncome) return false;
  if (rules.maxMonthlyIncome !== undefined && resident.income > rules.maxMonthlyIncome) return false;
  if (rules.housingTypes?.length && !rules.housingTypes.includes(resident.housingType)) return false;
  if (rules.mustHaveChildren && !resident.tags.includes("has_children")) return false;
  if (rules.tagsAny?.length && !rules.tagsAny.some((tag) => resident.tags.includes(tag))) return false;
  return true;
}

export interface AppliedLevers {
  incomeCents: number;
  spendingCents: number;
  oneOffCents: number;
  // For explaining a result (the Why? drawer): each category before and after, and a fixed
  // amount on all taxable spending, which applies to the total rather than to one category.
  categories: Record<Category, { before: number; after: number }>;
  taxableFixedCents: number;
}

// The percentage a lever moves its target by. A tax-rate change becomes the ratio of the rates:
// a consumption tax from 9% to 10% raises prices by 1.10 / 1.09 − 1 ≈ +0.917%; an income tax
// from 15% to 17% changes take-home pay by 0.83 / 0.85 − 1 ≈ −2.35%.
export function effectivePercent(lever: Lever): number {
  if (lever.kind !== "tax_rate_change") return lever.value;
  const from = lever.fromRate ?? lever.value;
  return lever.target === "income" ? ((100 - lever.value) / (100 - from) - 1) * 100 : ((100 + lever.value) / (100 + from) - 1) * 100;
}

// Each percent change applies to the pre-policy amount, so lever order never matters.
// Each lever's effect is rounded to the cent. A cut can't take a bill or an income below $0.
export function applyLevers(resident: Resident, levers: Lever[]): AppliedLevers {
  const baseIncome = toCents(resident.income);
  const base = Object.fromEntries(CATEGORIES.map((c) => [c, toCents(resident.budget[c])])) as Record<Category, number>;
  const delta = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  let incomeDelta = 0;
  let taxableFixedDelta = 0; // a fixed amount on all taxable spending is applied once, to the total
  let oneOffCents = 0;

  const percentOf = (cents: number, value: number) => roundCents((cents * value) / 100);

  for (const lever of levers) {
    if (!isEligible(resident, lever.eligibility)) continue;
    const { kind, target } = lever;
    const value = effectivePercent(lever); // a tax-rate change acts as the percent change it causes
    const percent = kind === "percent_change" || kind === "tax_rate_change";

    if (kind === "one_off_payment") {
      // Paid into income it's money in; on a spending target, negative means cheaper (a rebate).
      oneOffCents += target === "income" ? toCents(value) : -toCents(value);
    } else if (target === "income") {
      incomeDelta += percent ? percentOf(baseIncome, value) : toCents(value);
    } else if (target === "all_taxable_spending") {
      if (percent) {
        for (const c of TAXABLE_CATEGORIES) delta[c] += percentOf(base[c], value);
      } else {
        taxableFixedDelta += toCents(value);
      }
    } else {
      delta[target] += percent ? percentOf(base[target], value) : toCents(value);
    }
  }

  const after = CATEGORIES.map((c) => Math.max(0, base[c] + delta[c]));
  const taxableAfter = TAXABLE_CATEGORIES.reduce((sum, c) => sum + Math.max(0, base[c] + delta[c]), 0);
  const taxableFixed = Math.max(-taxableAfter, taxableFixedDelta);

  return {
    incomeCents: Math.max(0, baseIncome + incomeDelta),
    spendingCents: after.reduce((sum, cents) => sum + cents, 0) + taxableFixed,
    oneOffCents,
    categories: Object.fromEntries(CATEGORIES.map((c, i) => [c, { before: base[c], after: after[i] }])) as Record<Category, { before: number; after: number }>,
    taxableFixedCents: taxableFixed,
  };
}

const SEVERITY: Record<Lens, number> = {
  better_off: 0,
  barely_affected: 1,
  feels_it: 2,
  hard_hit: 3,
};

export interface Lenses {
  byIncome: Lens | null; // null when unaffected
  bySpare: Lens | null; // null when unaffected, for gains, and for losses under 10% of spare money
  verdict: Verdict;
}

// prd.md > Verdicts. Both lenses are checked and the worse one wins; the spare-money lens
// applies to losses only. A line counts as crossed only when the value goes past it.
export function verdict(monthlyCents: number, oneOffCents: number, incomeCents: number, spareCents: number): Verdict {
  return verdictLenses(monthlyCents, oneOffCents, incomeCents, spareCents).verdict;
}

// The same rules, with each lens's own answer kept, so the Why? drawer can show which decided.
export function verdictLenses(monthlyCents: number, oneOffCents: number, incomeCents: number, spareCents: number): Lenses {
  if (monthlyCents === 0 && oneOffCents === 0) return { byIncome: null, bySpare: null, verdict: "unaffected" };

  // Scale by 12 so a one-off counts as value ÷ 12 a month with no fractions, then
  // compare by cross-multiplying: n / income < -1%  <=>  100n < -income.
  const n = 12 * monthlyCents + oneOffCents;
  const income = 12 * incomeCents;
  const spare = 12 * spareCents;
  const belowZero = spare + n < 0;

  let byIncome: Lens;
  if (belowZero || 20 * n < -income) byIncome = "hard_hit"; // worse than -5%
  else if (100 * n < -income) byIncome = "feels_it"; // worse than -1%
  else if (100 * n > income) byIncome = "better_off"; // above +1%
  else byIncome = "barely_affected";

  if (n >= 0) return { byIncome, bySpare: null, verdict: byIncome };

  let bySpare: Lens | null = null;
  if (belowZero || 10 * n < -3 * spare) bySpare = "hard_hit"; // worse than -30%
  else if (10 * n < -spare) bySpare = "feels_it"; // worse than -10%

  return { byIncome, bySpare, verdict: bySpare && SEVERITY[bySpare] > SEVERITY[byIncome] ? bySpare : byIncome };
}

export function runResident(resident: Resident, levers: Lever[]): ResidentResult {
  const incomeCents = toCents(resident.income);
  const spendingCents = CATEGORIES.reduce((sum, c) => sum + toCents(resident.budget[c]), 0);
  const spareCents = incomeCents - spendingCents;

  const after = applyLevers(resident, levers);
  const monthly = after.incomeCents - incomeCents - (after.spendingCents - spendingCents) + 0;
  const oneOff = after.oneOffCents;
  const net12 = 12 * monthly + oneOff;

  return {
    id: resident.id,
    monthlyChange: monthly / 100,
    oneOff: oneOff / 100,
    net: net12 / 1200,
    spareBefore: spareCents / 100,
    spareAfter: (12 * spareCents + net12) / 1200,
    pctIncome: incomeCents ? (net12 * 100) / (12 * incomeCents) : 0,
    pctSpare: spareCents ? (net12 * 100) / (12 * spareCents) : 0,
    verdict: verdict(monthly, oneOff, incomeCents, spareCents),
    cents: { monthly, oneOff, income: incomeCents, spare: spareCents },
  };
}

export function runTown(residents: Resident[], levers: Lever[]): ResidentResult[] {
  return residents.map((resident) => runResident(resident, levers));
}
