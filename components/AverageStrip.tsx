import { averageStory } from "@/lib/average";
import type { ResidentResult } from "@/lib/engine";
import type { Expression } from "@/lib/expressions";
import { VERDICT_LABELS } from "@/lib/format";
import type { Resident } from "@/lib/schemas";
import { ResidentAvatar } from "./ResidentAvatar";
import { VERDICT_STYLES } from "./verdictStyles";

// The average resident nobody actually is: faceless, grey, with a dashed outline.
function AverageFigure({ ringClass }: { ringClass: string }) {
  return (
    <svg viewBox="0 0 100 100" width={72} height={72} aria-hidden="true" className="shrink-0">
      <circle cx="50" cy="50" r="50" fill="#ECEAE4" />
      <path d="M12 104 C12 80 28 70 50 70 C72 70 88 80 88 104 Z" fill="#C9C6BE" />
      <ellipse cx="50" cy="44" rx="17" ry="19.5" fill="#C9C6BE" />
      <text x="50" y="53" textAnchor="middle" fontSize="26" fontWeight="800" fill="#ECEAE4">?</text>
      <circle cx="50" cy="50" r="47" fill="none" strokeWidth="4" strokeDasharray="7 5" className={ringClass} />
    </svg>
  );
}

// "Averages hide people": the town's mean resident against the real faces (prd.md > Average vs. the People).
export function AverageStrip({ residents, results, faces }: { residents: Resident[]; results: ResidentResult[]; faces: Record<string, Expression> }) {
  const story = averageStory(residents, results);
  if (!story) return null;
  const { average, headline, hidden } = story;

  return (
    <section aria-label="Average versus the people" className="mt-6 grid gap-5 rounded-lg border-2 border-ink bg-white p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="flex items-center gap-4">
        <AverageFigure ringClass={VERDICT_STYLES[average.verdict].ring} />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/50">Averages hide people</p>
          <p className="mt-1 font-display text-xl font-black leading-tight font-stretch-condensed sm:text-2xl">{headline}</p>
          <p className="mt-1 text-[15px] text-ink/75">{hidden}</p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-2 lg:flex-nowrap lg:justify-end" aria-label="The real residents">
        {residents.map((resident) => {
          const result = results.find((r) => r.id === resident.id);
          if (!result) return null;
          const style = VERDICT_STYLES[result.verdict];
          return (
            <li key={resident.id} className="flex flex-col items-center" title={`${resident.shortName}: ${VERDICT_LABELS[result.verdict]}`}>
              <ResidentAvatar id={resident.id} look={resident.look} expression={faces[resident.id] ?? "neutral"} size={38} ringClass={style.ring} />
              <span className="sr-only">
                {resident.shortName}: {VERDICT_LABELS[result.verdict]}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
