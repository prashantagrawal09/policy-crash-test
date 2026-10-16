"use client";

import { LogOut, Pencil, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { spareMoney } from "@/lib/engine";
import { money } from "@/lib/format";
import type { Category, HousingType } from "@/lib/schemas";
import {
  buildYou,
  HAIR_COLOURS,
  HAIRS,
  OUTFITS,
  PROPS,
  SKINS,
  startingAnswers,
  TEMPLATES,
  YourAnswersSchema,
  type Look,
  type YourAnswers,
} from "@/lib/yourself";
import { HAIR_FILL, ResidentAvatar, SKIN_SWATCH } from "./ResidentAvatar";

// "Move into town" (prd.md > Add Yourself): a short form and a character builder that make you
// resident #9. Nothing is saved; refreshing the page moves you out.

interface Props {
  you: YourAnswers | null;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onMoveIn: (answers: YourAnswers) => boolean;
  onMoveOut: () => void;
  busy: boolean; // a policy is being read or diaries written: moving waits until they're in
}

const HOUSING_LABELS: Record<HousingType, string> = {
  hdb_2_room: "HDB 2-room",
  hdb_3_room: "HDB 3-room",
  hdb_4_room: "HDB 4-room or bigger",
  condo: "Condo",
  renting: "Renting",
  with_parents: "With parents",
};

const LABELS: Record<string, string> = {
  short: "Short", fringe: "Fringe", long: "Long", bun: "Bun", cap: "Cap", bald: "Bald",
  black: "Black", brown: "Brown", grey: "Grey",
  tee: "T-shirt", shirt: "Shirt", hoodie: "Hoodie", blazer: "Blazer",
  none: "None", glasses: "Glasses", headphones: "Headphones", lanyard: "Lanyard",
};

// Spending, grouped the way people think about it. Car costs need a car; childcare needs children.
const SPENDING: { category: Category; label: string; when?: (a: YourAnswers) => boolean }[] = [
  { category: "housing", label: "Housing (rent or loan)" },
  { category: "food", label: "Food and groceries" },
  { category: "public_transport", label: "Bus and MRT" },
  { category: "private_transport", label: "Car (petrol, parking, loan)", when: (a) => a.car },
  { category: "utilities", label: "Bills (power, water, phone)" },
  { category: "healthcare", label: "Health" },
  { category: "childcare", label: "Childcare", when: (a) => a.children },
  { category: "education", label: "School and courses" },
  { category: "other", label: "Everything else" },
];

const inputBox = "mt-1 flex items-center rounded-md border border-ink/25 bg-white focus-within:border-ink focus-within:ring-2 focus-within:ring-hazard";

function NumberField({ id, label, value, onChange, prefix }: { id: string; label: string; value: number; onChange: (value: number) => void; prefix?: string }) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-sm font-medium">{label}</span>
      <span className={inputBox}>
        {prefix && <span className="pl-2.5 text-sm text-ink/50">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          value={value === 0 ? "" : value}
          placeholder="0"
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(event.target.value === "" || !Number.isFinite(next) ? 0 : next);
          }}
          className="w-full min-w-0 bg-transparent px-2.5 py-1.5 text-[15px] tabular-nums outline-none"
        />
      </span>
    </label>
  );
}

function Choices<T extends string>({ legend, options, value, onChange, swatch }: { legend: string; options: readonly T[]; value: T; onChange: (value: T) => void; swatch?: (option: T) => string }) {
  return (
    <fieldset>
      <legend className="text-xs font-bold uppercase tracking-[0.15em] text-ink/55">{legend}</legend>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((option, index) => {
          const chosen = option === value;
          const ring = chosen ? "border-ink" : "border-ink/15 hover:border-ink/40";
          return swatch ? (
            <button
              key={option}
              type="button"
              aria-pressed={chosen}
              aria-label={LABELS[option] ?? `${legend} ${index + 1}`}
              onClick={() => onChange(option)}
              className={`h-8 w-8 rounded-full border-[3px] ${ring} ${chosen ? "ring-2 ring-hazard" : ""}`}
              style={{ background: swatch(option) }}
            />
          ) : (
            <button
              key={option}
              type="button"
              aria-pressed={chosen}
              onClick={() => onChange(option)}
              className={`rounded-full border-2 px-2.5 py-0.5 text-sm ${ring} ${chosen ? "bg-hazard font-semibold" : "bg-white"}`}
            >
              {LABELS[option]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function Toggle({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm font-medium">
      <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#111111]" />
      {label}
    </label>
  );
}

function MoveInForm({ you, busy, onMoveIn, onClose }: { you: YourAnswers | null; busy: boolean; onMoveIn: (answers: YourAnswers) => boolean; onClose: () => void }) {
  const [draft, setDraft] = useState<YourAnswers>(() => you ?? startingAnswers());
  const [error, setError] = useState<string | null>(null);
  const set = (changes: Partial<YourAnswers>) => setDraft((current) => ({ ...current, ...changes }));
  const setLook = (changes: Partial<Look>) => setDraft((current) => ({ ...current, look: { ...current.look, ...changes } }));
  const setSpend = (category: Category, value: number) => setDraft((current) => ({ ...current, spending: { ...current.spending, [category]: value } }));

  const check = YourAnswersSchema.safeParse(draft);
  const spare = check.success ? spareMoney(buildYou(draft)) : null;

  return (
    <form
      className="mt-4 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]"
      onSubmit={(event) => {
        event.preventDefault();
        const result = YourAnswersSchema.safeParse(draft);
        if (!result.success) {
          setError(result.error.issues[0]?.message ?? "Something doesn't look right");
          return;
        }
        setError(null);
        if (onMoveIn(result.data)) onClose();
      }}
    >
      {/* The character builder */}
      <div className="space-y-4">
        <div className="flex justify-center rounded-lg bg-paper py-4">
          <ResidentAvatar id="you" look={draft.look} size={120} />
        </div>
        <Choices legend="Skin" options={SKINS} value={draft.look.skin} onChange={(skin) => setLook({ skin })} swatch={(tone) => SKIN_SWATCH[tone]} />
        <Choices legend="Hair" options={HAIRS} value={draft.look.hair} onChange={(hair) => setLook({ hair })} />
        <Choices legend="Hair colour" options={HAIR_COLOURS} value={draft.look.hairColour} onChange={(hairColour) => setLook({ hairColour })} swatch={(colour) => HAIR_FILL[colour]} />
        <Choices legend="Outfit" options={OUTFITS} value={draft.look.outfit} onChange={(outfit) => setLook({ outfit })} />
        <Choices legend="Extra" options={PROPS} value={draft.look.prop} onChange={(prop) => setLook({ prop })} />
      </div>

      {/* Your numbers */}
      <div className="min-w-0 space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-ink/55">Start from</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => set({ ...template.answers, spending: { ...template.answers.spending } })}
                className="rounded-full border-2 border-ink/15 bg-white px-2.5 py-0.5 text-sm hover:border-ink/40"
              >
                {template.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-ink/50">Rough starting numbers. Change any of them.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label htmlFor="you-name" className="block">
            <span className="text-sm font-medium">Name</span>
            <span className={inputBox}>
              <input id="you-name" value={draft.name} maxLength={20} placeholder="You" onChange={(event) => set({ name: event.target.value })} className="w-full min-w-0 bg-transparent px-2.5 py-1.5 text-[15px] outline-none" />
            </span>
          </label>
          <NumberField id="you-age" label="Age" value={draft.age} onChange={(age) => set({ age })} />
          <NumberField id="you-income" label="Take-home pay a month" value={draft.income} onChange={(income) => set({ income })} prefix="$" />
          <label htmlFor="you-housing" className="block">
            <span className="text-sm font-medium">Home</span>
            <span className={inputBox}>
              <select id="you-housing" value={draft.housingType} onChange={(event) => set({ housingType: event.target.value as HousingType })} className="w-full min-w-0 bg-transparent px-2 py-1.5 text-[15px] outline-none">
                {Object.entries(HOUSING_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <NumberField id="you-people" label="People at home, you included" value={draft.peopleAtHome} onChange={(peopleAtHome) => set({ peopleAtHome })} />
          <div className="flex flex-col justify-end gap-2 pb-1">
            <Toggle id="you-children" label="Children at home" checked={draft.children} onChange={(children) => set({ children })} />
            <Toggle id="you-car" label="I have a car" checked={draft.car} onChange={(car) => set({ car })} />
          </div>
        </div>

        <fieldset>
          <legend className="text-xs font-bold uppercase tracking-[0.15em] text-ink/55">Spending a month</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {SPENDING.filter((field) => !field.when || field.when(draft)).map((field) => (
              <NumberField key={field.category} id={`you-${field.category}`} label={field.label} value={draft.spending[field.category]} onChange={(value) => setSpend(field.category, value)} prefix="$" />
            ))}
          </div>
        </fieldset>

        <p className="rounded-md bg-paper px-3 py-2 text-sm" aria-live="polite">
          {spare === null ? (
            "Fill in your numbers to see what's left each month."
          ) : spare >= 0 ? (
            <>
              That leaves <strong>{money(spare)}</strong> spare each month.
            </>
          ) : (
            <>
              You&apos;d be <strong>{money(-spare)}</strong> short each month.
            </>
          )}
        </p>

        {error && (
          <p role="alert" className="rounded-md border-2 border-hard px-3 py-2 text-sm font-medium text-hard">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md border-2 border-ink bg-hazard px-4 py-2 font-display text-base font-black uppercase tracking-wide transition-colors hover:bg-ink hover:text-hazard disabled:opacity-50 disabled:hover:bg-hazard disabled:hover:text-ink"
          >
            {you ? "Save changes" : "Move in"}
          </button>
          <button type="button" onClick={onClose} className="rounded-md border-2 border-ink bg-white px-3.5 py-2 text-sm font-semibold hover:bg-paper">
            Cancel
          </button>
          {busy && <span className="text-sm text-ink/60">Moving in waits until the diaries are in.</span>}
        </div>
        <p className="text-xs text-ink/55">Nothing is saved: refresh the page and you&apos;ve moved out. Your answers go to Claude only to write your diary.</p>
      </div>
    </form>
  );
}

export function MoveIn({ you, open, onOpen, onClose, onMoveIn, onMoveOut, busy }: Props) {
  const yourself = you ? buildYou(you) : null;
  let body: ReactNode;

  if (open) {
    body = <MoveInForm you={you} busy={busy} onMoveIn={onMoveIn} onClose={onClose} />;
  } else if (yourself) {
    const spare = spareMoney(yourself);
    body = (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <ResidentAvatar id="you" look={yourself.look} size={48} className="shrink-0" />
        <p className="min-w-0 flex-1 text-[15px]">
          <strong>{yourself.name === "You" ? "You live" : `${yourself.name} lives`}</strong> at Your place by the MRT, with{" "}
          {spare >= 0 ? `${money(spare)} spare` : `${money(-spare)} short`} each month.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={onOpen} className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-white px-3 py-1.5 text-sm font-semibold hover:bg-paper">
            <Pencil size={14} aria-hidden /> Edit
          </button>
          <button type="button" onClick={onMoveOut} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-white px-3 py-1.5 text-sm font-semibold hover:bg-paper disabled:opacity-50">
            <LogOut size={14} aria-hidden /> Move out
          </button>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <p className="min-w-0 flex-1 text-[15px]">
          <strong>Where would you land?</strong> Move into town as resident #9, with your own numbers and your own character.
        </p>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-hazard px-3.5 py-1.5 text-sm font-bold transition-colors hover:bg-ink hover:text-hazard"
        >
          <Plus size={15} strokeWidth={3} aria-hidden /> Move into town
        </button>
      </div>
    );
  }

  return (
    <section id="move-in" tabIndex={-1} aria-label="Move into town" className="mt-6 rounded-lg border-2 border-dashed border-ink/30 bg-white p-4 outline-none sm:p-5">
      {open && <h2 className="font-display text-2xl font-black font-stretch-condensed">{you ? "Change your details" : "Move into town"}</h2>}
      {body}
      {!open && busy && you && <p className="mt-2 text-xs text-ink/50">You can move out once the diaries are in.</p>}
    </section>
  );
}
