---
doc: checklist
status: approved
---

# Build Checklist

Build mode: not chosen yet (asked at the gut check)

## Slices

- [ ] **1. Tap a preset and see who's hit**
  Becomes usable: A running page with the 8 residents on screen in their normal state (income, spare money, everyday line), the text box, 4 preset chips and the pinned disclaimer. Tapping a chip fills the box and instantly updates the summary line and every card's verdict, big number, % of income and spare-money line, all from the tested engine. Fares then petrol shows the flip.
  Why now: This is the unique kernel (eight specific people, two lenses, numbers from tested code), so it comes first with the scaffold folded in. It has no AI in it, so every later slice builds on numbers already proven against the acceptance table.
  PRD ref: `prd.md > The Core Journey` (steps 1, 2, 4, 6), `prd.md > Policy Input and Presets`, `prd.md > Town Summary`, `prd.md > Resident Cards`, `prd.md > Verdicts`, `prd.md > Expected Preset Results`, `prd.md > Disclaimer`
  Spec ref: `spec.md > Stack`, `spec.md > File Structure`, `spec.md > Look and Feel`, `spec.md > Components` (Town Data, Lever Schema, Presets, Policy Engine, Display Formatting, Crash Test Controller, Page and UI Components, Tests), `spec.md > Data Model`, `spec.md > Decisions and Open Issues` (Early build checks: scaffolding, heading font, TypeScript)
  Build: Scaffold Next.js 16.4 in a temp folder and move it in, merging `.gitignore`; install zod, Vitest and lucide-react. Add `data/residents.ts` with drafted everyday lines, `lib/schemas.ts`, `lib/engine.ts`, `lib/format.ts`, the 4 preset files and `lib/presets.ts`. Write `tests/engine.test.ts`, `tests/presets.test.ts` and `tests/format.test.ts`. Build the page with `PolicyInput` (box and chips; typed policies arrive in slice 4), `StatusLine` (summary line), `ResidentCard` and `Disclaimer`, using the palette and fonts (check Archivo's width axis through `next/font`; fall back to Archivo Black).
  Verify (mechanical): `npm test` passes, including every row of `prd.md > Expected Preset Results` card by card and the exact −1%, −5%, −10% and −30% lines; `npm run build` finishes with no type errors; in the browser, tapping "Bus and train fares rise 20%" shows "2 feel it, 4 barely affected, 2 unaffected" and tapping "Petrol prices rise 15%" shows "1 hit hard, 1 feels it, 6 unaffected".
  Learner check: Run `npm run dev`, open http://localhost:3000, tap "Bus and train fares rise 20%" and then "Petrol prices rise 15%", and watch Chloe and Uncle Raju trade places with Faizal and Marcus. Read the 8 everyday lines and say which you'd change.
  Commit: `Add town, engine and presets with instant preset runs`

- [ ] **2. See the spread at a glance**
  Becomes usable: After a preset runs, the chart shows each person's monthly change from a zero line in verdict colours (striped one-offs, $0 for Unaffected); each card's spare-money bar shows the bite, with the 10% tick and the hazard spill below zero; and the panel explains "How this preset is set up" with the Hand-checked tag.
  Why now: It completes the lab-report half of the demo with no AI involved, so the look can be judged and adjusted at the early checkpoint before diaries and the parser build on the same layout.
  PRD ref: `prd.md > Monthly Change Chart`, `prd.md > Resident Cards` (spare-money bar, below zero, one-offs, Unaffected), `prd.md > How the Policy Was Read` (presets), `prd.md > Screens and Layout`
  Spec ref: `spec.md > Components` (Page and UI Components: ChangeChart, SpareMoneyBar, PolicyPanel; Display Formatting), `spec.md > Look and Feel`
  Build: Add `ChangeChart` (HTML/CSS bars, zero line, verdict colours, striped one-off segments with the "one-off, spread over 12 months" legend, labelled amounts), `SpareMoneyBar` (red or green share, 10% tick, hazard spill) and `PolicyPanel` (levers in plain English, assumptions, Hand-checked tag, "Type your own policy to watch the AI read it live."). Chart and panel sit side by side on wide screens and stay hidden until the first run.
  Verify (mechanical): `npm test` passes, with new tests for chart values and plain-English levers; `npm run build` passes; in the browser, every chart amount equals its card's number for all 4 presets, the one-off preset shows striped +$25 bars for Chloe and Uncle Raju only, and Faizal's petrol bar spills into the hazard zone.
  Learner check: Tap each of the 4 chips and look at the chart, the spare-money bars and the panel. Say what you'd change about the look before the diaries land on these cards.
  Commit: `Add change chart, spare-money bars and preset panel`

- [ ] **3. Diaries stream into the cards**
  Becomes usable: After the numbers land, each card's diary spot shimmers, then fills with a mood tag, a short reaction and a few first-person sentences in Lora italic, one card at a time. Missing diaries show "Diary didn't come through" with one "Retry diaries" button, and a new run drops late diaries from the old one.
  Why now: The diary stream is the riskiest piece left (streaming, the 15-second target, cancelling a run), and it finishes demo steps 1 and 2 end to end. Presets already work, so diaries can be tested without the parser.
  PRD ref: `prd.md > Diaries`, `prd.md > The Core Journey` (steps 3, 5, 6), `prd.md > States and Boundaries` (numbers in with diaries pending, diaries fail, a new run while diaries arrive)
  Spec ref: `spec.md > Components` (Diary Route, Prompt and Client Setup, Crash Test Controller, Page and UI Components: DiaryNote, StatusLine), `spec.md > External Services and Dependencies`, `spec.md > Important Failure Modes`, `spec.md > Decisions and Open Issues` (Early build checks: refusal fallback, first diary speed, abort signal)
  Build: Load the claude-api skill first. Install `@anthropic-ai/sdk`; add `.env.example`, `lib/anthropic.ts`, `lib/prompts.ts`, `lib/diaryInput.ts` and `app/api/diaries/route.ts` (one JSON object per line, shape checks, refusal and error handling, the request's abort signal passed through). Extend the controller with run ids, abort, the 20-second timer and retry; add `DiaryNote` and the "Running the numbers" and "Writing diaries" status steps.
  Verify (mechanical): a test shows the diary input carries the exact card strings; one live fares run returns 8 valid lines and `done`, with time to first diary, total time (under 15 s), tokens and cost recorded before anything runs in bulk; an aborted request stops the model call; a bad key gives an error line, not a crash; `npm run build` passes; in the browser, diaries land on the right cards, a second run mid-stream drops the old diaries, and Retry fills only the missing ones.
  Learner check: First, copy `.env.example` to `.env.local` and add your key yourself. Then tap "Bus and train fares rise 20%" and watch the diaries fill in; tap "Petrol prices rise 15%" while they're still arriving and check that no old diary lands on the new cards.
  Commit: `Stream resident diaries into the cards`

- [ ] **4. Type your own policy**
  Becomes usable: Typing a policy and pressing "Run the crash test" sends it to Claude Haiku 5.5; the town reacts with numbers, chart and diaries, and the panel reads "How the AI read this policy" with plain-English levers, assumptions and a confidence tag. A non-policy shows the AI's reason under the box; an error shows "Couldn't read that one right now. Try again, or tap a preset." with Try again; either way the town stays as it was.
  Why now: It's demo step 3 and the last journey behaviour. It reuses the engine, panel and diaries already proven, so any trouble here is isolated to the parser.
  PRD ref: `prd.md > Policy Input and Presets`, `prd.md > How the Policy Was Read`, `prd.md > States and Boundaries` (couldn't read the policy, not a policy, a policy that changes nobody's budget)
  Spec ref: `spec.md > Components` (Parse Route, Lever Schema, Crash Test Controller, Page and UI Components: PolicyInput, PolicyPanel, Tests), `spec.md > External Services and Dependencies`, `spec.md > Decisions and Open Issues` (Early build checks: `zodOutputFormat`)
  Build: Check that `zodOutputFormat` accepts zod 4 and the lever schema (fallback: a hand-written JSON Schema, still checked by zod). Add `app/api/parse/route.ts` (400 for empty or over 500 characters, refusal and schema checks first, typed errors, 12-second timeout, 1 retry) and `tests/prompts.test.ts`. Add the typed-policy flow to the controller (reading phase, Run and chips disabled only while reading, edited chip text counts as typed), messages under the box, the 500-character counter, the AI panel title and the confidence tag.
  Verify (mechanical): `npm test` passes, including every example in `prompts/parse-policy.md`; calling `/api/parse` returns utilities −20 for "Electricity bills cut 20%", isPolicy false for "What should I eat for lunch?", a 400 for empty text and `{ ok: false }` with no key; the cost of one parse is recorded; in the browser, a typed policy runs end to end with diaries.
  Learner check: Type "Make transport cheaper for old folks" and read the panel's assumptions; type "What should I eat for lunch?" and read the reason under the box; edit a chip's text, run it, and check the panel now says the AI read it.
  Commit: `Read typed policies with the parser route`

- [ ] **5. Live evals for the AI parts**
  Becomes usable: `npm run eval:parser` and `npm run eval:diaries` print pass/fail tables: 10 fixture policies × 3 runs (your electricity sign check included), and the 4 presets × 2 diary runs, each diary checked against its own card.
  Why now: Both AI calls exist now, so their behaviour can be measured across repeats. This is your stated learning goal and the guard against a misread policy or a diary that contradicts its card.
  PRD ref: `prd.md > Diaries` (each diary agrees with its card), `prd.md > How the Policy Was Read` (a vague policy)
  Spec ref: `spec.md > Components` (Live Evals), `spec.md > Decisions and Open Issues` (The useful unknown: testing LLM output), `spec.md > External Services and Dependencies` (cost)
  Build: Install tsx; add `evals/parser.eval.ts` and `evals/diaries.eval.ts`, reusing the routes' own call code so the evals test what the app runs; add the `eval:parser` and `eval:diaries` scripts.
  Verify (mechanical): both evals run to completion, print their tables and pass; any failing case is shown to you with its actual output, and a fix to your prompts is made only with your agreement before re-running; real cost recorded.
  Learner check: Run `npm run eval:parser` yourself and read the table: which cases held across all 3 runs, and does anything make you want to change a prompt rule?
  Commit: `Add live parser and diary evals`

- [ ] **6. Ready to record**
  Becomes usable: The 90-second demo runs in production mode (`npm run build && npm start`): a soft shimmer while waiting, verdict colour flips that read on video (off for reduced motion), the layout stacking to one column on a phone with the disclaimer always visible, and a README covering setup, tests, evals and recording.
  Why now: Polish goes last, once every behaviour is proven; this is what the video and the public repository need.
  PRD ref: `prd.md > Screens and Layout`, `prd.md > Look and Feel`, `prd.md > States and Boundaries` (first visit, waiting), `prd.md > Disclaimer`
  Spec ref: `spec.md > Look and Feel`, `spec.md > Where It Runs and How Someone Tries It`, `spec.md > File Structure` (README.md)
  Build: Add the waiting shimmer and ~300 ms verdict colour transitions behind `prefers-reduced-motion`; check and fix the layout at phone, tablet and desktop widths; write `README.md`; run the final production build.
  Verify (mechanical): `npm test` and `npm run build` pass; `npm start` serves the page; in the browser at 375 px and at desktop width, the disclaimer stays visible and nothing scrolls sideways; the demo (fares, then petrol, then a typed policy) runs end to end in production mode with all 8 diaries inside 15 seconds.
  Learner check: Run `npm run build && npm start`, rehearse the 90-second demo at desktop width, then open the page in a narrow window or on your phone.
  Commit: `Polish motion and phone layout, add README`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 2: all 4 presets with cards, bars, chart and panel; approve the 8 everyday lines and the look before diaries and the parser build on them
- [ ] Final kick-the-tires exploration and feedback completed — after slice 6, in production mode

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: not started
Route and stops: not started
Edit outcome: not started
Reflection: not started
Activity mode: not started

## Revisions

