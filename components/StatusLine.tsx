import type { ResidentResult } from "@/lib/engine";
import { summaryBeforeRun, summaryLine, summaryParts } from "@/lib/format";
import type { Phase } from "@/lib/useCrashTest";
import { VERDICT_STYLES } from "./verdictStyles";

interface Props {
  phase: Phase;
  results: ResidentResult[] | null;
  residentCount: number;
}

// The waiting steps, then the one-line town summary (prd.md > Town Summary). Announced to screen readers.
export function StatusLine({ results, residentCount }: Props) {
  const allUnaffected = results !== null && results.every((r) => r.verdict === "unaffected");

  return (
    <section aria-live="polite" className="mt-12 border-t-2 border-ink pt-5">
      {results === null || allUnaffected ? (
        <p className="font-display text-3xl font-black leading-tight font-stretch-condensed sm:text-4xl">
          {results === null ? summaryBeforeRun(residentCount) : summaryLine(results)}
        </p>
      ) : (
        <p className="flex flex-wrap items-center gap-x-1 gap-y-2 font-display text-3xl font-black leading-tight font-stretch-condensed sm:text-4xl">
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
    </section>
  );
}
