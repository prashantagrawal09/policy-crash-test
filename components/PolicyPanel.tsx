import { leverText } from "@/lib/format";
import type { CrashRun } from "@/lib/useCrashTest";

// "How the AI read this policy" or "How this preset is set up" (prd.md > How the Policy Was Read).
// Always open. A preset is never described as read by the AI.
export function PolicyPanel({ run }: { run: CrashRun }) {
  const isPreset = run.source.kind === "preset";
  const isWhatIf = run.source.kind === "whatif";

  return (
    <aside className="flex flex-col rounded-lg border-2 border-ink bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="font-display text-2xl font-black leading-tight font-stretch-condensed">
          {isPreset ? "How this preset is set up" : isWhatIf ? "How this what-if is set up" : "How the AI read this policy"}
        </h2>
        {isPreset ? (
          <span className="rounded border border-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wider">
            Hand-checked preset
          </span>
        ) : isWhatIf ? (
          <span className="rounded bg-hazard px-2 py-0.5 text-xs font-bold uppercase tracking-wider">Your what-if</span>
        ) : (
          run.confidence && (
            <span
              className={`rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                run.confidence === "low" ? "bg-feels text-ink" : "border border-ink/40 text-ink/70"
              }`}
            >
              {run.confidence} confidence
            </span>
          )
        )}
      </div>
      <p className="mt-2 text-sm text-ink/60">“{run.policyText}”</p>

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink/55">What changes</h3>
      {run.levers.length > 0 ? (
        <ul className="mt-1.5 space-y-1.5 text-[15px] leading-snug">
          {run.levers.map((lever, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink" aria-hidden />
              {leverText(lever)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-[15px]">Nothing that changes anyone&apos;s monthly budget.</p>
      )}

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink/55">Assumptions</h3>
      {run.assumptions.length > 0 ? (
        <ul className="mt-1.5 space-y-1.5 text-[15px] leading-snug">
          {run.assumptions.map((assumption, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink/40" aria-hidden />
              {assumption}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-[15px] text-ink/60">None needed.</p>
      )}

      {isPreset && <p className="mt-auto pt-5 text-sm text-ink/60">Type your own policy to watch the AI read it live.</p>}
    </aside>
  );
}
