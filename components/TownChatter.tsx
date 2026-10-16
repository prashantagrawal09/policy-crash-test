import type { Expression } from "@/lib/expressions";
import type { ChatterLine, Resident } from "@/lib/schemas";
import type { ChatterState } from "@/lib/useCrashTest";
import { ResidentAvatar } from "./ResidentAvatar";

interface Props {
  residents: Resident[];
  status: ChatterState["status"];
  received: number; // remarks in from the stream so far
  spoken: ChatterLine[]; // the ones said so far, in order
  speaking: ChatterLine | null;
  faces: Record<string, Expression>;
  stale: boolean; // exploring a what-if: this was said about the policy as written
}

function Typing({ label }: { label?: string }) {
  return (
    <li className="flex items-center gap-3 text-sm text-ink/55">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center gap-0.5 rounded-full bg-paper" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-ink/60" style={{ animationDelay: `${i * 160}ms` }} />
        ))}
      </span>
      <span className={label ? "" : "sr-only"}>{label ?? "More coming"}</span>
    </li>
  );
}

// The residents talking to each other about the policy (prd.md > Town Chatter), said one remark
// at a time. Nothing shows until it starts, and nothing at all if it didn't come through.
export function TownChatter({ residents, status, received, spoken, speaking, faces, stale }: Props) {
  if (status === "idle" || (status === "failed" && received === 0)) return null;
  const nameOf = (id: string) => residents.find((r) => r.id === id)?.shortName ?? id;
  const moreComing = status === "waiting" || spoken.length < received;

  return (
    <section aria-label="Town chatter" className={`mt-6 rounded-lg border border-ink/15 bg-white p-5 ${stale ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-2xl font-black font-stretch-condensed">Town chatter</h2>
        <p className="text-xs text-ink/55">{stale ? "Said about the policy as written." : "Written by AI from each person's numbers."}</p>
      </div>
      <ol className="mt-3 space-y-3" aria-live="polite">
        {spoken.map((remark, index) => {
          const now = remark === speaking;
          return (
            <li key={index} className="talk-in flex items-start gap-3">
              <span className={`shrink-0 rounded-full bg-white ${now ? "ring-4 ring-hazard" : ""}`}>
                <ResidentAvatar id={remark.speaker} expression={faces[remark.speaker] ?? "neutral"} size={36} />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-ink/55">
                  <span className="font-bold text-ink">{nameOf(remark.speaker)}</span> to {nameOf(remark.listener)}
                </p>
                <p
                  className={`mt-1 inline-block rounded-2xl rounded-tl-sm border px-3 py-1.5 font-diary text-[15px] italic leading-snug text-ink transition-colors duration-300 motion-reduce:transition-none ${
                    now ? "border-ink bg-hazard/25" : "border-ink/15 bg-diary"
                  }`}
                >
                  {remark.text}
                </p>
              </div>
            </li>
          );
        })}
        {moreComing && <Typing label={spoken.length === 0 ? "The neighbours are talking…" : undefined} />}
      </ol>
    </section>
  );
}
