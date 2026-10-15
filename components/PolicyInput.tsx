"use client";

import type { PresetFile } from "@/lib/schemas";
import type { InputMessage } from "@/lib/useCrashTest";

export const MAX_POLICY_CHARS = 500;

interface Props {
  text: string;
  onTextChange: (text: string) => void;
  onRun: () => void;
  canRun: boolean;
  presets: PresetFile[];
  onPreset: (presetId: string) => void;
  locked: boolean; // true only while a typed policy is being read
  message: InputMessage | null;
  onTryAgain: () => void;
}

// The big text box, the Run button and the 4 preset chips (prd.md > Policy Input and Presets).
export function PolicyInput({ text, onTextChange, onRun, canRun, presets, onPreset, locked, message, onTryAgain }: Props) {
  const nearLimit = text.length >= MAX_POLICY_CHARS - 100;

  return (
    <section aria-label="Policy" className="mt-8">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (canRun) onRun();
        }}
      >
        <label htmlFor="policy" className="sr-only">
          Policy or headline
        </label>
        <textarea
          id="policy"
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={(event) => {
            // Enter runs it; Shift+Enter adds a new line.
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (canRun) onRun();
            }
          }}
          maxLength={MAX_POLICY_CHARS}
          rows={3}
          placeholder="Paste a policy or headline, for example “Electricity bills cut 20%”"
          className="block w-full resize-none rounded-md border-2 border-ink bg-white px-4 py-3 text-lg leading-snug placeholder:text-ink/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-hazard"
        />
        {message?.kind === "not_policy" && (
          <p role="status" className="mt-2 rounded-md border border-ink/20 bg-white px-3 py-2 text-[15px]">
            <span className="mr-1 text-xs font-bold uppercase tracking-wider text-ink/50">Not a policy:</span>{" "}
            {message.text}
          </p>
        )}
        {message?.kind === "error" && (
          <p role="alert" className="mt-2 flex flex-wrap items-center gap-3 rounded-md border border-hard/40 bg-white px-3 py-2 text-[15px]">
            {message.text}
            <button
              type="button"
              onClick={onTryAgain}
              disabled={locked}
              className="rounded-md border-2 border-ink px-2.5 py-0.5 text-sm font-semibold transition-colors hover:bg-hazard disabled:opacity-50"
            >
              Try again
            </button>
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="submit"
            disabled={!canRun}
            className="rounded-md border-2 border-ink bg-hazard px-5 py-2.5 font-display text-lg font-black uppercase tracking-wide font-stretch-condensed transition-colors hover:bg-ink hover:text-hazard disabled:cursor-not-allowed disabled:border-ink/30 disabled:bg-ink/10 disabled:text-ink/40 disabled:hover:bg-ink/10 disabled:hover:text-ink/40"
          >
            Run the crash test
          </button>
          {nearLimit && (
            <span className="text-sm tabular-nums text-ink/60">
              {text.length}/{MAX_POLICY_CHARS}
            </span>
          )}
        </div>
      </form>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-semibold uppercase tracking-wider text-ink/50">Try a preset</span>
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onPreset(preset.id)}
            disabled={locked}
            className="rounded-full border border-ink/40 bg-white px-3.5 py-1.5 text-sm transition-colors hover:border-ink hover:bg-hazard disabled:cursor-not-allowed disabled:opacity-50"
          >
            {preset.chip}
          </button>
        ))}
      </div>
    </section>
  );
}
