"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ResidentResult } from "@/lib/engine";
import type { Expression } from "@/lib/expressions";
import { money, signedMoney, VERDICT_LABELS } from "@/lib/format";
import type { Lever, Resident } from "@/lib/schemas";
import { lensLabel, whyFor, type WhyCheck, type WhyLine } from "@/lib/why";
import { ResidentAvatar } from "./ResidentAvatar";
import { VERDICT_STYLES } from "./verdictStyles";

// Why a verdict landed (prd.md > Why? Budget Drawer): the person's month before and after, line by
// line, and the two checks behind the verdict. A native dialog, so Escape, focus and the backdrop
// behave as people expect; focus goes back to the card's button on close. No AI.

interface Props {
  resident: Resident;
  result: ResidentResult;
  levers: Lever[];
  expression: Expression;
  onClose: () => void;
}

function Line({ line, strong = false }: { line: WhyLine; strong?: boolean }) {
  const change = line.after - line.before;
  return (
    <tr className={line.changed ? "bg-hazard/30" : ""}>
      <th scope="row" className={`py-1.5 pl-2 pr-2 text-left ${strong ? "font-bold" : "font-medium"}`}>
        {line.label}
      </th>
      <td className="py-1.5 pr-2 text-right tabular-nums text-ink/60">{money(line.before)}</td>
      <td className={`py-1.5 pr-2 text-right tabular-nums ${strong ? "font-bold" : ""}`}>{money(line.after)}</td>
      <td className="py-1.5 pr-2 text-right text-xs font-bold tabular-nums">{line.changed ? signedMoney(change) : ""}</td>
    </tr>
  );
}

function Check({ title, check, deciding }: { title: string; check: WhyCheck; deciding: boolean }) {
  const style = check.lens ? VERDICT_STYLES[check.lens] : null;
  return (
    <div className={`rounded-lg border-2 p-3 ${deciding ? "border-ink" : "border-ink/15"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/55">{title}</p>
        {deciding && <span className="rounded bg-ink px-1.5 py-px text-[10px] font-black uppercase text-hazard">Decides</span>}
      </div>
      <p className="mt-1 font-display text-3xl font-black tabular-nums">{check.share}</p>
      <p className="text-sm text-ink/70">{check.rule}</p>
      <p className={`mt-2 inline-block rounded px-1.5 py-px text-[11px] font-bold uppercase tracking-wide ${style ? style.badge : "border border-ink/25 text-ink/55"}`}>{lensLabel(check.lens)}</p>
    </div>
  );
}

export function WhyDrawer({ resident, result, levers, expression, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  // Opened as a modal on mount. Escape, the close button and the backdrop all go through shut():
  // closing the native dialog first puts focus back on the card's button, then the page unmounts it.
  // (The dialog's own "close" event arrives later, or not at all in some embedded browsers.)
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);
  function shut() {
    if (dialog.current?.open) dialog.current.close();
    onClose();
  }

  const why = whyFor(resident, result, levers);
  const style = VERDICT_STYLES[result.verdict];
  const titleId = `why-${resident.id}`;
  const spareLine: WhyLine = { label: "Spare money", before: why.spareBefore, after: why.spareAfter, changed: why.spareBefore !== why.spareAfter };
  const totalLine: WhyLine = { label: "All spending", before: why.totalBefore, after: why.totalAfter, changed: why.totalBefore !== why.totalAfter };

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      // A click on the backdrop lands on the dialog itself; the content fills it edge to edge.
      onClick={(event) => {
        if (event.target === event.currentTarget) shut();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          shut();
        }
      }}
      className="drawer-in m-0 mt-auto max-h-[88svh] w-full max-w-none overflow-hidden rounded-t-2xl bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/45 sm:ml-auto sm:mt-0 sm:h-[100svh] sm:max-h-none sm:max-w-md sm:rounded-none"
    >
      <div className="flex max-h-[88svh] flex-col sm:h-full sm:max-h-none">
        <header className="flex items-start gap-3 border-b border-ink/10 p-5">
          <ResidentAvatar id={resident.id} look={resident.look} expression={expression} size={56} ringClass={style.ring} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-ink/50">Why?</p>
            <h2 id={titleId} className="font-display text-2xl font-black leading-tight font-stretch-condensed">
              {resident.shortName}: {VERDICT_LABELS[result.verdict]}
            </h2>
          </div>
          <button type="button" onClick={shut} aria-label="Close" className="rounded-full border-2 border-ink p-1 hover:bg-hazard">
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-ink/55">What the policy does to {resident.shortName}</h3>
            <ul className="mt-2 space-y-2">
              {why.reach.map((reach) => (
                <li key={reach.lever} className="text-sm leading-snug">
                  <span className="text-ink/70">{reach.lever}:</span>{" "}
                  <strong className={reach.applies ? "whitespace-nowrap" : "text-ink/60"}>{reach.applies ? reach.reason : `doesn't reach them. ${reach.reason}.`}</strong>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-ink/55">Their month, before and after</h3>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-ink/45">
                  <th scope="col" className="pb-1 pl-2 text-left font-semibold">
                    <span className="sr-only">Line</span>
                  </th>
                  <th scope="col" className="pb-1 pr-2 text-right font-semibold">Before</th>
                  <th scope="col" className="pb-1 pr-2 text-right font-semibold">After</th>
                  <th scope="col" className="pb-1 pr-2 text-right font-semibold">
                    <span className="sr-only">Change</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                <Line line={why.income} strong />
                {why.spending.map((line) => (
                  <Line key={line.label} line={line} />
                ))}
                {why.taxableFixed !== 0 && (
                  <tr className="bg-hazard/30">
                    <th scope="row" className="py-1.5 pl-2 text-left font-medium">On all taxable spending</th>
                    <td />
                    <td />
                    <td className="py-1.5 pr-2 text-right text-xs font-bold tabular-nums">{signedMoney(why.taxableFixed)}</td>
                  </tr>
                )}
                <Line line={totalLine} strong />
                <Line line={spareLine} strong />
              </tbody>
            </table>
            {why.oneOff !== 0 && (
              <p className="mt-2 text-sm">
                Plus a one-off of <strong>{signedMoney(why.oneOff)}</strong>, counted as {signedMoney(why.oneOff / 12)} a month for the verdict.
              </p>
            )}
          </section>

          {result.verdict !== "unaffected" && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-ink/55">Two checks, the worse one wins</h3>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Check title="Share of income" check={why.checks.income} deciding={why.checks.decidedBy === "income" || why.checks.decidedBy === "both"} />
                <Check title="Share of spare money" check={why.checks.spare} deciding={why.checks.decidedBy === "spare" || why.checks.decidedBy === "both"} />
              </div>
              <p className="mt-2 text-xs text-ink/55">The spare-money check only counts losses. A one-off counts as a twelfth a month.</p>
            </section>
          )}
        </div>
      </div>
    </dialog>
  );
}
