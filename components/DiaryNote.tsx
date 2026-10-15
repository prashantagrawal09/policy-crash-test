import type { DiaryLine } from "@/lib/schemas";
import type { DiaryState } from "@/lib/useCrashTest";

// Mood tag colours follow the verdict they fit (prompt rule 4).
const MOOD_STYLES: Record<DiaryLine["mood"], string> = {
  happy: "border-better text-better",
  relieved: "border-better text-better",
  neutral: "border-barely text-ink/60",
  worried: "border-feels text-[#8a5800]",
  stressed: "border-hard text-hard",
};

// The resident's diary: a mood tag, a short reaction and a few first-person sentences on
// notebook paper; a shimmer while it's being written; a quiet note if it didn't come through.
export function DiaryNote({ state }: { state: DiaryState }) {
  if (state.status === "pending") {
    return (
      <div className="diary-paper rounded-md p-4" aria-label="Diary being written">
        <div className="shimmer h-3 w-2/3 rounded-sm" />
        <div className="shimmer mt-3 h-3 w-full rounded-sm" />
        <div className="shimmer mt-3 h-3 w-5/6 rounded-sm" />
      </div>
    );
  }

  if (state.status === "failed") {
    return (
      <div className="diary-paper rounded-md p-4 text-sm text-ink/55">
        Diary didn&apos;t come through
      </div>
    );
  }

  const { mood, reaction, diary } = state.line;
  return (
    <figure className="diary-paper rounded-md px-4 pb-3 pt-2.5">
      <figcaption className="flex items-start gap-2">
        <span className={`mt-[3px] shrink-0 rounded border px-1.5 py-px text-[11px] font-semibold uppercase tracking-wider ${MOOD_STYLES[mood]}`}>
          {mood}
        </span>
        <span className="font-diary text-[15px] font-semibold italic leading-6">{reaction}</span>
      </figcaption>
      <blockquote className="mt-1 font-diary text-[15px] italic leading-6 text-ink/85">{diary}</blockquote>
    </figure>
  );
}
