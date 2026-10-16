"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { RESIDENTS } from "@/data/residents";
import { averageStory } from "@/lib/average";
import { runTown } from "@/lib/engine";
import { expressionFor } from "@/lib/expressions";
import { cardText, money, percent, VERDICT_LABELS } from "@/lib/format";
import { getPreset, PRESETS } from "@/lib/presets";
import { ResidentAvatar } from "./ResidentAvatar";
import { SpareMoneyBar } from "./SpareMoneyBar";
import { VERDICT_STYLES } from "./verdictStyles";

// The guided intro (prd.md > Guided Intro): a short scroll story on the first visit, before the
// free-play page. Every number comes from the engine running the fares preset, so it makes no AI
// calls. It can be skipped at every step and replayed from the header; with reduced motion the
// steps simply change, with nothing animating.

const SEEN_KEY = "policy-crash-test:intro-seen";

// A per-browser convenience only: if storage is unavailable, the intro just shows again.
export function introSeen(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markIntroSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Nothing to do: the intro will offer itself again next time.
  }
}

const FARES = getPreset("fares-20")!;
const RESULTS = runTown(RESIDENTS, FARES.levers);
const STORY = averageStory(RESIDENTS, RESULTS)!;
const resultOf = (id: string) => RESULTS.find((r) => r.id === id)!;
const RAJU = { resident: RESIDENTS.find((r) => r.id === "raju")!, result: resultOf("raju") };
const NURUL = { resident: RESIDENTS.find((r) => r.id === "nurul")!, result: resultOf("nurul") };
const RIDERS = RESULTS.filter((r) => r.verdict !== "unaffected").length;
const BIGGEST = Math.max(...RESULTS.map((r) => Math.abs(r.monthlyChange)));

interface Props {
  onDone: () => void; // skip, or "explore on my own"
  onPick: (presetId: string) => void;
  onMoveIn: () => void;
}

// ---- The pictures, one per step ----

function Faces({ withVerdicts }: { withVerdicts: boolean }) {
  return (
    <ul className="grid grid-cols-4 gap-x-3 gap-y-4">
      {RESIDENTS.map((resident, index) => {
        const verdict = resultOf(resident.id).verdict;
        return (
          <li key={resident.id} className="flex flex-col items-center text-center">
            <ResidentAvatar
              id={resident.id}
              expression={withVerdicts ? expressionFor(verdict) : "neutral"}
              size={64}
              ringClass={withVerdicts ? VERDICT_STYLES[verdict].ring : undefined}
              className="transition-transform duration-500 motion-reduce:transition-none"
            />
            <span className="mt-1 text-xs font-semibold leading-tight sm:text-sm">{resident.shortName}</span>
            <span
              className={`mt-0.5 rounded px-1.5 text-[10px] font-bold uppercase tracking-wide transition-opacity duration-500 motion-reduce:transition-none ${VERDICT_STYLES[verdict].badge} ${withVerdicts ? "opacity-100" : "opacity-0"}`}
              style={{ transitionDelay: withVerdicts ? `${index * 90}ms` : "0ms" }}
              aria-hidden={!withVerdicts}
            >
              {VERDICT_LABELS[verdict]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Bars({ shown }: { shown: boolean }) {
  return (
    <ul className="space-y-1.5">
      {RESULTS.map((result, index) => {
        const resident = RESIDENTS.find((r) => r.id === result.id)!;
        const width = shown ? (Math.abs(result.monthlyChange) / BIGGEST) * 100 : 0;
        const card = cardText(result);
        return (
          <li key={result.id} className="grid grid-cols-[7rem_1fr] items-center gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <ResidentAvatar id={resident.id} expression={shown ? expressionFor(result.verdict) : "neutral"} size={26} className="shrink-0" />
              <span className="truncate text-sm font-semibold">{resident.shortName}</span>
            </span>
            <span className="flex items-center gap-2">
              <span
                className={`h-5 rounded-sm transition-[width] duration-700 ease-out motion-reduce:transition-none ${VERDICT_STYLES[result.verdict].band}`}
                style={{ width: `calc(${width}% * 0.7)`, transitionDelay: shown ? `${index * 110}ms` : "0ms" }}
              />
              <span className="text-sm font-bold tabular-nums">{card.bigNumber ?? "$0"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Versus() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[RAJU, NURUL].map(({ resident, result }) => {
        const card = cardText(result);
        return (
          <div key={resident.id} className={`rounded-lg border-2 border-ink p-3 ${VERDICT_STYLES[result.verdict].tint}`}>
            <ResidentAvatar id={resident.id} expression={expressionFor(result.verdict)} size={56} ringClass={VERDICT_STYLES[result.verdict].ring} />
            <p className="mt-1 font-display text-lg font-extrabold leading-tight font-stretch-condensed">{resident.shortName}</p>
            <span className={`mt-1 inline-block rounded px-1.5 py-px text-[11px] font-bold uppercase tracking-wide ${VERDICT_STYLES[result.verdict].badge}`}>{card.verdictLabel}</span>
            <p className="mt-2 font-display text-3xl font-black tabular-nums text-hard">{card.bigNumber}</p>
            <p className="text-xs text-ink/60">a month</p>
            <div className="mt-3">
              <SpareMoneyBar result={result} />
            </div>
            <p className="mt-1.5 text-xs leading-snug">{card.spareLine}</p>
          </div>
        );
      })}
    </div>
  );
}

function YourSlot() {
  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
      {RESIDENTS.slice(0, 4).map((resident) => (
        <ResidentAvatar key={resident.id} id={resident.id} expression="happy" size={64} />
      ))}
      <span className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-dashed border-ink bg-hazard font-display text-lg font-black">You?</span>
      {RESIDENTS.slice(4).map((resident) => (
        <ResidentAvatar key={resident.id} id={resident.id} expression="happy" size={64} />
      ))}
    </div>
  );
}

// ---- The steps ----

interface Step {
  title: string;
  body: ReactNode;
  picture: (active: boolean) => ReactNode;
}

// "$12 … 12% of the $100 he has left": the same truncated percentages the cards show.
const share = ({ result }: typeof RAJU) => ({
  cost: money(result.monthlyChange),
  pct: percent(result.cents.monthly, result.cents.spare),
  spare: money(result.spareBefore),
});
const raju = share(RAJU);
const nurul = share(NURUL);

export function GuidedIntro({ onDone, onPick, onMoveIn }: Props) {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  const steps: Step[] = [
    {
      title: "Meet the town",
      body: <>Eight fictional neighbours in Singapore, each with their own pay, rent, commute and kids. Policies are written for &ldquo;households&rdquo;. These are the households.</>,
      picture: () => <Faces withVerdicts={false} />,
    },
    {
      title: "Averages hide people",
      body: (
        <>
          Say <strong>{FARES.chip.toLowerCase()}</strong>. {STORY.headline} {STORY.hidden}
        </>
      ),
      picture: (on) => <Faces withVerdicts={on} />,
    },
    {
      title: "Watch it land",
      body: <>{RIDERS} of the 8 ride the bus or MRT. Here is what the rise costs each of them, every month, worked out from their own budgets.</>,
      picture: (on) => <Bars shown={on} />,
    },
    {
      title: "Uncle Raju vs. Nurul",
      body: (
        <>
          Raju pays {raju.cost} more a month and Nurul {nurul.cost}, yet Raju is the one who feels it. His {raju.cost} is {raju.pct} of the {raju.spare} he has left each month; her {nurul.cost} is {nurul.pct} of her {nurul.spare}. It&apos;s not the size of the bill, it&apos;s what&apos;s left after it.
        </>
      ),
      picture: () => <Versus />,
    },
    {
      title: "Your turn",
      body: (
        <>
          <span className="block">Crash-test a policy, type your own, or move in and see where you&apos;d land.</span>
          <span className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button key={preset.id} type="button" onClick={() => onPick(preset.id)} className="rounded-full border-2 border-ink bg-white px-3 py-1 text-left text-sm font-semibold transition-colors hover:bg-hazard">
                {preset.chip}
              </button>
            ))}
          </span>
          <span className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={onMoveIn} className="rounded-md border-2 border-ink bg-hazard px-3 py-1.5 text-sm font-bold transition-colors hover:bg-ink hover:text-hazard">
              Move in yourself
            </button>
            <button type="button" onClick={onDone} className="rounded-md border-2 border-ink bg-white px-3 py-1.5 text-sm font-semibold hover:bg-paper">
              Explore on my own
            </button>
          </span>
        </>
      ),
      picture: () => <YourSlot />,
    },
  ];

  // The step whose card crosses the middle of the screen is the one shown.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    stepRefs.current.forEach((element) => element && observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <section aria-label="Guided intro" className="relative -mx-4 bg-paper px-4 sm:-mx-6 sm:px-6">
      {/* Always within reach: skip, and where you are in the story. */}
      <div className="sticky top-3 z-30 flex h-0 items-start justify-end gap-3">
        <span className="mt-2 hidden gap-1.5 sm:flex" aria-hidden>
          {steps.map((step, index) => (
            <span key={step.title} className={`h-2 w-2 rounded-full transition-colors motion-reduce:transition-none ${index === active ? "bg-ink" : "bg-ink/20"}`} />
          ))}
        </span>
        <button type="button" onClick={onDone} className="rounded-full border-2 border-ink bg-white px-3 py-1 text-sm font-bold shadow-sm hover:bg-hazard">
          Skip intro
        </button>
      </div>

      {/* The picture stays put while the steps scroll past it. */}
      <div className="sticky top-0 flex h-[100svh] items-start pt-16 lg:items-center lg:pl-[44%] lg:pt-0" aria-hidden>
        <div className="relative w-full">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className={`transition-opacity duration-500 motion-reduce:transition-none ${index === active ? "opacity-100" : "pointer-events-none opacity-0"} ${index === 0 ? "relative" : "absolute inset-x-0 top-0"}`}
            >
              {step.picture(index === active)}
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 -mt-[100svh]">
        {steps.map((step, index) => (
          <div
            key={step.title}
            ref={(element) => {
              stepRefs.current[index] = element;
            }}
            data-step={index}
            className="flex min-h-[100svh] items-end pb-24 lg:items-center lg:pb-0"
          >
            <div className="w-full max-w-md rounded-lg border-2 border-ink bg-white p-5 shadow-[4px_4px_0_#111111]">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink/50">
                {index + 1} / {steps.length}
              </p>
              <h2 className="mt-1 font-display text-3xl font-black leading-none font-stretch-condensed">{step.title}</h2>
              <div className="mt-2 text-[16px] leading-relaxed text-ink/80">{step.body}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
