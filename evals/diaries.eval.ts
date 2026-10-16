// Live eval for the diaries: the 4 presets, 2 diary runs each on DIARY_MODEL through the app's
// own writeDiaries(). Every diary is checked against the numbers it was given. Uses your key: about $0.10
// per full run.
//
//   npm run eval:diaries
//   npm run eval:diaries -- childcare      (only the presets whose id or chip text matches)

import { RESIDENTS } from "@/data/residents";
import { DIARY_MODEL } from "@/lib/anthropic";
import { residentBlock } from "@/lib/diaryInput";
import { runTown, type Verdict } from "@/lib/engine";
import { PRESETS } from "@/lib/presets";
import type { DiaryLine } from "@/lib/schemas";
import { writeDiaries } from "@/lib/writeDiaries";
import { AMOUNT, amounts, dollars, mark, pad, POLITICS, pool, sentences, wordCount } from "./shared";

const RUNS = 2;
const PRICES = { input: 2, output: 10 }; // claude-sonnet-5-5, $ per million tokens

// Prompt rule 4: Better off -> happy or relieved; Barely affected or Unaffected -> neutral;
// Feels it -> worried; Hard hit -> stressed.
const MOODS_FOR: Record<Verdict, DiaryLine["mood"][]> = {
  better_off: ["happy", "relieved"],
  barely_affected: ["neutral"],
  unaffected: ["neutral"],
  feels_it: ["worried"],
  hard_hit: ["stressed"],
};

interface RunReport {
  preset: string;
  run: number;
  checks: { allArrived: boolean; moods: boolean; amounts: boolean; lengths: boolean; politics: boolean };
  problems: string[];
  inputTokens: number;
  outputTokens: number;
}

async function evalRun(presetIndex: number, run: number): Promise<RunReport> {
  const preset = PRESETS[presetIndex];
  const results = runTown(RESIDENTS, preset.levers);
  const ids = RESIDENTS.map((r) => r.id);
  const diaries = new Map<string, DiaryLine>();
  const problems: string[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  for await (const event of writeDiaries({ policyText: preset.chip, levers: preset.levers, ids })) {
    if (event.type === "diary") diaries.set(event.line.id, event.line);
    else if (event.type === "dropped") problems.push(`a line was dropped (${event.reason})`);
    else if (event.type === "error") problems.push(`stream error: ${event.kind}`);
    if ((event.type === "done" || event.type === "error") && event.stats) {
      inputTokens = event.stats.usage.input_tokens;
      outputTokens = event.stats.usage.output_tokens;
    }
  }

  const checks = { allArrived: true, moods: true, amounts: true, lengths: true, politics: true };
  const missing = ids.filter((id) => !diaries.has(id));
  if (missing.length > 0) {
    checks.allArrived = false;
    problems.push(`missing: ${missing.join(", ")}`);
  }

  for (const resident of RESIDENTS) {
    const diary = diaries.get(resident.id);
    const result = results.find((r) => r.id === resident.id)!;
    if (!diary) continue;
    const text = `${diary.reaction} ${diary.diary}`;

    if (!MOODS_FOR[result.verdict].includes(diary.mood)) {
      checks.moods = false;
      problems.push(`${resident.id}: mood "${diary.mood}" doesn't fit ${result.verdict}`);
    }
    // Every amount must be one the writer was given: this resident's card strings and spare
    // money after (from the engine), or the policy text itself. Anything else was invented.
    const given = new Set([...amounts(residentBlock(resident, result)), ...amounts(preset.chip)]);
    const invented = [...text.matchAll(AMOUNT)].filter((m) => !given.has(Number(m[1].replace(/,/g, ""))));
    if (invented.length > 0) {
      checks.amounts = false;
      const quotes = invented.map((m) => `"${sentences(text).find((s) => s.includes(m[0])) ?? m[0]}"`);
      problems.push(`${resident.id}: ${invented.map((m) => m[0]).join(", ")} not among the given numbers [${[...given].map((a) => `$${a}`).join(", ")}] in ${[...new Set(quotes)].join(" ")}`);
    }
    const words = wordCount(diary.reaction);
    const sentenceTotal = sentences(diary.diary).length;
    if (words > 12 || sentenceTotal < 2 || sentenceTotal > 4) {
      checks.lengths = false;
      problems.push(`${resident.id}: reaction ${words} words, diary ${sentenceTotal} sentences`);
    }
    const political = POLITICS.find((pattern) => pattern.test(text));
    if (political) {
      checks.politics = false;
      problems.push(`${resident.id}: mentions politics (${political.source})`);
    }
  }

  return { preset: preset.chip, run, checks, problems, inputTokens, outputTokens };
}

async function main() {
  console.log(`\nDiary eval · ${DIARY_MODEL} · ${RUNS} runs per preset\n`);
  const filter = process.argv[2]?.toLowerCase();
  const chosen = PRESETS.map((preset, index) => ({ preset, index })).filter(
    ({ preset }) => !filter || preset.id.includes(filter) || preset.chip.toLowerCase().includes(filter),
  );
  const tasks = chosen.flatMap(({ index }) => Array.from({ length: RUNS }, (_, run) => () => evalRun(index, run + 1)));
  const reports = await pool(tasks, 4);

  console.log(`${pad("Preset", 44)}${pad("Run", 5)}${pad("All 8", 7)}${pad("Moods", 7)}${pad("Amounts", 9)}${pad("Lengths", 9)}${pad("Politics", 10)}Result`);
  let passed = 0;
  for (const r of reports) {
    const ok = Object.values(r.checks).every(Boolean) && r.problems.length === 0;
    if (ok) passed += 1;
    const c = r.checks;
    console.log(
      `${pad(r.preset, 44)}${pad(String(r.run), 5)}${pad(mark(c.allArrived), 7)}${pad(mark(c.moods), 7)}${pad(mark(c.amounts), 9)}${pad(mark(c.lengths), 9)}${pad(mark(c.politics), 10)}${ok ? "PASS" : "FAIL"}`,
    );
  }

  const inputTokens = reports.reduce((sum, r) => sum + r.inputTokens, 0);
  const outputTokens = reports.reduce((sum, r) => sum + r.outputTokens, 0);
  const cost = (inputTokens * PRICES.input + outputTokens * PRICES.output) / 1_000_000;
  console.log(`\n${passed}/${reports.length} runs passed · ${inputTokens} in, ${outputTokens} out · ${dollars(cost)}`);

  const failures = reports.flatMap((r) => r.problems.map((p) => `${r.preset} · run ${r.run} · ${p}`));
  if (failures.length > 0) console.log(`\nProblems:\n  ${failures.join("\n  ")}`);
  process.exitCode = passed === reports.length ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
