import { spareMoney, type ResidentResult } from "@/lib/engine";
import { cardText, incomeText, money } from "@/lib/format";
import type { Resident } from "@/lib/schemas";
import type { Expression } from "@/lib/expressions";
import type { DiaryState } from "@/lib/useCrashTest";
import { DiaryNote } from "./DiaryNote";
import { ResidentAvatar } from "./ResidentAvatar";
import { SpareMoneyBar } from "./SpareMoneyBar";
import { VERDICT_STYLES } from "./verdictStyles";

interface Props {
  resident: Resident;
  result: ResidentResult | null; // null before any run
  diary: DiaryState | null; // null before any run
  expression: Expression; // the character's face (lib/expressions.ts)
  waiting: boolean; // a typed policy is being read: the card shimmers in place
}

// One resident's card, before and after a run (prd.md > Resident Cards): who they are, what the
// policy does to their money, then how it feels. Cards never move; only contents and colour change.
export function ResidentCard({ resident, result, diary, expression, waiting }: Props) {
  const verdict = result?.verdict ?? null;
  const style = verdict ? VERDICT_STYLES[verdict] : null;
  const text = result ? cardText(result) : null;
  const showChange = text !== null && verdict !== "unaffected";

  return (
    <article
      id={`card-${resident.id}`}
      tabIndex={-1}
      aria-label={resident.name}
      className={`flex flex-col overflow-hidden rounded-lg border border-ink/15 transition-colors duration-300 motion-reduce:transition-none ${
        style?.tint ?? "bg-white"
      } ${waiting ? "animate-pulse motion-reduce:animate-none" : ""}`}
    >
      <div className={`h-1.5 transition-colors duration-300 motion-reduce:transition-none ${style?.band ?? "bg-transparent"}`} aria-hidden />

      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* Unaffected cards keep the calm "before" look, slightly faded; their diary stays readable. */}
        <div className={`flex flex-col gap-4 transition-opacity duration-300 motion-reduce:transition-none ${verdict === "unaffected" ? "opacity-65" : ""}`}>
          <header className="flex items-start gap-3">
            <ResidentAvatar id={resident.id} expression={expression} size={64} ringClass={style?.ring} className="-my-1 shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-xl font-extrabold leading-tight font-stretch-condensed">{resident.name}</h3>
              <p className="text-sm text-ink/60">
                {resident.ageLabel ?? resident.age} · {resident.role}
              </p>
            </div>
          </header>

          <p className="-mt-1 text-sm leading-snug text-ink/70">{resident.everydayLine}</p>

          {text && style && (
            <p
              className={`self-start rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider transition-colors duration-300 motion-reduce:transition-none ${style.badge}`}
            >
              {text.verdictLabel}
            </p>
          )}

          {showChange && text ? (
            <div className="tabular-nums">
              <p className={`text-4xl font-extrabold tracking-tight ${text.bigIsGain ? "text-better" : "text-hard"}`}>
                {text.bigNumber}
                {text.bigPerMonth && (
                  <span className="whitespace-nowrap text-base font-semibold tracking-normal text-ink/55"> a month</span>
                )}
              </p>
              {text.oneOffChip && (
                <p className="mt-1.5 inline-block rounded-full border border-better px-2 py-0.5 text-xs font-semibold text-better">
                  {text.oneOffChip}
                </p>
              )}
              {text.monthlyEquivalent && <p className="mt-1 text-sm font-medium">{text.monthlyEquivalent}</p>}
              <p className="mt-0.5 text-sm text-ink/60">{text.incomeLine}</p>
              <p className="mt-3 text-sm font-semibold">{text.spareLine}</p>
            </div>
          ) : (
            <div className="tabular-nums">
              <p className="text-4xl font-extrabold tracking-tight">{money(spareMoney(resident))}</p>
              <p className="text-sm font-semibold text-ink/55">spare each month</p>
              <p className="mt-0.5 text-sm text-ink/60">{incomeText(resident.income)}</p>
            </div>
          )}

          <SpareMoneyBar result={result} />
        </div>

        {diary && (
          <div className="mt-auto pt-1">
            <DiaryNote state={diary} />
          </div>
        )}
      </div>
    </article>
  );
}
