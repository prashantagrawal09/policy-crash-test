"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import type { ResidentResult } from "@/lib/engine";
import type { Expression } from "@/lib/expressions";
import { DAYS, dayValueText, goneByDay, monthHeadline, spareOnDay } from "@/lib/month";
import type { Resident } from "@/lib/schemas";
import { ResidentAvatar } from "./ResidentAvatar";

// A month in the life (prd.md > A Month in the Life): play or scrub through 30 days and watch
// each person's spare money shrink or grow as the change adds up. Engine numbers only, no AI.

const STEP_MS = 260; // one day while playing: the month takes about 8 seconds

interface Props {
  residents: Resident[];
  results: ResidentResult[];
  faces: Record<string, Expression>;
  runId: number | null;
}

// Grey for what's left of the starting spare money, red for what the change has eaten, green for
// what it has added, and hazard stripes for how far below zero it goes. One scale per person:
// the most they hold during the month plus the deepest they go below zero.
function DayBar({ result, day }: { result: ResidentResult; day: number }) {
  const start = Math.max(result.cents.spare, 0);
  const value = spareOnDay(result, day);
  const deepest = Math.min(0, spareOnDay(result, DAYS));
  const scale = Math.max(start, spareOnDay(result, 1), spareOnDay(result, DAYS), 1) - deepest;
  const pct = (cents: number) => `${(Math.max(0, cents) / scale) * 100}%`;
  const bar = "h-full transition-[width] duration-200 ease-linear motion-reduce:transition-none";
  return (
    <div className="flex h-3.5 w-full overflow-hidden rounded-sm bg-paper" aria-hidden>
      <div className={`${bar} bg-ink/25`} style={{ width: pct(Math.min(Math.max(value, 0), start)) }} />
      <div className={`${bar} bg-hard`} style={{ width: pct(start - Math.max(Math.min(value, start), 0)) }} />
      <div className={`${bar} bg-better`} style={{ width: pct(value - start) }} />
      <div className={`${bar} hazard-stripes`} style={{ width: pct(-value) }} />
    </div>
  );
}

export function MonthInLife({ residents, results, faces, runId }: Props) {
  // A new run starts the month again at payday.
  const [state, setState] = useState({ runId, day: 0, playing: false });
  const current = state.runId === runId ? state : { runId, day: 0, playing: false };
  const { day, playing } = current;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setState({ runId, day: day + 1, playing: day + 1 < DAYS }), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [playing, day, runId]);

  const rows = residents.flatMap((resident) => {
    const result = results.find((r) => r.id === resident.id);
    return result ? [{ resident, result }] : [];
  });

  return (
    <section aria-label="A month in the life" className="mt-6 rounded-lg border border-ink/15 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-2xl font-black font-stretch-condensed">A month in the life</h2>
        <p className="text-xs text-ink/55">The change spread evenly over {DAYS} days; a one-off lands on day 1. A simplification.</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={() => setState({ runId, day: day >= DAYS ? 0 : day, playing: !playing })}
          className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-hazard px-3 py-1.5 text-sm font-bold transition-colors hover:bg-ink hover:text-hazard"
        >
          {playing ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
          {playing ? "Pause" : day >= DAYS ? "Play again" : "Play the month"}
        </button>
        <label htmlFor="month-day" className="flex min-w-[200px] flex-1 items-center gap-3">
          <span className="w-14 shrink-0 text-sm font-bold tabular-nums">Day {day}</span>
          <input
            id="month-day"
            type="range"
            min={0}
            max={DAYS}
            step={1}
            value={day}
            aria-valuetext={`Day ${day} of ${DAYS}`}
            onChange={(event) => setState({ runId, day: Number(event.target.value), playing: false })}
            className="h-2 w-full cursor-pointer accent-[#111111]"
          />
        </label>
      </div>

      <p className="mt-3 font-display text-xl font-black leading-tight font-stretch-condensed sm:text-2xl">{monthHeadline(rows, day)}</p>

      <ul className="mt-3 space-y-2">
        {rows.map(({ resident, result }) => {
          const value = spareOnDay(result, day);
          const gone = goneByDay(result);
          const ranOut = gone !== null && gone > 0 && day >= gone && result.verdict !== "unaffected";
          return (
            <li key={resident.id} className="grid grid-cols-[7.25rem_minmax(0,1fr)_5.75rem] items-center gap-2 sm:grid-cols-[9rem_minmax(0,1fr)_8rem] sm:gap-3">
              <span className="flex min-w-0 items-center gap-1.5">
                <ResidentAvatar id={resident.id} look={resident.look} expression={ranOut ? "stressed" : (faces[resident.id] ?? "neutral")} size={28} className="shrink-0" />
                <span className="truncate text-sm font-semibold">{resident.shortName}</span>
              </span>
              <DayBar result={result} day={day} />
              <span className="text-right text-sm leading-tight tabular-nums">
                {result.verdict === "unaffected" && result.cents.spare > 0 ? (
                  <span className="text-ink/50">{dayValueText(value)}</span>
                ) : (
                  <span className={`font-semibold ${value < 0 ? "text-hard" : ""}`}>{dayValueText(value)}</span>
                )}
                {gone === 0 && <span className="block text-[11px] text-ink/50">no spare money</span>}
                {ranOut && <span className="mt-0.5 inline-block rounded bg-hard px-1 text-[10.5px] font-bold uppercase text-white">Gone by day {gone}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
