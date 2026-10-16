"use client";

import { leverText } from "@/lib/format";
import type { Lever } from "@/lib/schemas";
import { formatLeverValue, sliderSpec } from "@/lib/whatIf";

interface Props {
  levers: Lever[]; // what the town is running now (the what-if, or the policy as written)
  policyLevers: Lever[]; // the policy as written
  adjusted: boolean;
  onChange: (index: number, value: number) => void;
  onReset: () => void;
  onRewrite: () => void;
  busy: boolean; // a policy is being read
}

// Drag a policy's numbers and watch the town move, instantly and without the AI
// (prd.md > What-if Sliders and Tipping Points).
export function WhatIf({ levers, policyLevers, adjusted, onChange, onReset, onRewrite, busy }: Props) {
  if (levers.length === 0) return null;

  return (
    <section aria-label="What if" className="mt-6 rounded-lg border border-ink/15 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-2xl font-black font-stretch-condensed">What if…</h2>
        <p className="text-xs text-ink/55">
          {adjusted ? "Exploring. The diaries below were written for the policy as written." : "Drag a number and the whole town re-runs instantly."}
        </p>
      </div>

      <div className="mt-3 space-y-4">
        {levers.map((lever, index) => {
          const spec = sliderSpec(policyLevers[index]);
          const original = policyLevers[index].value;
          const id = `whatif-${index}`;
          const changed = lever.value !== original;
          return (
            <div key={index}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <label htmlFor={id} className="text-[15px] font-medium">
                  {leverText(lever)}
                </label>
                <span className="text-sm tabular-nums">
                  <span className={`font-bold ${changed ? "rounded bg-hazard px-1.5" : ""}`}>{formatLeverValue(lever, lever.value)}</span>
                  {changed && <span className="ml-2 text-ink/55">the policy said {formatLeverValue(lever, original)}</span>}
                </span>
              </div>
              <input
                id={id}
                type="range"
                min={spec.min}
                max={spec.max}
                step={spec.step}
                value={lever.value}
                aria-valuetext={formatLeverValue(lever, lever.value)}
                onChange={(event) => onChange(index, Number(event.target.value))}
                className="mt-2 h-2 w-full cursor-pointer accent-[#111111]"
              />
              <div className="mt-0.5 flex justify-between text-[11px] tabular-nums text-ink/45" aria-hidden>
                <span>{formatLeverValue(lever, spec.min)}</span>
                <span>{formatLeverValue(lever, spec.max)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {adjusted && (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onRewrite}
            disabled={busy}
            className="rounded-md border-2 border-ink bg-hazard px-3.5 py-1.5 text-sm font-bold transition-colors hover:bg-ink hover:text-hazard disabled:opacity-50"
          >
            Write new diaries
          </button>
          <button type="button" onClick={onReset} className="rounded-md border-2 border-ink bg-white px-3.5 py-1.5 text-sm font-semibold transition-colors hover:bg-paper">
            Back to the policy
          </button>
        </div>
      )}
    </section>
  );
}
