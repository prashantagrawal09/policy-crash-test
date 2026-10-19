import { effectivePercent, type ResidentResult, type Verdict } from "@/lib/engine";
import type { Eligibility, HousingType, Lever, Tag } from "@/lib/schemas";

// Pure display formatting. prd.md > Expected Preset Results is its test.

const MINUS = "−";

export const VERDICT_LABELS: Record<Verdict, string> = {
  better_off: "Better off",
  barely_affected: "Barely affected",
  feels_it: "Feels it",
  hard_hit: "Hard hit",
  unaffected: "Unaffected",
};

// Whole dollars with separators. A non-zero amount under $1 keeps its cents,
// so a real change never reads "$0".
export function money(dollars: number): string {
  const abs = Math.abs(dollars);
  if (abs > 0 && abs < 1) return `$${abs.toFixed(2)}`;
  return `$${Math.round(abs).toLocaleString("en-US")}`;
}

export function signedMoney(dollars: number): string {
  if (dollars === 0) return "$0";
  return `${dollars > 0 ? "+" : MINUS}${money(dollars)}`;
}

// numer / denom as a percentage to one decimal, rounded toward zero, without a trailing ".0".
// Takes whole numbers (cents) so the rounding is exact: 40 / 4200 shows "0.9%", never "1.0%".
export function percent(numer: number, denom: number): string {
  const tenths = Math.trunc((Math.abs(numer) * 1000) / Math.abs(denom));
  return `${tenths % 10 === 0 ? String(tenths / 10) : (tenths / 10).toFixed(1)}%`;
}

export function incomeText(income: number): string {
  return `Earns ${money(income)} a month`;
}

export interface CardText {
  verdictLabel: string;
  bigNumber: string | null; // "−$12", "+$400" or "+$300 one-off"; null when Unaffected
  bigPerMonth: boolean; // big number is a monthly change ("a month" after it)
  bigIsGain: boolean;
  monthlyEquivalent: string | null; // one-off only: "About $25 a month over a year"
  incomeLine: string | null; // "0.9% of income" / "about 2.5% of income"
  spareLine: string | null; // "$12 = 12% of what's left each month"
  oneOffChip: string | null; // mixed policies: the one-off, shown under a monthly big number
}

// Scaled by 12 (see engine) so one-offs spread over a year stay exact whole numbers.
function exact(result: ResidentResult) {
  const { monthly, oneOff, income, spare } = result.cents;
  return { n: 12 * monthly + oneOff, income: 12 * income, spare: 12 * spare };
}

// One-off lines lead with "Spread over a year:"; others start with a capital.
function sentence(spreadOneOff: boolean, text: string): string {
  return spreadOneOff ? `Spread over a year: ${text}` : text[0].toUpperCase() + text.slice(1);
}

// Never a percentage over 100%: past the spare money, the line switches to before/after wording.
function spareLine(result: ResidentResult, spreadOneOff: boolean): string {
  const { n, spare } = exact(result);
  const { net, spareBefore, spareAfter } = result;

  if (n < 0 && spareAfter < 0) {
    return sentence(spreadOneOff, `eats all ${money(spareBefore)} spare, ${money(spareAfter)} short each month`);
  }
  if (n < 0) return sentence(spreadOneOff, `${money(net)} = ${percent(n, spare)} of what's left each month`);
  if (n > 0 && n > spare) {
    return sentence(spreadOneOff, `spare money goes from ${money(spareBefore)} to ${money(spareAfter)} a month`);
  }
  if (n > 0) {
    return spreadOneOff
      ? sentence(true, `${percent(n, spare)} more spare money each month`)
      : `+${money(net)} = ${percent(n, spare)} more spare money each month`;
  }
  return "No net change to spare money";
}

function incomeLine(result: ResidentResult, oneOffOnly: boolean): string {
  const { n, income } = exact(result);
  if (Math.abs(n) > income) return "More than a month's income";
  return `${oneOffOnly ? "about " : ""}${percent(n, income)} of income`;
}

export function cardText(result: ResidentResult): CardText {
  const verdictLabel = VERDICT_LABELS[result.verdict];
  const { monthlyChange, oneOff, net } = result;

  if (result.verdict === "unaffected") {
    return {
      verdictLabel, bigNumber: null, bigPerMonth: false, bigIsGain: false,
      monthlyEquivalent: null, incomeLine: null, spareLine: null, oneOffChip: null,
    };
  }

  if (monthlyChange === 0) {
    // One-off only: the big number is the payment; the verdict uses its monthly share.
    return {
      verdictLabel,
      bigNumber: `${signedMoney(oneOff)} one-off`,
      bigPerMonth: false,
      bigIsGain: oneOff > 0,
      monthlyEquivalent: `About ${money(net)} a month over a year`,
      incomeLine: incomeLine(result, true),
      spareLine: spareLine(result, true),
      oneOffChip: null,
    };
  }

  return {
    verdictLabel,
    bigNumber: signedMoney(monthlyChange),
    bigPerMonth: true,
    bigIsGain: monthlyChange > 0,
    monthlyEquivalent: null,
    incomeLine: incomeLine(result, false),
    spareLine: spareLine(result, false),
    oneOffChip: oneOff === 0 ? null : `${signedMoney(oneOff)} one-off`,
  };
}

// Worst first, then the untouched; only labels that occur.
const SUMMARY_ORDER: Verdict[] = ["hard_hit", "feels_it", "barely_affected", "better_off", "unaffected"];
const SUMMARY_WORDS: Record<Verdict, { one: string; many: string }> = {
  hard_hit: { one: "hit hard", many: "hit hard" },
  feels_it: { one: "feels it", many: "feel it" },
  barely_affected: { one: "barely affected", many: "barely affected" },
  better_off: { one: "better off", many: "better off" },
  unaffected: { one: "unaffected", many: "unaffected" },
};

export function summaryBeforeRun(residentCount: number): string {
  return `${residentCount} residents. Pick a policy to crash-test the town.`;
}

export interface SummaryPart {
  verdict: Verdict;
  text: string; // "2 feel it"
}

export function summaryParts(results: ResidentResult[]): SummaryPart[] {
  return SUMMARY_ORDER.map((verdict) => ({ verdict, count: results.filter((r) => r.verdict === verdict).length }))
    .filter(({ count }) => count > 0)
    .map(({ verdict, count }) => ({
      verdict,
      text: `${count} ${count === 1 ? SUMMARY_WORDS[verdict].one : SUMMARY_WORDS[verdict].many}`,
    }));
}

export function summaryLine(results: ResidentResult[]): string {
  if (results.every((r) => r.verdict === "unaffected")) return "Nobody's monthly budget changes";
  return summaryParts(results)
    .map((part) => part.text)
    .join(", ");
}

// ---- Monthly change chart ----

export interface ChartRow {
  id: string;
  verdict: Verdict;
  monthly: number; // dollars a month: the solid part
  oneOffShare: number; // dollars a month: a one-off ÷ 12, the striped part
  label: string; // the amount next to the bar, matching the card's number
}

export function chartRows(results: ResidentResult[]): ChartRow[] {
  return results.map((result) => {
    const oneOffShare = result.cents.oneOff / 1200;
    let label: string;
    if (result.verdict === "unaffected") label = "$0";
    else if (result.cents.monthly === 0) label = signedMoney(oneOffShare);
    else if (result.cents.oneOff === 0) label = signedMoney(result.monthlyChange);
    else label = `${signedMoney(result.monthlyChange)}, ${signedMoney(oneOffShare)} one-off`;
    return { id: result.id, verdict: result.verdict, monthly: result.monthlyChange, oneOffShare, label };
  });
}

// ---- Spare-money bar ----

// How far a below-zero spill may run past the bar's end, as % of the bar's length.
export const SPILL_MAX = 25;

export interface SpareBar {
  // Widths are % of the bar's length: the spare money before, or after for a gain.
  keep: number; // spare money the policy leaves alone
  solid: number; // monthly part eaten (loss) or added (gain)
  striped: number; // one-off monthly share eaten or added
  tone: "none" | "loss" | "gain";
  spill: number; // below zero: hazard zone past the end (capped at SPILL_MAX)
  tick: boolean; // the faint 10% "feels it" tick, shown when the bar is the spare money before
}

export function spareBar(result: ResidentResult | null): SpareBar {
  const full: SpareBar = { keep: 100, solid: 0, striped: 0, tone: "none", spill: 0, tick: true };
  if (!result || result.verdict === "unaffected") return full;

  const { n, spare } = exact(result);
  const monthly = 12 * result.cents.monthly;
  const oneOff = result.cents.oneOff;
  if (n === 0 || spare <= 0) return full;

  // Monthly and one-off parts show separately only when they point the same way.
  const sameWay = monthly === 0 || oneOff === 0 || Math.sign(monthly) === Math.sign(oneOff);
  const solidPart = sameWay ? Math.abs(monthly) : Math.abs(n);
  const stripedPart = sameWay ? Math.abs(oneOff) : 0;

  if (n < 0) {
    const eaten = -n;
    if (eaten >= spare) {
      // Fills fully red, then spills into the hazard zone past its end.
      return {
        keep: 0,
        solid: (solidPart / eaten) * 100,
        striped: (stripedPart / eaten) * 100,
        tone: "loss",
        spill: Math.min(SPILL_MAX, ((eaten - spare) / spare) * 100),
        tick: true,
      };
    }
    return {
      keep: 100 - (eaten / spare) * 100,
      solid: (solidPart / spare) * 100,
      striped: (stripedPart / spare) * 100,
      tone: "loss",
      spill: 0,
      tick: true,
    };
  }

  // A gain: the bar becomes the spare money after, with the added part at the end.
  const after = spare + n;
  return {
    keep: (spare / after) * 100,
    solid: (solidPart / after) * 100,
    striped: (stripedPart / after) * 100,
    tone: "gain",
    spill: 0,
    tick: false,
  };
}

// ---- Levers in plain English ----

const TARGET_LABELS: Record<Exclude<Lever["target"], "income">, string> = {
  housing: "Housing costs",
  food: "Food prices",
  public_transport: "Public transport fares",
  private_transport: "Private transport costs",
  utilities: "Utility bills",
  healthcare: "Healthcare costs",
  childcare: "Childcare fees",
  education: "Education costs",
  other: "Other costs",
  all_taxable_spending: "Prices of taxable goods and services",
};

export const HOUSING_LABELS: Record<HousingType, string> = {
  hdb_2_room: "HDB 2-room flats",
  hdb_3_room: "HDB 3-room flats",
  hdb_4_room: "HDB 4-room flats",
  condo: "condos",
  renting: "rented homes",
  with_parents: "their parents' homes",
};

export const TAG_LABELS: Record<Tag, string> = {
  student: "students",
  senior: "seniors",
  retiree: "retirees",
  gig_worker: "gig workers",
  business_owner: "business owners",
  healthcare_worker: "healthcare workers",
  single_parent: "single parents",
  renter: "renters",
  car_user: "car users",
  has_children: "parents",
};

// "A", "A or B", "A, B or C"
function orList(items: string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
}

export function forWhom(rules: Eligibility): string {
  const parts: string[] = [];
  const { minAge, maxAge, minMonthlyIncome: minIncome, maxMonthlyIncome: maxIncome } = rules;

  if (minAge !== undefined && maxAge !== undefined) parts.push(`aged ${minAge} to ${maxAge}`);
  else if (minAge !== undefined) parts.push(`aged ${minAge} and over`);
  else if (maxAge !== undefined) parts.push(`aged ${maxAge} and under`);

  if (minIncome !== undefined && maxIncome !== undefined) {
    parts.push(`earning ${money(minIncome)} to ${money(maxIncome)} a month`);
  } else if (maxIncome !== undefined) parts.push(`earning up to ${money(maxIncome)} a month`);
  else if (minIncome !== undefined) parts.push(`earning at least ${money(minIncome)} a month`);

  if (rules.housingTypes?.length) parts.push(`living in ${orList(rules.housingTypes.map((h) => HOUSING_LABELS[h]))}`);
  if (rules.tagsAny?.length) parts.push(`who are ${orList(rules.tagsAny.map((t) => TAG_LABELS[t]))}`);

  if (parts.length === 0) return rules.mustHaveChildren ? "parents" : "everyone";
  return `${rules.mustHaveChildren ? "parents" : "people"} ${parts.join(", ")}`;
}

// What changes, by how much, for whom: built from the lever's own fields, so the panel
// shows exactly what the engine applies (not the AI's free-text description).
export function leverText(lever: Lever): string {
  const { kind, target, value } = lever;
  const amount = Math.abs(value);
  const direction = value >= 0 ? "up" : "down";
  let change: string;

  if (kind === "tax_rate_change") {
    const change = effectivePercent(lever);
    const by = `${Math.abs(change) < 10 ? Math.abs(change).toFixed(2).replace(/\.?0+$/, "") : Math.round(Math.abs(change))}%`;
    const what = target === "income" ? "Take-home income goes" : `${TARGET_LABELS[target]} go`;
    return `${what} ${change >= 0 ? "up" : "down"} ${by} (a tax rate going from ${lever.fromRate}% to ${value}%), for ${forWhom(lever.eligibility)}`;
  }
  if (kind === "one_off_payment") {
    if (target === "income") change = `A one-off ${value >= 0 ? "payment" : "charge"} of ${money(amount)}`;
    else change = `A one-off ${value <= 0 ? "rebate" : "charge"} of ${money(amount)} on ${TARGET_LABELS[target].toLowerCase()}`;
  } else {
    const by = kind === "percent_change" ? `${amount}%` : `${money(amount)} a month`;
    change = target === "income" ? `Monthly income goes ${direction} ${by}` : `${TARGET_LABELS[target]} go ${direction} ${by}`;
  }
  return `${change}, for ${forWhom(lever.eligibility)}`;
}
