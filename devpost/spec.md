---
doc: spec
status: approved
---

# Policy Crash Test — Technical Spec

Implements `prd.md` (approved). Visual companion with the data-flow diagram: `devpost/spec.html`. This Markdown file is the canonical version.

## How This Works, In Plain Language
Policy Crash Test is one web page, two small server routes, and one calculator that runs in the browser.

- **The town** is a fixed list of 8 residents in a code file: their income, what they spend in 9 categories, and a few facts (age, housing type, tags). Nothing about them changes while the app runs.
- **Levers** are a policy written as numbers, for example "public transport costs +20% for everyone" or "$300 one-off for adults earning up to $3,000". Everything after the input step works from levers.
- **Presets** are 4 lever files written and checked by hand. Tapping a chip loads one; no AI is involved.
- **The parser** is a server route that sends a typed policy to Claude Haiku 5.5 with your parser prompt and gets levers back. The reply is forced into the lever shape (structured output), then checked again before it's used.
- **The engine** is plain TypeScript. It applies levers to each resident's budget and works out the monthly change, spare money before and after, both percentages and the verdict. Same input, same output, every time, so it's tested like a calculator. The same file runs in the browser (cards update instantly) and on the server (to brief the diary writer).
- **The diary writer** is a second server route. It re-runs the engine, sends Claude Sonnet 5.5 each resident's exact card numbers with your diary prompt, and streams back one diary per line. The page drops each diary into its card as it arrives.
- **The page** holds the current run in memory. Nothing is saved; refresh and the town is back to normal.

Why this shape: the AI does only the two things it's good at, reading messy text and writing in a human voice, and every number on screen comes from tested code. That is `scope.md > The Unique Kernel` turned into architecture. There are two routes because there are two prompts, and no database because nothing persists (`prd.md > Non-Goals`).

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

```
 Preset chip ─► data/presets/*.json ──┐
                                      ├─► levers ─► engine (browser) ─► summary · chart · cards · panel
 Typed text ─► POST /api/parse ───────┘      │
               Haiku 5.5 + parse-policy.md   └─► POST /api/diaries ─► Sonnet 5.5 + write-diaries.md
                                                 (engine again,          │ one JSON object per line
                                                  exact card strings)    ▼
                                                                  diary drops into its card
```

1. **Meet the town.** The page loads the 8 residents from `data/residents.ts`. Cards show income, spare money (income minus spending) and the everyday line.
2. **Pick a policy.**
   - **Preset:** the chip's file in `data/presets/` already holds the levers and assumptions. Go to step 4.
   - **Typed:** the page sends `{ text }` to `POST /api/parse`; the status line says "Reading the policy".
3. **Reading (typed policies only).** The route checks the text (1–500 characters) and sends it to Claude Haiku 5.5 with `prompts/parse-policy.md` and the lever schema. It validates the reply and returns levers, assumptions and confidence, or a not-a-policy reason, or an error. On a not-a-policy reason or an error, the message appears under the box and the town stays as it was.
4. **Running the numbers.** The page runs the engine on the levers for all 8 residents. The summary line, chart, card numbers, verdicts and policy panel update in place, instantly, with no network call.
5. **Writing diaries.** The page sends `{ policyText, levers, residentIds }` to `POST /api/diaries` and starts a 20-second timer. The route re-runs the engine, writes each resident's card strings into the request, and streams Claude Sonnet 5.5's reply. Each finished line that passes the diary check goes to the page as one line of JSON, and the page puts it on the matching card.
6. **Done, or partly done.** When the stream ends, or 20 seconds pass, any card still waiting shows "Diary didn't come through". "Retry diaries" requests just those residents.
7. **Next policy.** A new run cancels the old diary request, and anything still arriving from it is ignored. Cards keep their positions; only their contents change.

## Stack
Versions were checked on npm on 2026-10-15. The build installs the latest release in each line below.

| Piece | Choice | Version | Docs | Why |
|---|---|---|---|---|
| Framework | Next.js, App Router | 16.4.x | https://nextjs.org/docs/app | Your choice: one project for the page and the server routes. |
| UI | React | 19.3.x | https://react.dev | Comes with Next.js. |
| Language | TypeScript | as installed by create-next-app | https://www.typescriptlang.org/docs/ | Your choice. The engine and schemas share types between page and server. |
| Styling | Tailwind CSS v4 via `@tailwindcss/turbopack` (the create-next-app 16.4 default) | 4.3.x | https://tailwindcss.com/docs/installation/framework-guides/nextjs | Your choice. |
| AI SDK | `@anthropic-ai/sdk` | 0.134.x | https://github.com/anthropics/anthropic-sdk-typescript | Official SDK: structured output, streaming, typed errors. |
| Validation | zod | 4.6.x | https://zod.dev | One schema checks preset files, parser replies and diary lines, and feeds the structured-output format. |
| Tests | Vitest | 5.0.x | https://vitest.dev | Fast TypeScript tests for the engine, formatting, presets and prompt files. |
| Eval runner | tsx | 4.23.x | https://tsx.is | Runs the live eval scripts directly, with `.env.local` loaded. |
| Icons | lucide-react | 1.57.x | https://lucide.dev | Open-source icon set for the role icons. |
| Fonts | `next/font/google`: Archivo, Inter, Lora | (built in) | https://nextjs.org/docs/app/api-reference/components/font | Downloaded at build time and self-hosted, so no layout shift. |

**Models** (your choice; each can be overridden by its env var, and both sit in `.env.example` with these defaults):
- `PARSE_MODEL=claude-haiku-5-5`: fast, cheap reading of a typed policy.
- `DIARY_MODEL=claude-sonnet-5-5`: stronger writing for the diaries.

## Where It Runs and How Someone Tries It
- **Runtime:** a local Next.js server on your laptop (Node.js 20.9 or newer; this machine has 22.23). The page runs in the browser. The two routes run on the local server in the Node runtime, because they read the prompt files from disk.
- **Setup:**
  1. `npm install`
  2. `cp .env.example .env.local`, then fill in `ANTHROPIC_API_KEY`. `.env.local` is git-ignored; `.env.example` holds the model defaults and no secret.
  3. `npm run dev`, then open http://localhost:3000.
- **Offline tests:** `npm test` (no key, no cost).
- **Live evals:** `npm run eval:parser` and `npm run eval:diaries` (use your key; cost under **External Services and Dependencies**).
- **Recording the demo:** `npm run build && npm start`, then open http://localhost:3000 in a fresh browser window at desktop width. Production mode is faster and has no dev overlay. Rehearse the typed policy first (`prd.md > Open Questions`).
- **Submission:** the demo video plus the public GitHub repository: https://github.com/prashantagrawal09/policy-crash-test (public since 2026-10-20). Demo video: to be recorded. Deployment is optional and not chosen. If wanted later, Vercel deploys a Next.js app from the repository with `ANTHROPIC_API_KEY` set as a project variable. A public deploy would let anyone spend your key through the two routes, so add a simple rate limit first (decide in `6-ship`).

## Look and Feel
From `prd.md > Look and Feel`, as build instructions. Tailwind v4 handles all of it with CSS variables and a few custom utilities; no component library.

- **Palette** (CSS variables in `app/globals.css`, exposed to Tailwind through `@theme`): paper `#F7F5F0` page background, ink `#111111` text, hazard `#FFD400`, diary paper `#FBF3E4`.
- **Verdict colours:** green `#1F8A4C` Better off, grey `#8A8F98` Barely affected, amber `#D98A00` Feels it, red `#C8322B` Hard hit. Unaffected cards keep the "before" look, slightly faded, with an outline badge (small call 13).
- **Hazard stripes:** `repeating-linear-gradient(-45deg, #FFD400 0 8px, #111111 8px 16px)` for header accents and the below-zero spill. One-off bars use green-and-white stripes.
- **Typography:** headings in Archivo at black weight and condensed width (`prd.md` small call 15); numbers and labels in Inter with tabular figures; diaries in Lora italic.
- **Density and energy:** spacious, like The Pudding: plenty of white space, content up to about 1200px wide, big numbers first on each card.
- **Copy tone:** plain and calm. Labels are short, like a lab report. The diaries are the only first-person voice.
- **Motion:** a soft shimmer while waiting; cards change colour with a short transition so the flip reads on video. Both switch off for people who prefer reduced motion.
- **Layout:** cards four across on wide screens, two on tablets, one column on phones (`prd.md` small call 17). The town map sits between the summary and the chart at full width; on phones it pans sideways inside its frame.
- **Characters and the town map:** flat, friendly vector illustration in the same palette: solid fills, thin outlines, no gradients or shadows. Faces react through brows, eyes and mouth (plus blush or a sweat drop). Pulses, floats and bubbles switch off for people who prefer reduced motion.

## Components

### Town Data
`data/residents.ts`. The 8 residents, each with: id, name, age, role, everyday line, household size, housing type, tags, icon, monthly income, and a budget across 9 categories (housing, food, public_transport, private_transport, utilities, healthcare, childcare, education, other). The budgets come from `devpost/idea-brief.md`, with the childcare/education split.

Housing types (your mapping): Mdm Lim `hdb_3_room`, Faizal `hdb_4_room`, Chloe `with_parents`, the Gohs `renting`, Uncle Raju `hdb_2_room`, Nurul `hdb_3_room`, Marcus `condo`, Tan Wei Jie `renting`. Icons follow `prd.md` small call 16. The everyday lines are drafted during the build for your approval.

PRD ref: `prd.md > Resident Cards`.

### Lever Schema
`lib/schemas.ts`. zod schemas, with TypeScript types inferred from them:
- **Lever:** kind, target, value, eligibility, description.
- **Eligibility:** minAge, maxAge, minMonthlyIncome, maxMonthlyIncome, housingTypes, mustHaveChildren, tagsAny. All are optional.
- **ParseResult:** isPolicy, rejectReason (optional), levers, assumptions, confidence.
- **PresetFile:** id, chip text, levers, assumptions.
- **DiaryLine:** id, mood, reaction, diary.

The parse route turns ParseResult into the structured-output format. The preset loader, engine inputs and diary route all use the same schemas.

PRD ref: `prd.md > How the Policy Was Read`.

### Presets
`data/presets/*.json`, loaded by `lib/presets.ts`. Four files, each validated against the lever schema when loaded and in tests:
- `fares-20.json`: public_transport +20%, everyone. Assumption: no concession discounts are modelled.
- `one-off-300.json`: one_off_payment 300, with minAge 21 and maxMonthlyIncome 3000. Assumption: "under $3,000" is read as "$3,000 or less" (small call 4).
- `petrol-15.json`: private_transport +15%, everyone. Assumption: all private transport costs (car rental and petrol) are treated as rising, not just petrol.
- `childcare-half.json`: childcare −50%, mustHaveChildren. Assumptions: all parents in this town work, and school fees aren't included.

PRD ref: `prd.md > Policy Input and Presets`, `prd.md > Expected Preset Results`.

### Policy Engine
`lib/engine.ts`. Pure functions, with no AI and no I/O.
- **`spareMoney(resident)`:** income minus total spending.
- **`isEligible(resident, eligibility)`:** every rule given must pass. Bounds are inclusive; `tagsAny` matches any of the resident's tags; `housingTypes` matches the resident's type.
- **`applyLevers(resident, levers)`:**
  - `percent_change` multiplies the pre-policy category amount by (1 + value/100) (small call 3).
  - `fixed_monthly_change` adds the value to a category or to income.
  - `one_off_payment` is kept separate.
  - `all_taxable_spending` expands to food, public_transport, private_transport, utilities and other.
  - Amounts are rounded to the cent after each lever (small call 2).
- **Result per resident:** monthly change, one-off, net change (the monthly change plus one-off ÷ 12), spare money before and after, % of income, % of spare money, and the verdict.
- **`verdict()`:** the rules in `prd.md > Verdicts`.
  - Both lenses are checked and the worse one wins; the spare-money lens applies to losses only.
  - A line counts as crossed only when the value goes past it (`prd.md` small call 1).
  - Unaffected means the monthly change and the one-off are both exactly 0.

PRD ref: `prd.md > Verdicts`, `prd.md > Resident Cards`.

### Display Formatting
`lib/format.ts`. Pure functions:
- amounts in whole dollars;
- percentages to one decimal, rounded toward zero, without a trailing ".0";
- the card lines for a loss, a gain, a gain bigger than the spare money, spare money below zero, and a one-off;
- the summary line, including "Nobody's monthly budget changes" when all 8 are Unaffected (`prd.md > States and Boundaries`);
- the chart values.

`prd.md > Expected Preset Results` is its test.

PRD ref: `prd.md > Resident Cards`, `prd.md > Town Summary`; `prd.md` small calls 2, 3, 5 and 8.

### Parse Route
`app/api/parse/route.ts`: `POST`, Node runtime.
- **Input:** `{ text }`. Returns a 400 if the text is empty or longer than 500 characters.
- **Call:** `PARSE_MODEL` through `client.messages.parse()`, with:
  - `prompts/parse-policy.md` as the system prompt and the text as the user message;
  - `output_config: { format, effort: "low" }` and `max_tokens: 4000`, where `format` is a `json_schema` format built from zod's own JSON Schema for ParseResult (SDK 0.134's `zodOutputFormat` drops the enums), and its `parse()` returns null for a reply that fails zod;
  - no `temperature` (this model rejects it);
  - a 12-second timeout and 1 retry.
- **Reply handling:**
  - `stop_reason` is checked first: a `"refusal"` returns `{ ok: false }`, and so does an empty `parsed_output` or one that fails the zod check.
  - Success returns `{ ok: true, result }`. When `isPolicy` is false, the result carries the rejectReason for the page to show.
- **Errors:** `RateLimitError`, then `APIConnectionError` (which includes timeouts), then any other `APIError`. Each returns `{ ok: false }` with status 502 and logs the error class on the server. A missing key gets the same response plus a clear server log line.
- **On screen:** `{ ok: false }` becomes "Couldn't read that one right now. Try again, or tap a preset."

PRD ref: `prd.md > How the Policy Was Read`; `prd.md > States and Boundaries` (couldn't read the policy, not a policy, changes nobody's budget).

### Diary Route
`app/api/diaries/route.ts`: `POST`, Node runtime, streaming response.
- **Input:** `{ policyText, levers, residentIds }`. A run sends all 8 ids; a retry sends only the missing ones. The levers are validated with the schema.
- **Diary input:** the route re-runs the engine on the server, and `lib/diaryInput.ts` writes one block per requested resident: name, age, role, everyday line, verdict, and the exact card strings ("−$12 a month", "0.9% of income", "$12 = 12% of what's left each month"). It also includes the policy text and the summary line, so Unaffected residents can notice who is affected (prompt rule 5), and, for residents whose monthly budget changes, their spare money after, so the writer never does sums.
- **Call:** `DIARY_MODEL` through `client.messages.stream()` (the beta variant if small call 11 stands), with:
  - `prompts/write-diaries.md` as the system prompt;
  - `output_config: { effort: "low" }` and `max_tokens: 16000`;
  - no `temperature`;
  - the request's abort signal passed through, so a cancelled run stops the model call.
- **Reading the stream:**
  - Text deltas collect in a buffer. Each complete line is parsed and checked against DiaryLine: the id must be one requested in this call, and the mood one of the five (small call 7).
  - Good lines go to the page immediately as `{"type":"diary",...}`. Bad lines are dropped, and their card later shows "Diary didn't come through".
  - The stream ends with `{"type":"done"}`, or `{"type":"error"}` after an API error or a refusal.
- **Response:** `Content-Type: application/x-ndjson`, streamed through a `ReadableStream`.

PRD ref: `prd.md > Diaries`, `prd.md > States and Boundaries`.

### Prompt and Client Setup
- **`lib/prompts.ts`** (server only): reads `prompts/parse-policy.md` and `prompts/write-diaries.md` from disk. Cached in production; re-read on every call in development, so your prompt edits apply without a restart.
- **`lib/anthropic.ts`** (server only): creates one SDK client, which takes its key from `ANTHROPIC_API_KEY`. It also reads `PARSE_MODEL` and `DIARY_MODEL`, falling back to the defaults above.

The routes load your prompts through these, as you asked.

### Crash Test Controller
`lib/useCrashTest.ts`: a React hook in the browser that owns the run.
- **Run state:** run id; source (preset id or typed text); phase (idle, reading, numbers, writing, done); message (couldn't read, or the not-a-policy reason); levers, assumptions and confidence; results for all 8; and each resident's diary (pending, arrived or failed).
- **Starting a run:** a new run aborts the previous diary request, and lines carrying an old run id are ignored. The Run button and the chips are disabled only during "reading" (`prd.md` small call 10).
- **Presets vs. typed policies:** a policy uses the hand-checked preset levers only if it came from a chip and wasn't edited. This is tracked by where the text came from, not by matching it (small call 9).
- **Diaries:** a 20-second timer runs. On timeout, error or end of stream, any pending diary becomes failed. "Retry diaries" requests only the failed residents (`prd.md` small call 11).

PRD ref: `prd.md > The Core Journey`, `prd.md > States and Boundaries`.

### Page and UI Components
`app/page.tsx` lays out the page in PRD order, using these components from `components/`:
- **`PolicyInput`:** text box (500-character cap, with a counter near the limit), Run button, the 4 chips, and messages under the box. Implements `prd.md > Policy Input and Presets`.
- **`StatusLine`:** the waiting steps, then the summary line. It is announced to screen readers (`aria-live="polite"`). Implements `prd.md > Town Summary`.
- **`ChangeChart`:** hand-built horizontal bars in HTML/CSS, with a zero line, verdict colours, striped one-off segments, "$0" for Unaffected residents, and labelled amounts. Implements `prd.md > Monthly Change Chart`.
- **`PolicyPanel`:** titled "How the AI read this policy" or "How this preset is set up". It shows the levers in plain English, the assumptions, and either a confidence tag or the "Hand-checked preset" tag. Implements `prd.md > How the Policy Was Read`.
- **`ResidentCard`, `SpareMoneyBar`, `DiaryNote`:**
  - the card, before and after a run;
  - the spare-money bar, with the 10% tick and the hazard spill;
  - the diary, with its mood tag and its shimmer and failed states.

  Implements `prd.md > Resident Cards`, `prd.md > Diaries`.
- **`Disclaimer`:** a slim footer pinned to the bottom. Implements `prd.md > Disclaimer`.
- **`ResidentAvatar`:** each resident drawn in inline SVG from shared parts (head, face, outfit, hair, props), with an `expression` prop: neutral, happy, relieved, worried or stressed. `lib/expressions.ts` picks the expression: the diary's mood once it lands, otherwise the verdict's (better off → happy, barely affected or unaffected → neutral, feels it → worried, hard hit → stressed). Used on the cards, the chart rows and the map pins. Implements `prd.md > Look and Feel` (avatars).
- **`TownMap`:** an inline SVG neighbourhood with landmarks and each resident's home. `lib/townMap.ts` (pure) says which landmarks a policy's levers light up (by lever target) and who gets coins (one-off payments, from the engine results). Pins are buttons: verdict-coloured ring, impact pulse, reaction bubble as diaries land, and selecting one scrolls to the card. Implements `prd.md > Town Map`.
- **Second upgrade** (each piece is pure logic in `lib/` with tests, drawn by a component):
  - **`AverageStrip`** with `lib/average.ts`: the town's mean resident, judged by the engine's `verdict`, and the sentence naming who it hides. Implements `prd.md > Average vs. the People`.
  - **`WhatIf`** with `lib/whatIf.ts`: replaces lever values and re-runs the engine in the browser; tipping points come from searching values in whole steps. Diaries are re-requested only on demand. Implements `prd.md > What-if Sliders and Tipping Points`.
  - **Living town** in `TownMap` with `lib/townLife.ts`: each resident's usual place, the spot they go to when a policy lands (the lit place behind the change that costs them most, found by running the engine lever by lever), and CSS-transitioned positions. Ambient SVG motion (train, bus, light) is off for reduced motion. Implements `prd.md > Living Town`.
  - **Town chatter:** `POST /api/chatter` with `lib/writeChatter.ts` and `prompts/town-chatter.md` (approved by you), streamed as one JSON line per remark (speaker, listener, text), and checked by `evals/chatter.eval.ts`. Implements `prd.md > Town Chatter`.
  - **`MoveIn`** form with `lib/yourself.ts`: builds a resident from your answers (checked with zod; the server rebuilds you from the same answers); the engine, summary, chart, cards, map and diaries take a 9th resident, while town chatter stays among the 8. Implements `prd.md > Add Yourself`.
  - **`GuidedIntro`**: a scroll story using the presets and the engine only. Implements `prd.md > Guided Intro`.
- **Third upgrade** (added after the second upgrade's review, same Oct 24 freeze):
  - **`MonthInLife`** with `lib/month.ts`: each day's spare money as the monthly change accumulates evenly, a one-off on day 1, and the day spare money runs out, all from the engine's cents. Implements `prd.md > A Month in the Life`.
  - **`WhyDrawer`** with `lib/why.ts`: a native `<dialog>` showing the budget lines before and after and both verdict checks. `lib/engine.ts` additionally returns each category's before and after (`applyLevers`) and both checks (`verdictLenses`); every existing result is unchanged. Implements `prd.md > Why? Budget Drawer`.
  - **Map focus** in `TownMap` with `lib/mapFocus.ts`: on narrow screens the map's scroll frame glides to the policy's crowd and to the current speaker, plus a "Whole town" fit toggle. Implements `prd.md > Phone Map Follows the Action`.
- **Post-review fixes** (same Oct 24 freeze):
  - **Tax-rate lever:** a `tax_rate_change` kind carrying the old and new rates; `lib/engine.ts` applies it as a price change of (1 + to) / (1 + from) − 1. The parser prompt gains a rule and an example (learner-approved diff). Parser eval cases gain size bands and real headlines. Implements `prd.md > Tax-Rate Changes`.
  - **Plausibility guard:** `lib/plausibility.ts` flags implausibly large levers from the parser; `PolicyPanel` shows the flag and caps the confidence shown.
  - **Page order and nav:** cards after the average strip, a sticky `SectionNav`, scroll-to-summary on each run, and daylight held while a run is shown. Implements `prd.md > Page Order and Navigation`.

### Tests
Vitest. Run them with `npm test`; they work offline and need no key.
- **`tests/engine.test.ts`:** eligibility; each lever kind; `all_taxable_spending`; verdict lines exactly at −1%, −5%, −10% and −30%; Unaffected vs. Barely affected; one-offs counted at ÷ 12.
- **`tests/presets.test.ts`:** every row of `prd.md > Expected Preset Results`, card by card: labels, big numbers, lines and the summary.
- **`tests/format.test.ts`:** rounding toward zero (Nurul's 0.95% shows as "0.9%"), never a percentage over 100%, the wording for a gain bigger than the spare money, and the all-Unaffected summary line.
- **`tests/prompts.test.ts`:** every example in `prompts/parse-policy.md` is valid JSON, passes the ParseResult schema and uses only known targets; the diary prompt names all five moods.

PRD ref: every "matches the engine exactly" criterion.

### Live Evals
Opt-in scripts in `evals/` that use your key. Each prints a pass/fail table and exits non-zero if anything fails. This is your learning goal: testing LLM output, not just the engine.

**`evals/parser.eval.ts`:** 10 fixture policies, each run 3 times on `PARSE_MODEL`. A case passes only if all 3 runs match.

| # | Typed policy | Must come back as |
|---|---|---|
| 1 | Bus and train fares rise 10% | public_transport, +10 |
| 2 | Electricity bills cut 20% | utilities, −20 (your sign check) |
| 3 | Childcare fees cut by half for working parents | childcare, −50, for parents (`mustHaveChildren` or the `has_children` tag, which the engine treats the same) |
| 4 | School fees go up 5% | education, +5 |
| 5 | $300 one-off payout for adults earning under $3,000 a month | one_off_payment 300, maxMonthlyIncome 3000 |
| 6 | HDB households get $50 off utilities every month | fixed_monthly_change utilities −50, all three HDB housing types |
| 7 | GST rises by 1 percentage point | all_taxable_spending, positive value |
| 8 | Raise the retirement age to 70 | isPolicy true, no levers, at least one assumption |
| 9 | What should I eat for lunch? | isPolicy false |
| 10 | Make transport cheaper for old folks | public_transport negative, an age or senior rule, confidence not high, at least one assumption |

**`evals/diaries.eval.ts`:** the 4 presets, run 2 times each on `DIARY_MODEL`. Each run checks that:
- all 8 diaries arrive;
- each mood fits its verdict (prompt rule 4);
- every dollar amount in a diary is one the writer was given: that resident's card strings and spare money after, or the policy text itself (`prd.md` small call 12);
- each reaction is at most 12 words and each diary 2–4 sentences;
- no word from a short politics list appears.

PRD ref: `prd.md > Diaries` (each diary agrees with its card); `prd.md > How the Policy Was Read` (a vague policy).

## Data Model

| Data | Where it lives | How it changes | When you leave and come back |
|---|---|---|---|
| The 8 residents | `data/residents.ts` | Never while the app runs | Same |
| The 4 presets | `data/presets/*.json` | Never while the app runs | Same |
| Prompts | `prompts/*.md` | You edit them between runs | Same |
| Current run (levers, results, diaries, phase) | React state in the browser | Replaced on every run | Gone on refresh; the town is back to normal |
| API key and model names | `.env.local`, server only | You edit them | Same |

Shapes (TypeScript, inferred from the zod schemas):

```ts
type Category = "housing" | "food" | "public_transport" | "private_transport"
  | "utilities" | "healthcare" | "childcare" | "education" | "other";
type HousingType = "hdb_2_room" | "hdb_3_room" | "hdb_4_room" | "condo" | "renting" | "with_parents";
type Tag = "student" | "senior" | "retiree" | "gig_worker" | "business_owner"
  | "healthcare_worker" | "single_parent" | "renter" | "car_user" | "has_children";

interface Resident {
  id: string; name: string; age: number; role: string; everydayLine: string;
  householdSize: number; housingType: HousingType; tags: Tag[]; icon: string;
  income: number; budget: Record<Category, number>;
}

interface Eligibility {
  minAge?: number; maxAge?: number; minMonthlyIncome?: number; maxMonthlyIncome?: number;
  housingTypes?: HousingType[]; mustHaveChildren?: boolean; tagsAny?: Tag[];
}
interface Lever {
  kind: "percent_change" | "fixed_monthly_change" | "one_off_payment";
  target: Category | "income" | "all_taxable_spending";
  value: number; eligibility: Eligibility; description: string;
}
interface ParseResult {
  isPolicy: boolean; rejectReason?: string; levers: Lever[];
  assumptions: string[]; confidence: "high" | "medium" | "low";
}

type Verdict = "better_off" | "barely_affected" | "feels_it" | "hard_hit" | "unaffected";
interface ResidentResult {
  id: string; monthlyChange: number; oneOff: number; net: number;
  spareBefore: number; spareAfter: number; pctIncome: number; pctSpare: number; verdict: Verdict;
}
interface DiaryLine {
  id: string; mood: "happy" | "relieved" | "neutral" | "worried" | "stressed";
  reaction: string; diary: string;
}
```

Resident ids: `lim`, `faizal`, `chloe`, `goh`, `raju`, `nurul`, `marcus`, `tan` (small call 15).

## File Structure

```
Policy Crash Tester/              # repository root
├── app/
│   ├── layout.tsx                # fonts (Archivo, Inter, Lora), page shell, disclaimer footer
│   ├── page.tsx                  # the one page, in PRD order
│   ├── globals.css               # Tailwind, palette variables, stripes, shimmer
│   └── api/
│       ├── parse/route.ts        # POST: typed policy → levers (PARSE_MODEL)
│       └── diaries/route.ts      # POST: levers → diaries, one JSON object per line (DIARY_MODEL)
├── components/
│   ├── PolicyInput.tsx           # text box, Run button, preset chips, messages under the box
│   ├── StatusLine.tsx            # waiting steps, then the town summary
│   ├── ChangeChart.tsx           # bars from a zero line, verdict colours, striped one-offs
│   ├── PolicyPanel.tsx           # "How the AI read this policy" / "How this preset is set up"
│   ├── ResidentCard.tsx          # avatar, numbers, verdict badge, before/after states
│   ├── ResidentAvatar.tsx        # the 8 illustrated characters and their expressions
│   ├── TownMap.tsx               # the reacting town: landmarks, homes, pins, bubbles
│   ├── SpareMoneyBar.tsx         # spare-money bar, 10% tick, red/green shading, hazard spill
│   ├── DiaryNote.tsx             # mood tag, reaction, diary; shimmer and failed states
│   └── Disclaimer.tsx            # pinned footer
├── lib/
│   ├── schemas.ts                # zod: Lever, Eligibility, ParseResult, PresetFile, DiaryLine
│   ├── engine.ts                 # pure: eligibility, levers → numbers → verdict
│   ├── format.ts                 # pure: dollars, percentages, card lines, summary
│   ├── expressions.ts            # pure: verdict or diary mood -> face expression
│   ├── townMap.ts                # pure: lever targets -> lit landmarks, one-off coins
│   ├── presets.ts                # loads and validates data/presets/*.json
│   ├── diaryInput.ts             # builds each resident's block for the diary writer
│   ├── readPolicy.ts             # the parse call, shared by the route and the parser eval (server only)
│   ├── prompts.ts                # reads prompts/*.md (server only)
│   ├── anthropic.ts              # SDK client, PARSE_MODEL, DIARY_MODEL (server only)
│   └── useCrashTest.ts           # client run controller
├── data/
│   ├── residents.ts              # the 8 residents
│   └── presets/
│       ├── fares-20.json
│       ├── one-off-300.json
│       ├── petrol-15.json
│       └── childcare-half.json
├── prompts/
│   ├── parse-policy.md           # your parser prompt
│   ├── write-diaries.md          # your diary prompt
│   └── town-chatter.md           # your chatter prompt (second upgrade)
├── tests/
│   ├── engine.test.ts
│   ├── presets.test.ts           # prd.md > Expected Preset Results
│   ├── format.test.ts
│   └── prompts.test.ts
├── evals/
│   ├── parser.eval.ts            # live: 10 fixture policies × 3 runs
│   └── diaries.eval.ts           # live: 4 presets × 2 runs
├── devpost/                      # planning docs (learner-profile.md is git-ignored)
├── .env.example                  # ANTHROPIC_API_KEY=, PARSE_MODEL=claude-haiku-5-5, DIARY_MODEL=claude-sonnet-5-5
├── .gitignore                    # existing rules, plus node_modules and .next
├── next.config.ts                # Tailwind through the @tailwindcss/turbopack loader
├── tsconfig.json                 # "@/*" path alias
├── vitest.config.mts
├── package.json                  # scripts: dev, build, start, test, eval:parser, eval:diaries
└── README.md                     # what it is, setup, tests, evals, recording
```

The skill-pack files (`.agents/`, `.claude/`, `agent/`, `skills-lock.json`) and `Claude.md` stay as installed.

## External Services and Dependencies

### Anthropic Messages API
- **Endpoint and auth:** `POST https://api.anthropic.com/v1/messages`, called through the SDK. The key comes from `ANTHROPIC_API_KEY` and stays on the server; it is never sent to the browser.
- **Parse call (Claude Haiku 5.5):**
  ```ts
  client.messages.parse(
    { model: PARSE_MODEL, max_tokens: 4000, system: parsePrompt,
      messages: [{ role: "user", content: text }],
      output_config: { format: parseResultFormat, effort: "low" } },  // zod's JSON Schema, enums kept
    { timeout: 12_000, maxRetries: 1 },
  )
  // read stop_reason first, then parsed_output (null if it couldn't be parsed)
  ```
- **Diary call (Claude Sonnet 5.5):**
  ```ts
  const stream = client.messages.stream(
    { model: DIARY_MODEL, max_tokens: 16000, system: diaryPrompt,
      messages: [{ role: "user", content: diaryInput }],
      output_config: { effort: "low" } },
    { signal: request.signal },
  )
  // for await (const event of stream): collect content_block_delta / text_delta text
  // await stream.finalMessage(): check stop_reason ("refusal", "max_tokens")
  // with small call 11: client.beta.messages.stream({ ..., betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" })
  ```
- **Model rules that shape these calls:**
  - No `temperature`, `top_p` or `top_k`: both models reject non-default values.
  - Thinking is adaptive and on by default, and controlled with `effort`; both calls use `low`.
  - Thinking counts toward `max_tokens`, so read content by block type, not by position.
  - Check `stop_reason` for `"refusal"` before reading content. Haiku 5.5 has no server-side fallback.
- **Errors**, checked most specific first: `RateLimitError`, then `APIConnectionError` (which includes timeouts), then `APIError`. All of them map to the PRD's friendly messages, and the details go to the server log.
- **Cost** (first-party prices per million tokens): Haiku 5.5 is $0.10 in and $0.50 out; Sonnet 5.5 is $2 in and $10 out.
  - Estimates: a typed-policy parse is about 1.5K tokens in and 0.5K out, roughly $0.0004. Measured in `5-build`: about 2.2K in and 0.1K out, $0.0003 per parse. A diary run is about 2K in and 1.5K out, roughly $0.02. Measured in `5-build`: about 1.7–1.8K in and 0.9–1.0K out, $0.013 per full diary run. Town chatter (second upgrade), measured in `5-build`: about 1.9–2.0K in and 0.3–0.4K out, $0.007 per run.
  - So a crash test costs about 2 cents, presets included (they skip the parse). A hundred runs while building and recording is about $2.
  - The parser eval is about $0.01, the diary eval about $0.16 and the chatter eval about $0.06.
  - `5-build` measures the real cost of one run before running anything in bulk.
- **Rate limits:** depend on your account tier. The app sends at most 3 requests per run (parse, diaries, chatter). https://platform.claude.com/docs/en/api/rate-limits
- **Docs:**
  - Structured outputs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
  - Streaming: https://platform.claude.com/docs/en/build-with-claude/streaming
  - Errors: https://platform.claude.com/docs/en/api/errors
  - Pricing: https://platform.claude.com/docs/en/about-claude/pricing
  - TypeScript SDK: https://github.com/anthropics/anthropic-sdk-typescript

### Google Fonts (through `next/font`)
Downloaded at build time and served from the app, with no calls at runtime:
- Archivo: https://fonts.google.com/specimen/Archivo
- Inter: https://fonts.google.com/specimen/Inter
- Lora: https://fonts.google.com/specimen/Lora

## Important Failure Modes
- **The AI can't read a typed policy** (timeout, rate limit, refusal, a reply that fails the schema, or a missing key). The page shows "Couldn't read that one right now. Try again, or tap a preset." with a Try again button, and the town stays as it was. Presets keep working fully, because they never call the parser.
- **Diaries are slow, cut off or malformed.** Numbers, chart and verdicts stay. Missing diaries show "Diary didn't come through", and "Retry diaries" asks for only those. Bad lines are dropped, never shown.
- **The parser misreads a policy** (wrong category, wrong sign). The panel shows exactly how the policy was read, so a misreading is visible, not hidden. The parser eval, including your sign check, is the guard.

## What Was Simplified and Why
- **One engine file running in both browser and server** instead of an engine service. It's pure TypeScript, so running it twice costs nothing and keeps the numbers identical. A service would add a network hop for no gain.
- **One streamed diary call, one JSON object per line,** instead of 8 parallel calls or partial-JSON parsing. That's one request and simple line parsing, and diaries still appear one by one. The agreed fallback from `scope.md` is that they land together.
- **Presets as fixed files** instead of parsing them live. The video gets the same result every time, and a typed policy shows the live parser.
- **A hand-built chart** instead of a chart library. Eight bars with custom stripes and a zero line are simpler in HTML/CSS than configuring a library.
- **No database and no accounts,** because nothing persists (`prd.md > Non-Goals`).
- **Live evals as on-demand scripts,** not CI, because they cost money and need a key.
- **Diary lines are checked for shape only at runtime.** Content checks (amounts, mood fit, lengths) live in the eval, so a strict check never drops a decent diary on screen.

## Decisions and Open Issues

### Your decisions
- **Stack:** Next.js App Router, TypeScript and Tailwind, decided in this conversation. The project's `Claude.md` is the hackathon page and doesn't name a stack.
- **Models:** Anthropic, with `PARSE_MODEL=claude-haiku-5-5` and `DIARY_MODEL=claude-sonnet-5-5`. Both can be overridden and both are in `.env.example`.
- **Prompts:** your runtime prompts live in `prompts/` and are loaded by the routes. They were edited after checking them against the PRD: category split, sign rule, one diary per line, moods, the two missing cases, housing types, and example 4.
- **Housing types per resident:** your mapping (see **Town Data**).
- **Sign check:** "Electricity bills cut 20%" must return utilities −20 (parser eval case 2).
- **Where it runs:** locally. Deployment is optional and not chosen.

### Details derived from those decisions
- Two routes, because there are two prompts. The engine is shared between page and server, and nothing is stored.

### The useful unknown: testing LLM output
**Question:** how do you test LLM output, not just the engine? This is your 1-start goal ("Especially how to test LLM output (simple evals for the parser)").

**What clarifies it:** three layers, from cheapest and most certain to most realistic.
1. **The shape is guaranteed.** Structured output forces the lever shape, and zod checks every reply at runtime.
2. **The prompt is tested offline.** Its examples must be valid JSON that passes the schema. This check is what caught example 4.
3. **Behaviour is measured live.** Fixture policies have expected targets and signs, and each runs 3 times, because "always" needs more than one run. Diaries are checked against their own cards.

**Evidence during the build:** `npm test` passing, then the `npm run eval:parser` and `npm run eval:diaries` tables, with the real cost measured on the first run.

### Early build checks
- **Scaffolding:** create-next-app 16.4.1 refuses a folder that holds files outside its allowlist; here that's `.agents`, `agent`, `devpost`, `prompts`, `Claude.md` and `skills-lock.json`. Scaffold into a temporary folder and move the files in, merging `.gitignore`. *Done in slice 1.*
- **`zodOutputFormat`:** check that it accepts zod 4 and this lever schema (optional fields, enums). Fallback: a hand-written JSON Schema in `output_config.format`, with the reply still checked by zod. *Checked in slice 4: it accepts zod 4 but moves every `enum` into a description, so the fallback is in use: zod's own JSON Schema, enums kept, reply still checked by zod.*
- **Refusal fallback:** check whether the SDK's types accept `fallbacks: "default"` (small call 11). If not, use a type cast or drop it. *Checked in slice 3: SDK 0.134 accepts it with no cast.*
- **Heading font:** check that Archivo's width axis works through `next/font`. Fallback: Archivo Black. *Checked in slice 1: it works (`font-stretch: 62% 125%`); no fallback needed.*
- **First diary speed:** measure time to first diary at effort `low`. If it's slow, switch the diary call to `thinking: { type: "between_tools" }`, which turns off extended thinking. *Measured in slice 3: first diary at 1.9–2.3 s, all 8 in 8.4–9.3 s; no switch needed.*
- **Abort signal:** check that cancelling a run in the browser stops the server's model call. *Checked in slice 3: it does.*
- **TypeScript:** check that the TypeScript version create-next-app installs passes `next build` cleanly. *Checked in slice 1: TypeScript 5.9 builds cleanly.*

### Carried over from the PRD
- **The 8 everyday-life lines:** drafted during the build, for your approval. *Approved at the early checkpoint (`data/residents.ts`).*
- **Which typed policy to use in the video:** rehearse it before recording (`6-ship`).

## Agent's Small Technical Calls (veto any)
1. **One engine file runs in the browser and on the server.** The browser uses it for instant cards and the server for the diary input. The diary prompt never takes numbers from the browser; the server recomputes them.
2. **Money is computed to the cent after each lever and shown in whole dollars,** so "exactly $0" (Unaffected) and the preset tests are exact.
3. **Each percent change applies to the pre-policy amount,** so the order of levers never matters.
4. **Eligibility bounds are inclusive.** "Under $3,000" in the preset is read as "$3,000 or less", and the preset's assumption says so; nobody in the town earns exactly $3,000.
5. **Both models run at effort `low` with no temperature** (these models reject it). The parse call uses `max_tokens` 4,000, a 12-second timeout and 1 retry; the diary call uses `max_tokens` 16,000.
6. **Refusals are handled before content is read.** A parser refusal shows "Couldn't read that one"; a diary refusal marks the missing diaries as "didn't come through".
7. **The server checks each diary line for shape only:** a known id and one of the five moods. Amounts, mood fit and lengths are checked by the eval, not at runtime.
8. **The diary input carries each resident's exact card strings,** plus the summary line, so Unaffected residents can mention who is affected (your prompt's rule 5).
9. **A policy counts as a preset only if it came from the chip and wasn't edited.** That's tracked by where the text came from, not by matching it.
10. **No artificial delays.** "Running the numbers" may flash by, because the math is instant.
11. **The diary call opts into server-side refusal fallback** (`fallbacks: "default"`, beta header), which is the Claude API default for Sonnet 5.5 code. It only re-runs cyber and frontier-AI declines, so it should rarely matter here. Veto to keep the call plain.
12. **No prompt caching.** A run costs about 2 cents, and the diary prompt is around or under the minimum size that can be cached.
13. **Verdict hex colours:** green `#1F8A4C`, grey `#8A8F98`, amber `#D98A00`, red `#C8322B`.
    - Badge text is dark on the amber and grey badges, so it stays readable.
    - Cards change colour with a ~300 ms transition, turned off for people who prefer reduced motion.
14. **Household sizes:** Mdm Lim 2, Faizal 4, Chloe 3 (assumed: her and her parents), the Gohs 2, Uncle Raju 1, Nurul 2, Marcus 4, Tan Wei Jie 1. These are context for the diaries only; no rule uses them.
15. **Resident ids:** `lim`, `faizal`, `chloe`, `goh`, `raju`, `nurul`, `marcus`, `tan`.
16. **Eval runs:** parser cases run 3 times each and must pass every time; diaries run 2 times per preset.
17. **The demo is recorded in production mode** (`npm run build && npm start`), which is faster and has no dev overlay.
