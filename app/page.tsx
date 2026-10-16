"use client";

import { AverageStrip } from "@/components/AverageStrip";
import { ChangeChart } from "@/components/ChangeChart";
import { PolicyInput } from "@/components/PolicyInput";
import { PolicyPanel } from "@/components/PolicyPanel";
import { ResidentCard } from "@/components/ResidentCard";
import { StatusLine } from "@/components/StatusLine";
import { TownMap } from "@/components/TownMap";
import { RESIDENTS } from "@/data/residents";
import { expressionFor } from "@/lib/expressions";
import { PRESETS } from "@/lib/presets";
import { useCrashTest } from "@/lib/useCrashTest";
import { tippingPoint } from "@/lib/whatIf";
import { WhatIf } from "@/components/WhatIf";

// Selecting a pin on the map brings that resident's card into view and flashes it.
function showCard(residentId: string) {
  const card = document.getElementById(`card-${residentId}`);
  if (!card) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const top = card.getBoundingClientRect().top + window.scrollY - 24;
  window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
  card.focus({ preventScroll: true });
  card.classList.remove("card-flash");
  void card.offsetWidth; // restart the flash if it's already showing
  card.classList.add("card-flash");
  window.setTimeout(() => card.classList.remove("card-flash"), 1700);
}

// The one page, in PRD order: header, policy input, status and summary, average vs. the people, town map, chart and panel, residents.
export default function Home() {
  const crash = useCrashTest();
  // The town as it stands: the what-if sliders' values if moved, otherwise the policy as written.
  const results = crash.activeResults;
  const levers = crash.activeLevers;
  const exploring = crash.adjusted !== null;

  // Each character's face: their diary's mood once it lands, otherwise their verdict's.
  const faces = Object.fromEntries(
    RESIDENTS.map((resident) => {
      const diary = crash.run ? crash.diaries[resident.id] : undefined;
      const verdict = results?.find((r) => r.id === resident.id)?.verdict ?? null;
      // While exploring, the diaries describe the policy as written, so faces follow the numbers.
      const mood = !exploring && diary?.status === "arrived" ? diary.line.mood : null;
      return [resident.id, expressionFor(verdict, mood)];
    }),
  );

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 pb-28 sm:px-6">
      <header className="pt-10">
        <div className="flex items-center gap-3">
          <span className="hazard-stripes inline-block h-3 w-14 rounded-sm" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/55">
            Crash test lab · Singapore
          </span>
        </div>
        <h1 className="mt-3 font-display text-5xl font-black uppercase leading-[0.95] font-stretch-condensed sm:text-7xl">
          Policy Crash Test
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-ink/70">
          Paste any policy or headline and watch a town of 8 fictional Singapore residents react: who gains, who loses,
          by how much, and how it feels.
        </p>
      </header>

      <PolicyInput
        text={crash.text}
        onTextChange={crash.editText}
        onRun={crash.runCurrent}
        canRun={crash.canRun}
        presets={PRESETS}
        onPreset={crash.runPreset}
        locked={crash.phase === "reading"}
        message={crash.message}
        onTryAgain={crash.runCurrent}
      />

      <StatusLine
        phase={crash.phase}
        results={results}
        residentCount={RESIDENTS.length}
        failedDiaries={crash.failedDiaries}
        onRetryDiaries={crash.retryDiaries}
        runId={crash.run?.runId ?? null}
      />

      {crash.run && levers && (
        <WhatIf
          levers={levers}
          policyLevers={crash.run.levers}
          adjusted={exploring}
          onChange={crash.setLeverValue}
          onReset={crash.resetWhatIf}
          onRewrite={crash.rewriteDiaries}
          busy={crash.phase === "reading"}
        />
      )}

      {results && <AverageStrip residents={RESIDENTS} results={results} faces={faces} />}

      <TownMap
        residents={RESIDENTS}
        results={results}
        levers={levers}
        runId={crash.run?.runId ?? null}
        diaries={crash.run ? crash.diaries : {}}
        faces={faces}
        onSelect={showCard}
      />

      {crash.run && (
        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <ChangeChart residents={RESIDENTS} results={results ?? crash.run.results} faces={faces} />
          <PolicyPanel run={crash.run} />
        </section>
      )}

      <section aria-label="Residents" className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {RESIDENTS.map((resident) => (
          <ResidentCard
            key={resident.id}
            resident={resident}
            result={results?.find((result) => result.id === resident.id) ?? null}
            diary={crash.run ? (crash.diaries[resident.id] ?? null) : null}
            expression={faces[resident.id]}
            waiting={crash.phase === "reading"}
            runId={crash.run?.runId ?? null}
            tippingPoint={levers ? (tippingPoint(resident, levers)?.label ?? null) : null}
            diaryStale={exploring}
          />
        ))}
      </section>
    </main>
  );
}
