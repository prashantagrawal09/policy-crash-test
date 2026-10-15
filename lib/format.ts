import type { ResidentResult, Verdict } from "@/lib/engine";

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
