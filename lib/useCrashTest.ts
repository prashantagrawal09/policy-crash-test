"use client";

import { useEffect, useRef, useState } from "react";
import { RESIDENTS } from "@/data/residents";
import { runTown, type ResidentResult } from "@/lib/engine";
import { leverText } from "@/lib/format";
import { getPreset } from "@/lib/presets";
import { withValue } from "@/lib/whatIf";
import { buildYou, YourAnswersSchema, type YourAnswers } from "@/lib/yourself";
import { ChatterLineSchema, DiaryLineSchema, ParseResultSchema, type ChatterLine, type DiaryLine, type Lever, type ParseResult, type Resident } from "@/lib/schemas";

// The browser-side run controller: owns the text box, the current run, its phase and its diaries.

// "numbers" is never shown: the engine is instant (spec small call 10, no artificial delays).
export type Phase = "idle" | "reading" | "writing" | "done";

export interface CrashRun {
  runId: number;
  // "whatif": diaries rewritten for slider values the visitor chose, not a preset or a typed policy.
  source: { kind: "preset"; presetId: string } | { kind: "typed" } | { kind: "whatif" };
  policyText: string;
  levers: Lever[];
  assumptions: string[];
  confidence: ParseResult["confidence"] | null; // null for hand-checked presets
  results: ResidentResult[];
  you: YourAnswers | null; // your answers, if you'd moved in: sent only with the diary request
}

export type DiaryState = { status: "pending" } | { status: "arrived"; line: DiaryLine } | { status: "failed" };

// The town chatter for the current run (prd.md > Town Chatter): asked for once the diaries are in.
// "failed" means nothing came through; the rest of the page carries on without it.
export interface ChatterState {
  status: "idle" | "waiting" | "done" | "failed";
  remarks: ChatterLine[];
}

// A message under the text box: the AI's not-a-policy reason, or the couldn't-read error.
export type InputMessage = { kind: "not_policy"; text: string } | { kind: "error"; text: string };

export const COULDNT_READ = "Couldn't read that one right now. Try again, or tap a preset.";

const DIARY_TIMEOUT_MS = 20_000;
const CHATTER_TIMEOUT_MS = 20_000;
const NO_CHATTER: ChatterState = { status: "idle", remarks: [] };

// The 8 residents, plus you if you've moved in (prd.md > Add Yourself).
function townWith(you: YourAnswers | null): Resident[] {
  return you ? [...RESIDENTS, buildYou(you)] : RESIDENTS;
}

// One line of the diary stream; anything that isn't a well-formed diary is ignored.
function parseDiaryEvent(line: string): DiaryLine | null {
  try {
    const event = JSON.parse(line);
    if (event?.type !== "diary") return null;
    const diary = DiaryLineSchema.safeParse(event);
    return diary.success ? diary.data : null;
  } catch {
    return null;
  }
}

// One line of the chatter stream; anything that isn't a well-formed remark is ignored.
function parseRemarkEvent(line: string): ChatterLine | null {
  try {
    const event = JSON.parse(line);
    if (event?.type !== "remark") return null;
    const remark = ChatterLineSchema.safeParse(event);
    return remark.success && RESIDENTS.some((r) => r.id === remark.data.speaker) && RESIDENTS.some((r) => r.id === remark.data.listener)
      ? remark.data
      : null;
  } catch {
    return null;
  }
}

export function useCrashTest() {
  const [text, setText] = useState("");
  // The chip whose text is in the box, until that text is edited. Only then do the
  // hand-checked preset levers apply (small call 9: tracked by origin, not by matching).
  const [textPresetId, setTextPresetId] = useState<string | null>(null);
  // The current run's phase, kept apart from reading a typed policy: the old run's diaries
  // can still be landing while a new policy is read, and a failed read leaves them alone.
  const [runPhase, setRunPhase] = useState<"idle" | "writing" | "done">("idle");
  const [reading, setReading] = useState(false);
  const [run, setRun] = useState<CrashRun | null>(null);
  const [diaries, setDiaries] = useState<Record<string, DiaryState>>({});
  const [message, setMessage] = useState<InputMessage | null>(null);
  // What-if slider values over the current run's levers; null means the policy as written.
  const [adjusted, setAdjusted] = useState<Lever[] | null>(null);
  const [chatter, setChatter] = useState<ChatterState>(NO_CHATTER);
  // Your answers if you've moved in; nothing is saved, so a refresh moves you out.
  const [you, setYou] = useState<YourAnswers | null>(null);
  const youRef = useRef<YourAnswers | null>(null);
  const runIdRef = useRef(0);
  const diaryRequest = useRef<AbortController | null>(null);
  const chatterRequest = useRef<AbortController | null>(null);
  const chatterRun = useRef<number | null>(null); // the run whose chatter was asked for

  useEffect(
    () => () => {
      diaryRequest.current?.abort();
      chatterRequest.current?.abort();
    },
    [],
  );

  // Streams diaries for one run into its cards. Lines from an older run are ignored;
  // when the stream ends, fails or passes 20 seconds, anything still pending has failed.
  async function requestDiaries(target: CrashRun, ids: string[]) {
    const controller = new AbortController();
    diaryRequest.current = controller;
    const timer = setTimeout(() => controller.abort(), DIARY_TIMEOUT_MS);
    const isCurrent = () => runIdRef.current === target.runId;

    try {
      const response = await fetch("/api/diaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Your answers go only with the diary request, and only when your diary is asked for.
        body: JSON.stringify({ policyText: target.policyText, levers: target.levers, residentIds: ids, ...(ids.includes("you") && target.you ? { you: target.you } : {}) }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) return;

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const diary = parseDiaryEvent(line);
          if (diary && isCurrent()) {
            setDiaries((current) => ({ ...current, [diary.id]: { status: "arrived", line: diary } }));
          }
        }
      }
    } catch {
      // Aborted by a newer run or the 20-second timer, or a network error: handled below.
    } finally {
      clearTimeout(timer);
      if (isCurrent()) {
        setDiaries((current) =>
          Object.fromEntries(
            Object.entries(current).map(([id, state]) => [id, state.status === "pending" ? { status: "failed" } : state]),
          ),
        );
        setRunPhase("done");
        void requestChatter(target);
      }
      if (diaryRequest.current === controller) diaryRequest.current = null;
    }
  }

  // Once a run's diaries are in, the neighbours talk: remarks stream in as they're written.
  // Asked for once per run (a diary retry doesn't ask again); late lines from an older run are ignored.
  async function requestChatter(target: CrashRun) {
    if (chatterRun.current === target.runId) return;
    chatterRun.current = target.runId;
    const controller = new AbortController();
    chatterRequest.current = controller;
    const timer = setTimeout(() => controller.abort(), CHATTER_TIMEOUT_MS);
    const isCurrent = () => runIdRef.current === target.runId;
    setChatter({ status: "waiting", remarks: [] });

    try {
      const response = await fetch("/api/chatter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyText: target.policyText, levers: target.levers }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) return;

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const remark = parseRemarkEvent(line);
          if (remark && isCurrent()) setChatter((current) => ({ ...current, remarks: [...current.remarks, remark] }));
        }
      }
    } catch {
      // Aborted by a newer run or the 20-second timer, or a network error: handled below.
    } finally {
      clearTimeout(timer);
      if (isCurrent()) setChatter((current) => ({ ...current, status: current.remarks.length > 0 ? "done" : "failed" }));
      if (chatterRequest.current === controller) chatterRequest.current = null;
    }
  }

  // A new run replaces the old one: its diary request is cancelled and its late lines dropped.
  function startRun(source: CrashRun["source"], policyText: string, levers: Lever[], assumptions: string[], confidence: CrashRun["confidence"]) {
    diaryRequest.current?.abort();
    chatterRequest.current?.abort();
    runIdRef.current += 1;
    const next: CrashRun = {
      runId: runIdRef.current,
      source,
      policyText,
      levers,
      assumptions,
      confidence,
      results: runTown(townWith(youRef.current), levers),
      you: youRef.current,
    };
    const ids = next.results.map((r) => r.id);
    setRun(next);
    setAdjusted(null);
    setChatter(NO_CHATTER);
    setDiaries(Object.fromEntries(ids.map((id) => [id, { status: "pending" }])));
    setRunPhase("writing");
    void requestDiaries(next, ids);
  }

  function editText(value: string) {
    setText(value);
    setTextPresetId(null);
  }

  function runPreset(presetId: string) {
    const preset = getPreset(presetId);
    if (!preset) return;
    setText(preset.chip);
    setTextPresetId(presetId);
    setMessage(null);
    startRun({ kind: "preset", presetId }, preset.chip, preset.levers, preset.assumptions, null);
  }

  // A typed policy is read by the AI first. If it isn't a policy, or can't be read,
  // the message goes under the box and the town stays as it was.
  async function runTyped(policyText: string) {
    setMessage(null);
    setReading(true);
    try {
      const response = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: policyText }),
      });
      const body = await response.json().catch(() => null);
      const parsed = response.ok && body?.ok ? ParseResultSchema.safeParse(body.result) : null;
      if (!parsed?.success) throw new Error("couldn't read");

      const result = parsed.data;
      if (!result.isPolicy) {
        setMessage({ kind: "not_policy", text: result.rejectReason || "That doesn't look like a policy. Try a change to prices, fees or payments." });
        return;
      }
      startRun({ kind: "typed" }, policyText, result.levers, result.assumptions, result.confidence);
    } catch {
      setMessage({ kind: "error", text: COULDNT_READ });
    } finally {
      setReading(false);
    }
  }

  function runCurrent() {
    if (reading || !text.trim()) return;
    if (textPresetId) runPreset(textPresetId);
    else void runTyped(text.trim());
  }

  // "Retry diaries" asks only for the ones that didn't come through; arrived diaries stay.
  function retryDiaries() {
    if (!run || reading || runPhase !== "done") return;
    const failed = Object.keys(diaries).filter((id) => diaries[id].status === "failed");
    if (failed.length === 0) return;
    setDiaries((current) => ({ ...current, ...Object.fromEntries(failed.map((id) => [id, { status: "pending" }])) }));
    setRunPhase("writing");
    void requestDiaries(run, failed);
  }

  // Sliding a value re-runs the engine at once; diaries wait until asked for again.
  function setLeverValue(index: number, value: number) {
    if (!run) return;
    const next = withValue(adjusted ?? run.levers, index, value);
    setAdjusted(next.every((lever, i) => lever.value === run.levers[i].value) ? null : next);
  }

  function resetWhatIf() {
    setAdjusted(null);
  }

  // "Write new diaries": the what-if becomes a run of its own, so diaries match the new numbers.
  function rewriteDiaries() {
    if (!run || !adjusted || reading) return;
    const policyText = `${run.policyText} (what-if: ${adjusted.map(leverText).join("; ")})`.slice(0, 500);
    startRun({ kind: "whatif" }, policyText, adjusted, run.assumptions, run.confidence);
  }

  // Moving in or out while a run is on screen: the numbers re-run at once, and only your diary
  // is written (moving is only offered between runs, never while diaries are being written).
  const busy = reading || runPhase === "writing";

  function moveIn(answers: YourAnswers): boolean {
    const parsed = YourAnswersSchema.safeParse(answers);
    if (!parsed.success || busy) return false;
    youRef.current = parsed.data;
    setYou(parsed.data);
    if (run) {
      const updated: CrashRun = { ...run, you: parsed.data, results: runTown(townWith(parsed.data), run.levers) };
      setRun(updated);
      setDiaries((current) => ({ ...current, you: { status: "pending" } }));
      setRunPhase("writing");
      void requestDiaries(updated, ["you"]);
    }
    return true;
  }

  function moveOut() {
    if (busy) return;
    youRef.current = null;
    setYou(null);
    if (run) {
      setRun({ ...run, you: null, results: runTown(RESIDENTS, run.levers) });
      setDiaries((current) => Object.fromEntries(Object.entries(current).filter(([id]) => id !== "you")));
    }
  }

  const town = townWith(you);
  const activeLevers = adjusted ?? run?.levers ?? null;
  const activeResults = run ? (adjusted ? runTown(town, adjusted) : run.results) : null;

  const phase: Phase = reading ? "reading" : runPhase;
  const canRun = text.trim().length > 0 && !reading;
  const failedDiaries = Object.values(diaries).filter((d) => d.status === "failed").length;

  return {
    text, editText, runPreset, runCurrent, canRun, phase, run, diaries, failedDiaries, retryDiaries, message, chatter,
    town, you, moveIn, moveOut, busy,
    adjusted, activeLevers, activeResults, setLeverValue, resetWhatIf, rewriteDiaries,
  };
}
