---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast (chosen after slice 1: "let's build further"; can switch any time)

## Slices

- [x] **1. Tap a preset and see who's hit**
  Becomes usable: A running page with the 8 residents on screen in their normal state (income, spare money, everyday line), the text box, 4 preset chips and the pinned disclaimer. Tapping a chip fills the box and instantly updates the summary line and every card's verdict, big number, % of income and spare-money line, all from the tested engine. Fares then petrol shows the flip.
  Why now: This is the unique kernel (eight specific people, two lenses, numbers from tested code), so it comes first with the scaffold folded in. It has no AI in it, so every later slice builds on numbers already proven against the acceptance table.
  PRD ref: `prd.md > The Core Journey` (steps 1, 2, 4, 6), `prd.md > Policy Input and Presets`, `prd.md > Town Summary`, `prd.md > Resident Cards`, `prd.md > Verdicts`, `prd.md > Expected Preset Results`, `prd.md > Disclaimer`
  Spec ref: `spec.md > Stack`, `spec.md > File Structure`, `spec.md > Look and Feel`, `spec.md > Components` (Town Data, Lever Schema, Presets, Policy Engine, Display Formatting, Crash Test Controller, Page and UI Components, Tests), `spec.md > Data Model`, `spec.md > Decisions and Open Issues` (Early build checks: scaffolding, heading font, TypeScript)
  Build: Scaffold Next.js 16.4 in a temp folder and move it in, merging `.gitignore`; install zod, Vitest and lucide-react. Add `data/residents.ts` with drafted everyday lines, `lib/schemas.ts`, `lib/engine.ts`, `lib/format.ts`, the 4 preset files and `lib/presets.ts`. Write `tests/engine.test.ts`, `tests/presets.test.ts` and `tests/format.test.ts`. Build the page with `PolicyInput` (box and chips; typed policies arrive in slice 4), `StatusLine` (summary line), `ResidentCard` and `Disclaimer`, using the palette and fonts (check Archivo's width axis through `next/font`; fall back to Archivo Black).
  Verify (mechanical): `npm test` passes, including every row of `prd.md > Expected Preset Results` card by card and the exact −1%, −5%, −10% and −30% lines; `npm run build` finishes with no type errors; in the browser, tapping "Bus and train fares rise 20%" shows "2 feel it, 4 barely affected, 2 unaffected" and tapping "Petrol prices rise 15%" shows "1 hit hard, 1 feels it, 6 unaffected".
  Learner check: Run `npm run dev`, open http://localhost:3000, tap "Bus and train fares rise 20%" and then "Petrol prices rise 15%", and watch Chloe and Uncle Raju trade places with Faizal and Marcus. Read the 8 everyday lines and say which you'd change.
  Commit: `Add town, engine and presets with instant preset runs`

- [x] **2. See the spread at a glance**
  Becomes usable: After a preset runs, the chart shows each person's monthly change from a zero line in verdict colours (striped one-offs, $0 for Unaffected); each card's spare-money bar shows the bite, with the 10% tick and the hazard spill below zero; and the panel explains "How this preset is set up" with the Hand-checked tag.
  Why now: It completes the lab-report half of the demo with no AI involved, so the look can be judged and adjusted at the early checkpoint before diaries and the parser build on the same layout.
  PRD ref: `prd.md > Monthly Change Chart`, `prd.md > Resident Cards` (spare-money bar, below zero, one-offs, Unaffected), `prd.md > How the Policy Was Read` (presets), `prd.md > Screens and Layout`
  Spec ref: `spec.md > Components` (Page and UI Components: ChangeChart, SpareMoneyBar, PolicyPanel; Display Formatting), `spec.md > Look and Feel`
  Build: Add `ChangeChart` (HTML/CSS bars, zero line, verdict colours, striped one-off segments with the "one-off, spread over 12 months" legend, labelled amounts), `SpareMoneyBar` (red or green share, 10% tick, hazard spill) and `PolicyPanel` (levers in plain English, assumptions, Hand-checked tag, "Type your own policy to watch the AI read it live."). Chart and panel sit side by side on wide screens and stay hidden until the first run.
  Verify (mechanical): `npm test` passes, with new tests for chart values and plain-English levers; `npm run build` passes; in the browser, every chart amount equals its card's number for all 4 presets, the one-off preset shows striped +$25 bars for Chloe and Uncle Raju only, and Faizal's petrol bar spills into the hazard zone.
  Learner check: Tap each of the 4 chips and look at the chart, the spare-money bars and the panel. Say what you'd change about the look before the diaries land on these cards.
  Commit: `Add change chart, spare-money bars and preset panel`

- [x] **3. Diaries stream into the cards**
  Becomes usable: After the numbers land, each card's diary spot shimmers, then fills with a mood tag, a short reaction and a few first-person sentences in Lora italic, one card at a time. Missing diaries show "Diary didn't come through" with one "Retry diaries" button, and a new run drops late diaries from the old one.
  Why now: The diary stream is the riskiest piece left (streaming, the 15-second target, cancelling a run), and it finishes demo steps 1 and 2 end to end. Presets already work, so diaries can be tested without the parser.
  PRD ref: `prd.md > Diaries`, `prd.md > The Core Journey` (steps 3, 5, 6), `prd.md > States and Boundaries` (numbers in with diaries pending, diaries fail, a new run while diaries arrive)
  Spec ref: `spec.md > Components` (Diary Route, Prompt and Client Setup, Crash Test Controller, Page and UI Components: DiaryNote, StatusLine), `spec.md > External Services and Dependencies`, `spec.md > Important Failure Modes`, `spec.md > Decisions and Open Issues` (Early build checks: refusal fallback, first diary speed, abort signal)
  Build: Load the claude-api skill first. Install `@anthropic-ai/sdk`; add `.env.example`, `lib/anthropic.ts`, `lib/prompts.ts`, `lib/diaryInput.ts` and `app/api/diaries/route.ts` (one JSON object per line, shape checks, refusal and error handling, the request's abort signal passed through). Extend the controller with run ids, abort, the 20-second timer and retry; add `DiaryNote` and the "Running the numbers" and "Writing diaries" status steps.
  Verify (mechanical): a test shows the diary input carries the exact card strings; one live fares run returns 8 valid lines and `done`, with time to first diary, total time (under 15 s), tokens and cost recorded before anything runs in bulk; an aborted request stops the model call; a bad key gives an error line, not a crash; `npm run build` passes; in the browser, diaries land on the right cards, a second run mid-stream drops the old diaries, and Retry fills only the missing ones.
  Learner check: First, copy `.env.example` to `.env.local` and add your key yourself. Then tap "Bus and train fares rise 20%" and watch the diaries fill in; tap "Petrol prices rise 15%" while they're still arriving and check that no old diary lands on the new cards.
  Commit: `Stream resident diaries into the cards`

- [x] **4. Type your own policy**
  Becomes usable: Typing a policy and pressing "Run the crash test" sends it to Claude Haiku 5.5; the town reacts with numbers, chart and diaries, and the panel reads "How the AI read this policy" with plain-English levers, assumptions and a confidence tag. A non-policy shows the AI's reason under the box; an error shows "Couldn't read that one right now. Try again, or tap a preset." with Try again; either way the town stays as it was.
  Why now: It's demo step 3 and the last journey behaviour. It reuses the engine, panel and diaries already proven, so any trouble here is isolated to the parser.
  PRD ref: `prd.md > Policy Input and Presets`, `prd.md > How the Policy Was Read`, `prd.md > States and Boundaries` (couldn't read the policy, not a policy, a policy that changes nobody's budget)
  Spec ref: `spec.md > Components` (Parse Route, Lever Schema, Crash Test Controller, Page and UI Components: PolicyInput, PolicyPanel, Tests), `spec.md > External Services and Dependencies`, `spec.md > Decisions and Open Issues` (Early build checks: `zodOutputFormat`)
  Build: Check that `zodOutputFormat` accepts zod 4 and the lever schema (fallback: a hand-written JSON Schema, still checked by zod). Add `app/api/parse/route.ts` (400 for empty or over 500 characters, refusal and schema checks first, typed errors, 12-second timeout, 1 retry) and `tests/prompts.test.ts`. Add the typed-policy flow to the controller (reading phase, Run and chips disabled only while reading, edited chip text counts as typed), messages under the box, the 500-character counter, the AI panel title and the confidence tag.
  Verify (mechanical): `npm test` passes, including every example in `prompts/parse-policy.md`; calling `/api/parse` returns utilities −20 for "Electricity bills cut 20%", isPolicy false for "What should I eat for lunch?", a 400 for empty text and `{ ok: false }` with no key; the cost of one parse is recorded; in the browser, a typed policy runs end to end with diaries.
  Learner check: Type "Make transport cheaper for old folks" and read the panel's assumptions; type "What should I eat for lunch?" and read the reason under the box; edit a chip's text, run it, and check the panel now says the AI read it.
  Commit: `Read typed policies with the parser route`

- [x] **5. Live evals for the AI parts**
  Becomes usable: `npm run eval:parser` and `npm run eval:diaries` print pass/fail tables: 10 fixture policies × 3 runs (your electricity sign check included), and the 4 presets × 2 diary runs, each diary checked against its own card.
  Why now: Both AI calls exist now, so their behaviour can be measured across repeats. This is your stated learning goal and the guard against a misread policy or a diary that contradicts its card.
  PRD ref: `prd.md > Diaries` (each diary agrees with its card), `prd.md > How the Policy Was Read` (a vague policy)
  Spec ref: `spec.md > Components` (Live Evals), `spec.md > Decisions and Open Issues` (The useful unknown: testing LLM output), `spec.md > External Services and Dependencies` (cost)
  Build: Install tsx; add `evals/parser.eval.ts` and `evals/diaries.eval.ts`, reusing the routes' own call code so the evals test what the app runs; add the `eval:parser` and `eval:diaries` scripts.
  Verify (mechanical): both evals run to completion, print their tables and pass; any failing case is shown to you with its actual output, and a fix to your prompts is made only with your agreement before re-running; real cost recorded.
  Learner check: Run `npm run eval:parser` yourself and read the table: which cases held across all 3 runs, and does anything make you want to change a prompt rule?
  Commit: `Add live parser and diary evals`

- [x] **6. Ready to record**
  Becomes usable: The 90-second demo runs in production mode (`npm run build && npm start`): a soft shimmer while waiting, verdict colour flips that read on video (off for reduced motion), the layout stacking to one column on a phone with the disclaimer always visible, and a README covering setup, tests, evals and recording.
  Why now: Polish goes last, once every behaviour is proven; this is what the video and the public repository need.
  PRD ref: `prd.md > Screens and Layout`, `prd.md > Look and Feel`, `prd.md > States and Boundaries` (first visit, waiting), `prd.md > Disclaimer`
  Spec ref: `spec.md > Look and Feel`, `spec.md > Where It Runs and How Someone Tries It`, `spec.md > File Structure` (README.md)
  Build: Add the waiting shimmer and ~300 ms verdict colour transitions behind `prefers-reduced-motion`; check and fix the layout at phone, tablet and desktop widths; write `README.md`; run the final production build.
  Verify (mechanical): `npm test` and `npm run build` pass; `npm start` serves the page; in the browser at 375 px and at desktop width, the disclaimer stays visible and nothing scrolls sideways; the demo (fares, then petrol, then a typed policy) runs end to end in production mode with all 8 diaries inside 15 seconds.
  Learner check: Run `npm run build && npm start`, rehearse the 90-second demo at desktop width, then open the page in a narrow window or on your phone.
  Commit: `Polish motion and phone layout, add README`

- [x] **7. Characters whose faces react**
  Becomes usable: Every resident is drawn as an illustrated character carrying their role (hawker apron, driver's cap, student backpack and glasses, the couple, white hair and walking stick, scrubs and stethoscope, hi-vis vest, hoodie and headphones) in place of the initials. They appear on the cards and beside the chart's names. Faces react: calm before a run and when unaffected or barely affected, a smile when better off, worried brows when they feel it, stressed with a sweat drop when hard hit, then the diary's own mood once it lands.
  Why now: The map's pins reuse these characters, so they come first; it is contained, and it changes the existing cards straight away.
  PRD ref: `prd.md > Look and Feel` (avatars), `prd.md > Resident Cards`
  Spec ref: `spec.md > Components` (Page and UI Components: ResidentAvatar), `spec.md > Look and Feel` (characters and the town map)
  Build: Add `lib/expressions.ts` (verdict or diary mood → expression) with `tests/expressions.test.ts`. Add `components/ResidentAvatar.tsx`: inline SVG characters built from shared parts with an `expression` prop. Use it in `ResidentCard` (with a verdict-coloured ring after a run) and in the `ChangeChart` name column.
  Verify (mechanical): `npm test` passes, including every verdict and mood mapping; `npm run build` passes; in the browser all 8 characters render before a run with calm faces. Fares makes Chloe and Uncle Raju worried while Faizal and Marcus stay calm, petrol makes Faizal stressed, and childcare makes Faizal and Nurul smile. Nothing scrolls sideways at 375 px.
  Learner check: Tap fares, then petrol, and watch the faces change. Say whether each character reads as who they are.
  Commit: `Draw the residents as characters whose faces react`

- [x] **8. The town reacts on a map**
  Becomes usable: An illustrated neighbourhood sits between the summary and the chart, with every resident's pin at home. When a policy runs, the places it touches light up: fares the MRT station and bus stop, petrol the petrol station, childcare the childcare centre, and typed policies by their lever targets. Pins flip to their verdict colours with an impact pulse, coins drop over whoever gets a one-off, reactions pop up as diaries land, and selecting a pin brings that card into view.
  Why now: It's the hero of the upgrade and uses the characters from slice 7. It reads the same engine output, so no numbers change.
  PRD ref: `prd.md > Town Map`, `prd.md > Screens and Layout`, `prd.md > The Core Journey` (steps 4–5)
  Spec ref: `spec.md > Components` (Page and UI Components: TownMap), `spec.md > Look and Feel`
  Build: Add `lib/townMap.ts` (lever targets → lit landmarks; one-off coins from the results) with `tests/townMap.test.ts`. Add `components/TownMap.tsx`: an inline SVG scene with landmarks, homes, pins as keyboard-reachable buttons, reaction bubbles and coins, with motion off for reduced motion. Place it between the status line and the chart.
  Verify (mechanical): `npm test` passes, including landmarks for every lever target and coins only for one-off recipients; `npm run build` passes. In the browser at 375, 768 and 1440 px: the map shows, the page doesn't scroll sideways, fares lights the MRT and bus stop, petrol lights the petrol station, every pin colour matches its card, bubbles appear as diaries land, and selecting a pin brings its card into view.
  Learner check: Run fares, then petrol, on the map and watch the town flip; select a pin. Say what you'd change before the polish slice.
  Commit: `Add a town map that reacts to each policy`

- [x] **9. Impact polish**
  Becomes usable: When a policy lands, a short crash-test impact flash plays, big numbers count up to their values, and the cards flip smoothly, all switched off for reduced motion. The README and app map describe the characters and the map.
  Why now: Polish comes last, once the characters and the map work and you've reacted to them.
  PRD ref: `prd.md > Look and Feel`, `prd.md > Town Map`
  Spec ref: `spec.md > Look and Feel`
  Build: Add a count-up for the cards' big numbers (final value rendered straight away for reduced motion) and an impact flash when a run lands. Make a final layout pass, update `README.md`, and refresh `devpost/app-map.html` for the new pieces.
  Verify (mechanical): `npm test` and `npm run build` pass. With reduced motion emulated, nothing animates. In production mode the 90-second demo runs with the map, with all 8 diaries inside 15 seconds, and nothing scrolls sideways at 375 px.
  Learner check: Rehearse the demo in production mode with the map and say what you'd change.
  Commit: `Polish the impact moment and refresh the docs`

- [x] **10. Average vs. the people**
  Becomes usable: After a run, a strip sets the average resident, a faceless grey character with the town's mean change and its verdict, beside the 8 real faces, with a sentence naming who the average hides.
  Why now: A quick win, and the clearest statement of the kernel ("averages hide people"), so it comes first.
  PRD ref: `prd.md > Average vs. the People`
  Spec ref: `spec.md > Components` (Second upgrade: AverageStrip)
  Build: Add `lib/average.ts` (mean resident, verdict via the engine, the hidden-people sentence) with `tests/average.test.ts`, and `components/AverageStrip.tsx` between the status line and the map.
  Verify (mechanical): `npm test` passes, including fares (barely affected at −$28) and petrol (feels it at −$60) with their sentences; `npm run build` passes; in the browser the strip appears after a run, is hidden before one, and nothing scrolls sideways at 375 px.
  Learner check: Tap fares, then petrol, and read what the average says against what the faces show.
  Commit: `Show the average resident against the real ones`

- [x] **11. What-if sliders and tipping points**
  Becomes usable: After a run, each change gets a slider; dragging it re-runs the town instantly, with a "what-if" tag and a reset. Cards show each person's tipping point for single-change policies. "Write new diaries" refreshes the diaries on request.
  Why now: It turns watching into exploring and shows the verdict thresholds at work, all in tested, deterministic code.
  PRD ref: `prd.md > What-if Sliders and Tipping Points`
  Spec ref: `spec.md > Components` (Second upgrade: WhatIf)
  Build: Add `lib/whatIf.ts` (scaled levers, slider ranges, tipping points) with `tests/whatIf.test.ts`, the controller's what-if state, `components/WhatIf.tsx`, tipping-point lines on the cards, and the "Write new diaries" action.
  Verify (mechanical): `npm test` passes, including Nurul and Mdm Lim tipping at +22% under fares and slider values matching the engine; `npm run build` passes; in the browser dragging the slider updates cards, chart, map and faces with no network call, and reset restores the policy.
  Learner check: Under fares, drag the slider until Nurul flips, then reset.
  Commit: `Add what-if sliders and tipping points`

- [x] **12. A living town**
  Becomes usable: Residents move between home and their usual places, and the train, bus and daylight change. When a policy lands, each affected resident goes to the place that matters to them and reacts there, while everyone else carries on. Reduced motion keeps everyone still at home.
  Why now: This is the "crazy interface" heart of the upgrade, and the riskiest visual work, so it comes before the features that build on the map.
  PRD ref: `prd.md > Living Town`, `prd.md > Town Map`
  Spec ref: `spec.md > Components` (Second upgrade: living town), `spec.md > Look and Feel`
  Build: Add `lib/townLife.ts` (usual places, routes, each resident's spot for a policy, found lever by lever with the engine) with `tests/townLife.test.ts`. Extend `TownMap` with moving pins (CSS transitions), ambient SVG motion and a day-to-night tint, all off for reduced motion.
  Verify (mechanical): `npm test` passes, including fares sending Chloe and Raju to the MRT and bus stop and petrol sending Faizal and Marcus to the petrol station; `npm run build` passes; in the browser pins move before a run and gather after one, pins still open cards, and nothing scrolls sideways at 375 px.
  Learner check: Watch the town for a moment, then run fares and petrol and watch who goes where.
  Commit: `Bring the town to life`

- [x] **13. Town chatter**
  Becomes usable: After the diaries, residents talk to each other about the policy, in a streamed chatter feed and as speech bubbles on the map.
  Why now: It builds on the living town and reuses the diary streaming pattern and guardrails.
  PRD ref: `prd.md > Town Chatter`
  Spec ref: `spec.md > Components` (Second upgrade: town chatter), `spec.md > External Services and Dependencies`
  Build: Draft `prompts/town-chatter.md` for your approval. Add `lib/writeChatter.ts`, `app/api/chatter/route.ts` (one JSON line per remark, shape-checked), chatter state in the controller, the feed and map bubbles, and `evals/chatter.eval.ts`.
  Verify (mechanical): `npm test` passes, including a test that the chatter input carries the card strings; one live run streams valid remarks, with its cost recorded; `npm run eval:chatter` passes on the presets; failures leave the page intact.
  Learner check: Approve or edit the chatter prompt, then run two presets and read what the town says.
  Commit: `Let the residents talk to each other`

- [x] **14. Add yourself**
  Becomes usable: "Move into town" lets you enter your age, income, spending, housing, children and car, and build your character. You become resident #9 on the map, in the cards, chart, summary and diaries, and nothing is saved.
  Why now: The personal hook comes once the town, map and chatter can take a ninth resident.
  PRD ref: `prd.md > Add Yourself`
  Spec ref: `spec.md > Components` (Second upgrade: MoveIn)
  Build: Add `lib/yourself.ts` (answers → a validated resident) with `tests/yourself.test.ts`. Let the engine, summary, chart, map, diaries and chatter take a resident list. Add `components/MoveIn.tsx` with a character builder and a home spot on the map.
  Verify (mechanical): `npm test` passes, including your card matching the engine for every preset; `npm run build` passes; in the browser you appear, the summary counts 9, and refresh removes you.
  Learner check: Move in as yourself and run the four presets.
  Commit: `Let visitors move into town`

- [x] **15. Guided intro**
  Becomes usable: A first-visit scroll story: meet the town, averages hide people, watch a fare rise land, Raju vs. Nurul, your turn. It can be skipped and replayed, and it makes no AI calls.
  Why now: It narrates everything above, so it comes last.
  PRD ref: `prd.md > Guided Intro`
  Spec ref: `spec.md > Components` (Second upgrade: GuidedIntro)
  Build: Add `components/GuidedIntro.tsx` (scroll-driven steps using the presets and the engine), a skip control, a "Replay intro" link, and still steps for reduced motion. Refresh the README and app map.
  Verify (mechanical): `npm test` and `npm run build` pass; in the browser the intro plays, skip works at every step, it makes no network calls, and it stays still with reduced motion; the production demo runs end to end.
  Learner check: Watch the intro as a first-time visitor would, then skip it on a second visit.
  Commit: `Add a guided intro`

- [x] **16. A month in the life**
  Becomes usable: A day slider and Play button run one month. Everyone's spare money shrinks or grows day by day as the change adds up, a one-off lands on day 1, and anyone who runs out gets a "Gone by day N" marker (Faizal under petrol: day 10).
  Why now: It's the most direct picture of the kernel, what's left after the bill, and it reuses the engine's numbers as they are.
  PRD ref: `prd.md > A Month in the Life`
  Spec ref: `spec.md > Components` (Third upgrade: MonthInLife)
  Build: Add `lib/month.ts` (each day's spare money and the run-out day, from the engine's cents) with `tests/month.test.ts`, and `components/MonthInLife.tsx` (Play, day slider, one row per resident, a headline that follows the month). It follows the what-if sliders and includes you.
  Verify (mechanical): `npm test` passes, including Faizal gone by day 10 and $200 short on day 30 under petrol, and every day-30 value being spare money plus the engine's monthly change plus any one-off; `npm run build` passes; in the browser Play runs the month, the slider scrubs it, and nothing scrolls sideways at 375 px.
  Learner check: Run petrol and play the month; then drag the what-if slider and play it again.
  Commit: `Play out a month in the life`

- [x] **17. Why? budget drawer**
  Becomes usable: A "Why?" button on every card opens a drawer with that person's whole budget before and after, the changed lines highlighted, and both checks behind the verdict (income and spare money), naming the one that decided.
  Why now: It answers the first question anyone asks about a verdict, using the engine's own category numbers.
  PRD ref: `prd.md > Why? Budget Drawer`
  Spec ref: `spec.md > Components` (Third upgrade: WhyDrawer)
  Build: Extend `lib/engine.ts` to return each category's before and after and both verdict checks (tested, no change to any existing result), add `lib/why.ts` for the drawer's rows and wording, and `components/WhyDrawer.tsx` as a native dialog.
  Verify (mechanical): `npm test` passes, including every drawer's rows adding up to the card's monthly change for every preset, and Uncle Raju's fares drawer naming spare money as the deciding check; `npm run build` passes; in the browser the drawer opens from a card, closes with Escape and returns focus, and fits at 375 px.
  Learner check: Open Uncle Raju's and Nurul's drawers under fares and compare why they differ.
  Commit: `Show why each verdict landed`

- [x] **18. The phone map follows the action**
  Becomes usable: On narrow screens the map glides to where a policy lands and to whoever is speaking in the chatter, and a "Whole town" toggle fits the map to the screen. Wide screens don't change.
  Why now: The target user reads on a phone, where the map currently needs sideways scrolling to find the action.
  PRD ref: `prd.md > Phone Map Follows the Action`
  Spec ref: `spec.md > Components` (Third upgrade: map focus)
  Build: Add `lib/mapFocus.ts` (where to centre for a policy, and the clamped scroll position) with `tests/mapFocus.test.ts`; extend `TownMap` with the glide, the chatter follow and the "Whole town" toggle, jumping instead of gliding for reduced motion.
  Verify (mechanical): `npm test` passes; `npm run build` passes; at 375 px the petrol station is in view after petrol and the childcare centre after childcare, "Whole town" fits without sideways scrolling, and at 1280 px nothing moves; then the production demo runs end to end.
  Learner check: On a phone-width window, run petrol and childcare, watch the map follow, and try "Whole town".
  Commit: `Let the phone map follow the action`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 2: all 4 presets with cards, bars, chart and panel; approve the 8 everyday lines and the look before diaries and the parser build on them. Learner: "Looks good to me. Keep the everyday lines as they are."
- [x] Final kick-the-tires exploration and feedback completed — after slice 6, in production mode. Learner: "I tried it in production mode: the demo, awkward inputs and phone width all work."
- [x] Upgrade explored — after slice 8: the characters and the town map, before the polish slice. Learner: "The map and characters look great. No changes, go ahead with the polish slice."
- [x] Living town explored — after slice 12, before chatter and the rest
- [x] Final kick-the-tires after the upgrade — after slice 15, in production mode. Learner: "I tried it in production mode: the intro, all four presets, the sliders, moving in and phone width all work. No changes." Then asked for more before the freeze (slices 16–18).
- [ ] Final kick-the-tires after slices 16–18 — in production mode, before the Oct 24 feature freeze

## Final Review

No changes needed: the learner tried the demo, awkward inputs and phone width in production mode and asked for no revisions.

- [x] Final review complete — feedback resolved and learner confirms ready to ship. Learner: "It's ready to ship, no changes needed."
- [ ] Upgrade final review complete — feedback resolved and learner confirms the upgraded app is ready to ship

## Code Tour and App Map

- [x] Learning activity complete — prior practice connected: the slice 5 eval-failure investigation (focused alternative, done during the build)
- [x] Optional edit and transfer reflection addressed — edit not applicable; transfer question offered at the wrap-up
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse
- [x] `devpost/app-map.html` refreshed for the characters and the town map (no repeat of the learning activity); snapshot of `58ef992`, new anchors checked

Activity and evidence: Prior practice, connected at the wrap-up. In slice 5 the first live eval run failed (parser 9/10, diaries 4/8). Reading the actual outputs showed equivalent fields, quoted policy amounts and correct arithmetic, not wrong numbers on screen. The learner chose to fix the eval definitions and give the diary writer the engine's spare money after, instead of changing the prompts; the re-run passed 10/10 and 8/8. Evidence: Revisions above, `evals/parser.eval.ts`, `evals/diaries.eval.ts`, `lib/diaryInput.ts` (`residentBlock`).
Route and stops: A reference route in the app map, not toured: `lib/useCrashTest.ts` (`startRun`), then `lib/engine.ts` (`verdict`), then `tests/presets.test.ts` ("Uncle Raju feels it").
Edit outcome: Not applicable; the focused alternative used the learner's eval decisions in place of a code edit.
Reflection: Optional transfer question offered at the wrap-up; any answer is kept only in the ignored learner profile.
Activity mode: Prior practice connected (focused alternative), plus the app map. The map was checked: all 41 paths and anchors exist, it works offline with no scripts or network, and it fits at 375 px. It is a snapshot of code commit `2b07b8e`.

## Revisions

- Tailwind v4 is wired through `@tailwindcss/turbopack` in `next.config.ts`, with no `postcss.config.mjs` — create-next-app 16.4.1's template replaced the `@tailwindcss/postcss` setup the spec assumed; `spec.md > Stack` and `File Structure` updated.
- `@types/node` is `^22` instead of the template's `^20` — Vitest 5 requires `@types/node` 22 or newer as a peer; this machine runs Node 22.
- The Vitest config is `vitest.config.mts` — as `.ts` it loads as CommonJS in this project and Vite warns; `spec.md > File Structure` updated.
- `lib/prompts.ts` caches the prompts only in production and re-reads them on every call in development — so prompt edits apply without a restart while you iterate; `spec.md > Prompt and Client Setup` updated.
- The parser sends zod's own JSON Schema (minus `$schema`) as its structured-output format instead of `zodOutputFormat` — SDK 0.134's `zodOutputFormat` moves every `enum` into a description, so the model wouldn't be held to the allowed targets, kinds, housing types and tags; the reply is still checked by zod (the spec's planned fallback). `spec.md > Parse Route` updated.
- The parse call lives in a new `lib/readPolicy.ts`, shared by the route and the parser eval so the eval tests exactly what the app runs; `spec.md > File Structure` updated.
- The diary call lives in a new `lib/writeDiaries.ts`, shared by the route and the diary eval, for the same reason.
- Parser eval case 3 accepts `tagsAny: ["has_children"]` as well as `mustHaveChildren: true` — the first live run returned the tag 3/3 times; the engine selects the same residents either way, so the check now tests who is eligible, not which field was used (learner's decision).
- The diary eval's amount check allows amounts quoted from the policy text — diaries quoted "$300" and "under $3,000" from the policy itself, which is accurate (learner's decision).
- The diary input now gives each affected resident's spare money after, from the engine, and the eval allows it — the model was computing totals itself (Nurul: "from $500 to $900"); now every number a diary states comes from tested code (learner's decision). After these three: parser 10/10 (3 runs each), diaries 8/8.
- Slices 7–9 added after the final review, at the learner's request ("build it crazy"): illustrated characters whose faces react and a town map that reacts to each policy. This was the scope's own Later item "Town reacting loading animation". `scope.md`, `prd.md` (new `Town Map` section) and `spec.md` (`ResidentAvatar`, `TownMap`) were updated with the learner's agreement. Presentation only: the numbers, tests and evals don't change.
- The upgrade's final review moved from after slice 9 to after slice 15. At the planned review, the learner asked for more ("we have to improve the interface by a lot"), so slices 10–15 were added: average vs. the people, what-if sliders, a living town, town chatter, add yourself, and a guided intro. Feature freeze is Oct 24. `scope.md`, `prd.md` and `spec.md` were updated with the learner's agreement.
- Town chatter stays among the 8 residents even after you move in. `prd.md > Add Yourself` says your answers go to Claude only for your diary, so slice 14 sends them only with the diary request instead of giving chatter a resident list.
- "Move into town" also asks how many people live at home. Each diary's input states the household size, and guessing it from "children at home" could have put the wrong family into your diary.
- After the upgrade's kick-the-tires (no changes), the learner asked for more before the freeze ("we still hv time, do something more"). From six proposed ideas they chose three, added as slices 16–18: a month in the life, a Why? budget drawer, and a phone map that follows the action. The upgrade's final review moved to after slice 18. `prd.md`, `spec.md` and `scope.md` were updated with the learner's agreement. The engine gains outputs (each category's before and after, both verdict checks) but no existing number changes.
