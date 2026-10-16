// Live eval for the town chatter: the 4 presets, 2 chatter runs each on DIARY_MODEL through the
// app's own writeChatter(). Every remark is checked against the numbers its speaker was given.
// Uses your key: about $0.06 per full run.
//
//   npm run eval:chatter
//   npm run eval:chatter -- petrol      (only the presets whose id or chip text matches)

import { RESIDENTS } from "@/data/residents";
import { DIARY_MODEL } from "@/lib/anthropic";
import { residentBlock } from "@/lib/diaryInput";
import { runTown } from "@/lib/engine";
import { PRESETS } from "@/lib/presets";
import type { ChatterLine } from "@/lib/schemas";
import { writeChatter } from "@/lib/writeChatter";
import { AMOUNT, amounts, dollars, mark, pad, POLITICS, pool, wordCount } from "./shared";

const RUNS = 2;
const PRICES = { input: 2, output: 10 }; // claude-sonnet-5-5, $ per million tokens

interface RunReport {
  preset: string;
  run: number;
  remarks: ChatterLine[];
  checks: { count: boolean; speakers: boolean; amounts: boolean; lengths: boolean; politics: boolean };
  problems: string[];
  inputTokens: number;
  outputTokens: number;
}

const nameOf = (id: string) => RESIDENTS.find((r) => r.id === id)?.shortName ?? id;

async function evalRun(presetIndex: number, run: number): Promise<RunReport> {
  const preset = PRESETS[presetIndex];
  const results = runTown(RESIDENTS, preset.levers);
  const remarks: ChatterLine[] = [];
  const problems: string[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  for await (const event of writeChatter({ policyText: preset.chip, levers: preset.levers })) {
    if (event.type === "remark") remarks.push(event.line);
    else if (event.type === "dropped") problems.push(`a line was dropped (${event.reason})`);
    else if (event.type === "error") problems.push(`stream error: ${event.kind}`);
    if ((event.type === "done" || event.type === "error") && event.stats) {
      inputTokens = event.stats.usage.input_tokens;
      outputTokens = event.stats.usage.output_tokens;
    }
  }

  const checks = { count: true, speakers: true, amounts: true, lengths: true, politics: true };
  // Rule 1: 4 to 6 remarks, and a conversation needs at least two people.
  if (remarks.length < 4 || remarks.length > 6) {
    checks.count = false;
    problems.push(`${remarks.length} remarks`);
  }
  const speakers = new Set(remarks.flatMap((r) => [r.speaker, r.listener]));
  if (speakers.size < 2) {
    checks.speakers = false;
    problems.push(`${speakers.size} people in the conversation`);
  }

  for (const remark of remarks) {
    const speaker = RESIDENTS.find((r) => r.id === remark.speaker)!;
    const result = results.find((r) => r.id === remark.speaker)!;
    // Rule 4: a speaker's amounts are their own card strings and spare money after, or the policy's.
    const given = new Set([...amounts(residentBlock(speaker, result)), ...amounts(preset.chip)]);
    const invented = [...remark.text.matchAll(AMOUNT)].filter((m) => !given.has(Number(m[1].replace(/,/g, ""))));
    if (invented.length > 0) {
      checks.amounts = false;
      problems.push(`${remark.speaker}: ${invented.map((m) => m[0]).join(", ")} not among their numbers [${[...given].map((a) => `$${a}`).join(", ")}] in "${remark.text}"`);
    }
    const words = wordCount(remark.text);
    if (words > 25) {
      checks.lengths = false;
      problems.push(`${remark.speaker}: ${words} words`);
    }
    const political = POLITICS.find((pattern) => pattern.test(remark.text));
    if (political) {
      checks.politics = false;
      problems.push(`${remark.speaker}: mentions politics (${political.source})`);
    }
  }

  return { preset: preset.chip, run, remarks, checks, problems, inputTokens, outputTokens };
}

async function main() {
  console.log(`\nChatter eval · ${DIARY_MODEL} · ${RUNS} runs per preset\n`);
  const filter = process.argv[2]?.toLowerCase();
  const chosen = PRESETS.map((preset, index) => ({ preset, index })).filter(
    ({ preset }) => !filter || preset.id.includes(filter) || preset.chip.toLowerCase().includes(filter),
  );
  const tasks = chosen.flatMap(({ index }) => Array.from({ length: RUNS }, (_, run) => () => evalRun(index, run + 1)));
  const reports = await pool(tasks, 4);

  console.log(`${pad("Preset", 44)}${pad("Run", 5)}${pad("4–6", 6)}${pad("People", 8)}${pad("Amounts", 9)}${pad("Lengths", 9)}${pad("Politics", 10)}Result`);
  let passed = 0;
  for (const r of reports) {
    const ok = Object.values(r.checks).every(Boolean) && r.problems.length === 0;
    if (ok) passed += 1;
    const c = r.checks;
    console.log(
      `${pad(r.preset, 44)}${pad(String(r.run), 5)}${pad(mark(c.count), 6)}${pad(mark(c.speakers), 8)}${pad(mark(c.amounts), 9)}${pad(mark(c.lengths), 9)}${pad(mark(c.politics), 10)}${ok ? "PASS" : "FAIL"}`,
    );
  }

  const inputTokens = reports.reduce((sum, r) => sum + r.inputTokens, 0);
  const outputTokens = reports.reduce((sum, r) => sum + r.outputTokens, 0);
  const cost = (inputTokens * PRICES.input + outputTokens * PRICES.output) / 1_000_000;
  console.log(`\n${passed}/${reports.length} runs passed · ${inputTokens} in, ${outputTokens} out · ${dollars(cost)}`);

  // One conversation per preset, to read.
  for (const r of reports.filter((report) => report.run === 1)) {
    console.log(`\n${r.preset}`);
    for (const remark of r.remarks) console.log(`  ${nameOf(remark.speaker)} → ${nameOf(remark.listener)}: ${remark.text}`);
  }

  const failures = reports.flatMap((r) => r.problems.map((p) => `${r.preset} · run ${r.run} · ${p}`));
  if (failures.length > 0) console.log(`\nProblems:\n  ${failures.join("\n  ")}`);
  process.exitCode = passed === reports.length ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
