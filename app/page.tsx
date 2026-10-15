"use client";

import { ChangeChart } from "@/components/ChangeChart";
import { PolicyInput } from "@/components/PolicyInput";
import { PolicyPanel } from "@/components/PolicyPanel";
import { ResidentCard } from "@/components/ResidentCard";
import { StatusLine } from "@/components/StatusLine";
import { RESIDENTS } from "@/data/residents";
import { PRESETS } from "@/lib/presets";
import { useCrashTest } from "@/lib/useCrashTest";

// The one page, in PRD order: header, policy input, status and summary, chart and panel, residents.
export default function Home() {
  const crash = useCrashTest();
  const results = crash.run?.results ?? null;

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
      />

      <StatusLine phase={crash.phase} results={results} residentCount={RESIDENTS.length} />

      {crash.run && (
        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <ChangeChart residents={RESIDENTS} results={crash.run.results} />
          <PolicyPanel run={crash.run} />
        </section>
      )}

      <section aria-label="Residents" className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {RESIDENTS.map((resident) => (
          <ResidentCard
            key={resident.id}
            resident={resident}
            result={results?.find((result) => result.id === resident.id) ?? null}
          />
        ))}
      </section>
    </main>
  );
}
