"use client";

import { AverageStrip } from "@/components/AverageStrip";
import { useEffect, useState } from "react";
import { ChangeChart } from "@/components/ChangeChart";
import { GuidedIntro, introSeen, markIntroSeen } from "@/components/GuidedIntro";
import { MonthInLife } from "@/components/MonthInLife";
import { MoveIn } from "@/components/MoveIn";
import { PolicyInput } from "@/components/PolicyInput";
import { PolicyPanel } from "@/components/PolicyPanel";
import { ResidentCard } from "@/components/ResidentCard";
import { StatusLine } from "@/components/StatusLine";
import { TownChatter } from "@/components/TownChatter";
import { TownMap } from "@/components/TownMap";
import { WhyDrawer } from "@/components/WhyDrawer";
import { expressionFor } from "@/lib/expressions";
import { PRESETS } from "@/lib/presets";
import { useConversation } from "@/lib/useConversation";
import { useCrashTest } from "@/lib/useCrashTest";
import { tippingPoint } from "@/lib/whatIf";
import { WhatIf } from "@/components/WhatIf";

// Scrolls an element to just below the top of the screen and moves focus to it.
function bringIntoView(element: HTMLElement) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const top = element.getBoundingClientRect().top + window.scrollY - 24;
  window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
  element.focus({ preventScroll: true });
}

// Selecting a pin on the map brings that resident's card into view and flashes it.
function showCard(residentId: string) {
  const card = document.getElementById(`card-${residentId}`);
  if (!card) return;
  bringIntoView(card);
  card.classList.remove("card-flash");
  void card.offsetWidth; // restart the flash if it's already showing
  card.classList.add("card-flash");
  window.setTimeout(() => card.classList.remove("card-flash"), 1700);
}

// The one page, in PRD order: the guided intro (first visit), header, policy input, moving in, status and summary, average vs. the people, town map, town chatter, a month in the life, chart and panel, residents.
export default function Home() {
  const crash = useCrashTest();
  const town = crash.town; // the 8 residents, and you if you've moved in
  const [moveInOpen, setMoveInOpen] = useState(false);
  const [whyId, setWhyId] = useState<string | null>(null); // whose Why? drawer is open
  // The guided intro plays on a first visit (known only in the browser) and can be replayed.
  const [introOpen, setIntroOpen] = useState(false);
  useEffect(() => {
    if (!introSeen()) setIntroOpen(true);
  }, []);
  function closeIntro() {
    markIntroSeen();
    setIntroOpen(false);
    window.scrollTo({ top: 0 });
  }
  function replayIntro() {
    setIntroOpen(true);
    window.scrollTo({ top: 0 });
  }
  // The map's "Move in" sign opens the form and brings it into view.
  function openMoveIn() {
    setMoveInOpen(true);
    requestAnimationFrame(() => {
      const section = document.getElementById("move-in");
      if (section) bringIntoView(section);
    });
  }
  // The town as it stands: the what-if sliders' values if moved, otherwise the policy as written.
  const results = crash.activeResults;
  const levers = crash.activeLevers;
  const exploring = crash.adjusted !== null;
  // The town chatter, said one remark at a time on the map and in the feed.
  const conversation = useConversation(crash.chatter.remarks, crash.run?.runId ?? null);

  // Each character's face: their diary's mood once it lands, otherwise their verdict's.
  const faces = Object.fromEntries(
    town.map((resident) => {
      const diary = crash.run ? crash.diaries[resident.id] : undefined;
      const verdict = results?.find((r) => r.id === resident.id)?.verdict ?? null;
      // While exploring, the diaries describe the policy as written, so faces follow the numbers.
      const mood = !exploring && diary?.status === "arrived" ? diary.line.mood : null;
      return [resident.id, expressionFor(verdict, mood)];
    }),
  );

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 pb-28 sm:px-6">
      {introOpen && (
        <GuidedIntro
          onDone={closeIntro}
          onPick={(presetId) => {
            closeIntro();
            crash.runPreset(presetId);
          }}
          onMoveIn={() => {
            closeIntro();
            openMoveIn();
          }}
        />
      )}

      <header className="pt-10">
        <div className="flex items-center gap-3">
          <span className="hazard-stripes inline-block h-3 w-14 rounded-sm" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/55">
            Crash test lab · Singapore
          </span>
          {!introOpen && (
            <button type="button" onClick={replayIntro} className="ml-auto text-xs font-semibold text-ink/55 underline underline-offset-2 hover:text-ink">
              Replay intro
            </button>
          )}
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

      <MoveIn
        you={crash.you}
        open={moveInOpen}
        onOpen={openMoveIn}
        onClose={() => setMoveInOpen(false)}
        onMoveIn={crash.moveIn}
        onMoveOut={crash.moveOut}
        busy={crash.busy}
      />

      <StatusLine
        phase={crash.phase}
        results={results}
        residentCount={town.length}
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

      {results && <AverageStrip residents={town} results={results} faces={faces} />}

      <TownMap
        residents={town}
        results={results}
        levers={levers}
        runId={crash.run?.runId ?? null}
        diaries={crash.run ? crash.diaries : {}}
        faces={faces}
        speaking={conversation.speaking}
        onSelect={showCard}
        onMoveIn={openMoveIn}
      />

      {crash.run && (
        <TownChatter
          residents={town}
          status={crash.chatter.status}
          received={crash.chatter.remarks.length}
          spoken={conversation.spoken}
          speaking={conversation.speaking}
          faces={faces}
          stale={exploring}
        />
      )}

      {results && <MonthInLife residents={town} results={results} faces={faces} runId={crash.run?.runId ?? null} />}

      {crash.run && (
        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <ChangeChart residents={town} results={results ?? crash.run.results} faces={faces} />
          <PolicyPanel run={crash.run} />
        </section>
      )}

      <section aria-label="Residents" className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {town.map((resident) => (
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
            onWhy={() => setWhyId(resident.id)}
          />
        ))}
      </section>

      {(() => {
        const resident = town.find((r) => r.id === whyId);
        const result = results?.find((r) => r.id === whyId);
        if (!resident || !result || !levers) return null;
        return <WhyDrawer key={resident.id} resident={resident} result={result} levers={levers} expression={faces[resident.id]} onClose={() => setWhyId(null)} />;
      })()}
    </main>
  );
}
