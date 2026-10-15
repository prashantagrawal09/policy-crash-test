// Live eval for the parser: 10 fixture policies, each read 3 times by PARSE_MODEL through the
// app's own readPolicy(). A case passes only if all 3 runs come back as expected, because
// "always" needs more than one run. Uses your key: about $0.01 per full run.
//
//   npm run eval:parser

import { PARSE_MODEL } from "@/lib/anthropic";
import { readPolicy } from "@/lib/readPolicy";
import type { Lever, ParseResult } from "@/lib/schemas";
import { dollars, mark, pad, pool } from "./shared";

const RUNS = 3;
const PRICES = { input: 0.1, output: 0.5 }; // claude-haiku-5-5, $ per million tokens

// A check returns null when the reading is right, or the reason it isn't.
type Check = (r: ParseResult) => string | null;

const HDB = ["hdb_2_room", "hdb_3_room", "hdb_4_room"];
const has = (r: ParseResult, test: (l: Lever) => boolean) => r.levers.some(test);
const onlyTargets = (r: ParseResult, targets: Lever["target"][]) => r.levers.every((l) => targets.includes(l.target));
const forParents = (l: Lever) => l.eligibility.mustHaveChildren === true || (l.eligibility.tagsAny ?? []).includes("has_children");

function policy(test: (r: ParseResult) => string | null): Check {
  return (r) => (r.isPolicy ? test(r) : "read as not a policy");
}

const CASES: { policy: string; expect: string; check: Check }[] = [
  {
    policy: "Bus and train fares rise 10%",
    expect: "public_transport, +10",
    check: policy((r) =>
      !has(r, (l) => l.kind === "percent_change" && l.target === "public_transport" && l.value === 10)
        ? "no public_transport +10% lever"
        : !onlyTargets(r, ["public_transport"]) ? "changes other targets too" : null),
  },
  {
    policy: "Electricity bills cut 20%",
    expect: "utilities, −20 (your sign check)",
    check: policy((r) =>
      !has(r, (l) => l.kind === "percent_change" && l.target === "utilities" && l.value === -20)
        ? "no utilities −20% lever"
        : !onlyTargets(r, ["utilities"]) ? "changes other targets too" : null),
  },
  {
    policy: "Childcare fees cut by half for working parents",
    expect: "childcare, −50, for parents (mustHaveChildren or the has_children tag: the engine treats them the same)",
    check: policy((r) =>
      !has(r, (l) => l.kind === "percent_change" && l.target === "childcare" && l.value === -50)
        ? "no childcare −50% lever"
        : !has(r, (l) => l.target === "childcare" && forParents(l)) ? "not limited to parents"
        : !onlyTargets(r, ["childcare"]) ? "changes other targets too" : null),
  },
  {
    policy: "School fees go up 5%",
    expect: "education, +5",
    check: policy((r) =>
      !has(r, (l) => l.kind === "percent_change" && l.target === "education" && l.value === 5)
        ? "no education +5% lever"
        : !onlyTargets(r, ["education"]) ? "changes other targets too" : null),
  },
  {
    policy: "$300 one-off payout for adults earning under $3,000 a month",
    expect: "one_off_payment 300, maxMonthlyIncome 3000",
    check: policy((r) =>
      !has(r, (l) => l.kind === "one_off_payment" && l.value === 300)
        ? "no one-off $300 lever"
        : !has(r, (l) => l.kind === "one_off_payment" && l.eligibility.maxMonthlyIncome === 3000) ? "missing maxMonthlyIncome 3000"
        : r.levers.some((l) => l.kind !== "one_off_payment") ? "adds monthly changes too" : null),
  },
  {
    policy: "HDB households get $50 off utilities every month",
    expect: "fixed_monthly_change utilities −50, all three HDB types",
    check: policy((r) => {
      const lever = r.levers.find((l) => l.kind === "fixed_monthly_change" && l.target === "utilities" && l.value === -50);
      if (!lever) return "no utilities −$50 monthly lever";
      const types = [...(lever.eligibility.housingTypes ?? [])].sort();
      if (types.join() !== HDB.join()) return `housing types were [${types.join(", ")}]`;
      return onlyTargets(r, ["utilities"]) ? null : "changes other targets too";
    }),
  },
  {
    policy: "GST rises by 1 percentage point",
    expect: "all_taxable_spending, positive value",
    check: policy((r) => (has(r, (l) => l.target === "all_taxable_spending" && l.value > 0) ? null : "no positive all_taxable_spending lever")),
  },
  {
    policy: "Raise the retirement age to 70",
    expect: "isPolicy true, no levers, ≥ 1 assumption",
    check: policy((r) => (r.levers.length > 0 ? "has levers" : r.assumptions.length === 0 ? "no assumption explaining why" : null)),
  },
  {
    policy: "What should I eat for lunch?",
    expect: "isPolicy false",
    check: (r) => (r.isPolicy ? "read as a policy" : null),
  },
  {
    policy: "Make transport cheaper for old folks",
    expect: "public_transport negative, age or senior rule, confidence not high, ≥ 1 assumption",
    check: policy((r) => {
      const seniorRule = (l: Lever) =>
        l.eligibility.minAge !== undefined || (l.eligibility.tagsAny ?? []).some((t) => t === "senior" || t === "retiree");
      if (!has(r, (l) => l.target === "public_transport" && l.value < 0)) return "no public_transport cut";
      if (!has(r, (l) => l.target === "public_transport" && seniorRule(l))) return "no age or senior rule";
      if (r.confidence === "high") return "confidence was high";
      return r.assumptions.length === 0 ? "no assumptions" : null;
    }),
  },
];

const describe = (r: ParseResult) =>
  r.isPolicy
    ? `${r.levers.map((l) => `${l.kind} ${l.target} ${l.value} ${JSON.stringify(l.eligibility)}`).join("; ") || "no levers"} · ${r.confidence}`
    : `not a policy: ${r.rejectReason ?? ""}`;

async function main() {
  console.log(`\nParser eval · ${PARSE_MODEL} · ${RUNS} runs per case\n`);

  const tasks = CASES.flatMap((c, caseIndex) =>
    Array.from({ length: RUNS }, () => async () => ({ caseIndex, outcome: await readPolicy(c.policy) })),
  );
  const runs = await pool(tasks, 5);

  let passedCases = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  const failures: string[] = [];

  console.log(`${pad("#", 3)}${pad("Policy", 58)}${pad("Runs", 7)}Result`);
  CASES.forEach((c, i) => {
    const marks = runs
      .filter((run) => run.caseIndex === i)
      .map(({ outcome }, runIndex) => {
        if (outcome.ok) {
          inputTokens += outcome.usage.input_tokens;
          outputTokens += outcome.usage.output_tokens;
        }
        const problem = outcome.ok ? c.check(outcome.result) : `couldn't read: ${outcome.reason} (${outcome.detail})`;
        if (problem) {
          failures.push(`#${i + 1} run ${runIndex + 1}: ${problem}\n     expected ${c.expect}\n     got      ${outcome.ok ? describe(outcome.result) : "-"}`);
        }
        return !problem;
      });
    const pass = marks.every(Boolean);
    if (pass) passedCases += 1;
    console.log(`${pad(String(i + 1), 3)}${pad(c.policy, 58)}${pad(marks.map(mark).join(""), 7)}${pass ? "PASS" : "FAIL"}`);
  });

  const cost = (inputTokens * PRICES.input + outputTokens * PRICES.output) / 1_000_000;
  console.log(`\n${passedCases}/${CASES.length} cases passed · ${runs.length} calls · ${inputTokens} in, ${outputTokens} out · ${dollars(cost)}`);
  if (failures.length > 0) console.log(`\nFailures:\n  ${failures.join("\n  ")}`);
  process.exitCode = passedCases === CASES.length ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
