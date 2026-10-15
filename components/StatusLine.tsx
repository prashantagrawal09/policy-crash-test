import type { ResidentResult } from "@/lib/engine";
import { summaryBeforeRun, summaryLine, summaryParts } from "@/lib/format";
import type { Phase } from "@/lib/useCrashTest";
import { VERDICT_STYLES } from "./verdictStyles";

interface Props {
  phase: Phase;
  results: ResidentResult[] | null;
  residentCount: number;
  failedDiaries: number;
  onRetryDiaries: () => void;
}

// The waiting steps, then the one-line town summary (prd.md > Town Summary). Announced to screen readers.
export function StatusLine({ phase, results, residentCount, failedDiaries, onRetryDiaries }: Props) {
  const allUnaffected = results !== null && results.every((r) => r.verdict === "unaffected");
  const headline = "font-display text-3xl font-black leading-tight font-stretch-condensed sm:text-4xl";

  return (
    <section aria-live="polite" className="mt-12 border-t-2 border-ink pt-5">
      {phase === "reading" ? (
        <p className={`flex items-center gap-3 ${headline}`}>
          <span className="h-3 w-3 animate-pulse rounded-full bg-hazard ring-2 ring-ink motion-reduce:animate-none" aria-hidden />
          Reading the policy
        </p>
      ) : results === null || allUnaffected ? (
        <p className={headline}>{results === null ? summaryBeforeRun(residentCount) : summaryLine(results)}</p>
      ) : (
        <p className={`flex flex-wrap items-center gap-x-1 gap-y-2 ${headline}`}>
          {summaryParts(results).map((part, index, parts) => (
            <span key={part.verdict} className="mr-2 inline-flex items-center gap-2">
              <span className={`inline-block h-4 w-4 rounded-sm ${VERDICT_STYLES[part.verdict].swatch}`} aria-hidden />
              <span>
                {part.text}
                {index < parts.length - 1 && ","}
              </span>
            </span>
          ))}
        </p>
      )}

      {phase === "writing" && (
        <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-ink/60">
          <span className="h-2 w-2 animate-pulse rounded-full bg-hazard ring-2 ring-ink/80 motion-reduce:animate-none" aria-hidden />
          Writing diaries
        </p>
      )}
      {phase === "done" && failedDiaries > 0 && (
        <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink/70">
          {failedDiaries === 1 ? "1 diary didn't come through." : `${failedDiaries} diaries didn't come through.`}
          <button
            type="button"
            onClick={onRetryDiaries}
            className="rounded-md border-2 border-ink bg-white px-3 py-1 text-sm font-semibold transition-colors hover:bg-hazard"
          >
            Retry diaries
          </button>
        </p>
      )}
    </section>
  );
}
