"use client";

import { useEffect, useRef, useState } from "react";
import { RESIDENTS } from "@/data/residents";
import { runTown, type ResidentResult } from "@/lib/engine";
import { getPreset } from "@/lib/presets";
import { DiaryLineSchema, type DiaryLine, type Lever, type ParseResult } from "@/lib/schemas";

// The browser-side run controller: owns the text box, the current run, its phase and its diaries.

export type Phase = "idle" | "reading" | "numbers" | "writing" | "done";

export interface CrashRun {
  runId: number;
  source: { kind: "preset"; presetId: string } | { kind: "typed" };
  policyText: string;
  levers: Lever[];
  assumptions: string[];
  confidence: ParseResult["confidence"] | null; // null for hand-checked presets
  results: ResidentResult[];
}

export type DiaryState = { status: "pending" } | { status: "arrived"; line: DiaryLine } | { status: "failed" };

const DIARY_TIMEOUT_MS = 20_000;

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

export function useCrashTest() {
  const [text, setText] = useState("");
  // The chip whose text is in the box, until that text is edited. Only then do the
  // hand-checked preset levers apply (small call 9: tracked by origin, not by matching).
  const [textPresetId, setTextPresetId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [run, setRun] = useState<CrashRun | null>(null);
  const [diaries, setDiaries] = useState<Record<string, DiaryState>>({});
  const runIdRef = useRef(0);
  const diaryRequest = useRef<AbortController | null>(null);

  useEffect(() => () => diaryRequest.current?.abort(), []);

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
        body: JSON.stringify({ policyText: target.policyText, levers: target.levers, residentIds: ids }),
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
        setPhase("done");
      }
      if (diaryRequest.current === controller) diaryRequest.current = null;
    }
  }

  // A new run replaces the old one: its diary request is cancelled and its late lines dropped.
  function startRun(source: CrashRun["source"], policyText: string, levers: Lever[], assumptions: string[], confidence: CrashRun["confidence"]) {
    diaryRequest.current?.abort();
    runIdRef.current += 1;
    const next: CrashRun = {
      runId: runIdRef.current,
      source,
      policyText,
      levers,
      assumptions,
      confidence,
      results: runTown(RESIDENTS, levers),
    };
    const ids = RESIDENTS.map((r) => r.id);
    setRun(next);
    setDiaries(Object.fromEntries(ids.map((id) => [id, { status: "pending" }])));
    setPhase("writing");
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
    startRun({ kind: "preset", presetId }, preset.chip, preset.levers, preset.assumptions, null);
  }

  function runCurrent() {
    if (textPresetId) runPreset(textPresetId);
    // Typed policies go to the parser (slice 4).
  }

  // "Retry diaries" asks only for the ones that didn't come through; arrived diaries stay.
  function retryDiaries() {
    if (!run || phase !== "done") return;
    const failed = Object.keys(diaries).filter((id) => diaries[id].status === "failed");
    if (failed.length === 0) return;
    setDiaries((current) => ({ ...current, ...Object.fromEntries(failed.map((id) => [id, { status: "pending" }])) }));
    setPhase("writing");
    void requestDiaries(run, failed);
  }

  const canRun = text.trim().length > 0 && phase !== "reading" && textPresetId !== null;
  const failedDiaries = Object.values(diaries).filter((d) => d.status === "failed").length;

  return { text, editText, runPreset, runCurrent, canRun, phase, run, diaries, failedDiaries, retryDiaries };
}
