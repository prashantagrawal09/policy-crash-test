import { applyLevers, isEligible, runResident, verdictLenses, type Lens, type ResidentResult } from "@/lib/engine";
import { HOUSING_LABELS, leverText, money, percent, signedMoney, TAG_LABELS, VERDICT_LABELS } from "@/lib/format";
import { CATEGORIES, type Category, type Lever, type Resident } from "@/lib/schemas";

// The Why? drawer (prd.md > Why? Budget Drawer): a resident's month before and after, line by
// line, and the two checks behind their verdict. Every amount comes from the engine's cents.

export const CATEGORY_LABELS: Record<Category, string> = {
  housing: "Housing",
  food: "Food",
  public_transport: "Bus and MRT",
  private_transport: "Car",
  utilities: "Bills (power, water)",
  healthcare: "Health",
  childcare: "Childcare",
  education: "Education",
  other: "Everything else",
};

export interface WhyLine {
  label: string;
  before: number; // dollars
  after: number;
  changed: boolean;
}

export interface WhyCheck {
  share: string; // "12%"
  lens: Lens | null; // what this check alone would say; null = it doesn't apply
  rule: string; // "more than 10% of spare money"
}

export interface Why {
  reach: { lever: string; applies: boolean; reason: string }[];
  income: WhyLine;
  spending: WhyLine[]; // categories they spend on, or that changed
  taxableFixed: number; // dollars a month on all taxable spending (0 when none)
  totalBefore: number;
  totalAfter: number;
  spareBefore: number;
  spareAfter: number; // monthly change only; a one-off is shown on its own
  oneOff: number;
  checks: { income: WhyCheck; spare: WhyCheck; decidedBy: "income" | "spare" | "both" | null };
}

const cents = (value: number) => value / 100;

// Why a change does or doesn't reach this person: the first rule they miss, or what it touches.
function reachOf(resident: Resident, lever: Lever): { applies: boolean; reason: string } {
  const rules = lever.eligibility;
  if (!isEligible(resident, rules)) {
    if (rules.minAge !== undefined && resident.age < rules.minAge) return { applies: false, reason: `Aged ${resident.age}, under ${rules.minAge}` };
    if (rules.maxAge !== undefined && resident.age > rules.maxAge) return { applies: false, reason: `Aged ${resident.age}, over ${rules.maxAge}` };
    if (rules.minMonthlyIncome !== undefined && resident.income < rules.minMonthlyIncome)
      return { applies: false, reason: `Earns ${money(resident.income)}, under ${money(rules.minMonthlyIncome)}` };
    if (rules.maxMonthlyIncome !== undefined && resident.income > rules.maxMonthlyIncome)
      return { applies: false, reason: `Earns ${money(resident.income)}, over ${money(rules.maxMonthlyIncome)}` };
    if (rules.housingTypes?.length && !rules.housingTypes.includes(resident.housingType))
      return { applies: false, reason: `Doesn't live in ${rules.housingTypes.map((h) => HOUSING_LABELS[h]).join(" or ")}` };
    if (rules.mustHaveChildren && !resident.tags.includes("has_children")) return { applies: false, reason: "No children at home" };
    return { applies: false, reason: `Isn't ${(rules.tagsAny ?? []).map((t) => TAG_LABELS[t]).join(" or ")}` };
  }
  const effect = runResident(resident, [lever]);
  if (effect.cents.monthly === 0 && effect.cents.oneOff === 0) {
    const nothing = lever.target === "income" || lever.target === "all_taxable_spending" ? "Nothing it applies to" : `Spends nothing on ${CATEGORY_LABELS[lever.target].toLowerCase()}`;
    return { applies: false, reason: nothing };
  }
  const amount = effect.cents.monthly !== 0 ? `${signedMoney(cents(effect.cents.monthly))} a month` : `${signedMoney(cents(effect.cents.oneOff))} one-off`;
  return { applies: true, reason: amount };
}

const INCOME_RULES: Record<Lens, string> = {
  better_off: "more than 1% of income, in their favour",
  barely_affected: "within 1% of income either way",
  feels_it: "more than 1% of income",
  hard_hit: "more than 5% of income, or below zero",
};

export function whyFor(resident: Resident, result: ResidentResult, levers: Lever[]): Why {
  const applied = applyLevers(resident, levers);
  const { monthly, oneOff, income, spare } = result.cents;
  const lenses = verdictLenses(monthly, oneOff, income, spare);
  const n = 12 * monthly + oneOff; // the verdict's own measure: a one-off counts as ÷ 12

  const spending = CATEGORIES.flatMap((category) => {
    const { before, after } = applied.categories[category];
    if (before === 0 && after === 0) return [];
    return [{ label: CATEGORY_LABELS[category], before: cents(before), after: cents(after), changed: before !== after }];
  });
  const totalBefore = CATEGORIES.reduce((sum, c) => sum + applied.categories[c].before, 0);

  const spareRule =
    lenses.bySpare === "hard_hit" ? "more than 30% of spare money, or below zero" : lenses.bySpare === "feels_it" ? "more than 10% of spare money" : n >= 0 ? "only counts losses" : "under 10% of spare money";

  let decidedBy: Why["checks"]["decidedBy"] = null;
  if (lenses.verdict !== "unaffected") {
    if (lenses.bySpare === null || lenses.verdict === lenses.byIncome) decidedBy = lenses.bySpare === lenses.byIncome ? "both" : "income";
    else decidedBy = "spare";
  }

  return {
    reach: levers.map((lever) => ({ lever: leverText(lever), ...reachOf(resident, lever) })),
    income: { label: "Income", before: cents(income), after: cents(applied.incomeCents), changed: income !== applied.incomeCents },
    spending,
    taxableFixed: cents(applied.taxableFixedCents),
    totalBefore: cents(totalBefore),
    totalAfter: cents(applied.spendingCents),
    spareBefore: cents(spare),
    spareAfter: cents(spare + monthly),
    oneOff: cents(oneOff),
    checks: {
      income: {
        share: income ? percent(n, 12 * income) : "—",
        lens: lenses.byIncome,
        rule: lenses.byIncome ? INCOME_RULES[lenses.byIncome] : "no change",
      },
      spare: { share: spare > 0 ? percent(n, 12 * spare) : "—", lens: lenses.bySpare, rule: spareRule },
      decidedBy,
    },
  };
}

// "Feels it" or "doesn't apply", for a check's label.
export function lensLabel(lens: Lens | null): string {
  return lens ? VERDICT_LABELS[lens] : "doesn't apply";
}
