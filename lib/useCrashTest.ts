"use client";

import { useRef, useState } from "react";
import { RESIDENTS } from "@/data/residents";
import { runTown, type ResidentResult } from "@/lib/engine";
import { getPreset } from "@/lib/presets";
import type { Lever, ParseResult } from "@/lib/schemas";

// The browser-side run controller: owns the text box, the current run and its phase.

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

export function useCrashTest() {
  const [text, setText] = useState("");
  // The chip whose text is in the box, until that text is edited. Only then do the
  // hand-checked preset levers apply (small call 9: tracked by origin, not by matching).
  const [textPresetId, setTextPresetId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [run, setRun] = useState<CrashRun | null>(null);
  const runCounter = useRef(0);

  function editText(value: string) {
    setText(value);
    setTextPresetId(null);
  }

  function runPreset(presetId: string) {
    const preset = getPreset(presetId);
    if (!preset) return;
    setText(preset.chip);
    setTextPresetId(presetId);
    runCounter.current += 1;
    setRun({
      runId: runCounter.current,
      source: { kind: "preset", presetId },
      policyText: preset.chip,
      levers: preset.levers,
      assumptions: preset.assumptions,
      confidence: null,
      results: runTown(RESIDENTS, preset.levers),
    });
    setPhase("done");
  }

  function runCurrent() {
    if (textPresetId) runPreset(textPresetId);
    // Typed policies go to the parser (slice 4).
  }

  const canRun = text.trim().length > 0 && phase !== "reading" && textPresetId !== null;

  return { text, editText, runPreset, runCurrent, canRun, phase, run };
}
