# Policy Crash Test

Paste any policy or headline and watch a town of 8 fictional Singapore residents react: who gains, who loses, by how much, and how it feels.

Policies are usually explained with averages ("the average household pays $X more"). Averages hide people. Here the same policy runs through eight specific people, from a 21-year-old student to a 72-year-old retiree, and you see the spread. Each person is judged on their monthly change as a share of their **income** and of their **spare money**, and the worse of the two wins. That's why a $12 fare rise hurts Uncle Raju: it's 12% of what he has left each month.

Built for a young working adult in Singapore who reads the news on their phone and wonders "is this good or bad, and for whom?"

## How it works

The AI does only the two things it's good at: reading messy text and writing in a human voice. Every number on screen comes from tested code.

```
 Preset chip ─► data/presets/*.json ──┐
                                      ├─► levers ─► engine (browser) ─► summary · chart · cards · panel
 Typed text ─► POST /api/parse ───────┘      │
               Claude Haiku 5.5              └─► POST /api/diaries ─► Claude Sonnet 5.5
               + prompts/parse-policy.md         (engine re-run on       + prompts/write-diaries.md
                                                  the server)            one diary per line, streamed
```

- **Presets** are four hand-checked lever files, so the demo gives the same result every time. They never call the AI to read them.
- **Typed policies** go to Claude Haiku 5.5, which returns levers through structured output (what changes, by how much, for whom), plus its assumptions and confidence. The panel shows exactly how the policy was read.
- **The engine** (`lib/engine.ts`) is plain TypeScript working in whole cents. It applies the levers to each resident's budget and gives the verdict: Better off, Barely affected, Feels it, Hard hit, or Unaffected. The same file runs in the browser and on the server.
- **Diaries** come from Claude Sonnet 5.5 and stream into the cards one by one. The writer gets each resident's exact card numbers, and the server re-runs the engine rather than trusting the browser.

- **The town map and characters** make the spread visible at a glance. Each resident is an illustrated character standing on their home in a little neighbourhood. When a policy lands:
  - the places it touches light up (fares light the MRT and bus stop, petrol the petrol station);
  - every pin takes its verdict colour;
  - coins drop on whoever gets a one-off;
  - reactions pop up as the diaries arrive;
  - faces change to match: calm, smiling, relieved, worried or stressed.

  The map shows no numbers of its own, so it can never disagree with a card.

Nothing is saved; refreshing the page puts the town back to normal.

## Run it locally

You need Node.js 20.9 or newer and an Anthropic API key.

```bash
npm install
cp .env.example .env.local     # then add your key to ANTHROPIC_API_KEY in .env.local
npm run dev                    # http://localhost:3000
```

`.env.local` is git-ignored. `.env.example` holds the model defaults (`PARSE_MODEL=claude-haiku-5-5`, `DIARY_MODEL=claude-sonnet-5-5`) and no secret. The presets' numbers work without a key; typed policies and diaries need one.

## Testing: the numbers and the AI

**Offline tests** need no key and cost nothing:

```bash
npm test
```

98 Vitest tests cover:
- the engine: eligibility, every lever kind, and the verdict lines exactly at −1%, −5%, −10% and −30%;
- every card in `devpost/prd.md > Expected Preset Results`;
- the display rounding (percentages round toward zero, so Nurul's 0.95% shows as "0.9%");
- the map's rules (which places each kind of change lights up, and who gets coins) and the faces each verdict shows;
- that every example in the parser prompt is valid against the lever schema.

**Live evals** use your key and test the AI's output, not just the code:

```bash
npm run eval:parser     # 10 fixture policies × 3 runs on Claude Haiku 5.5 (about $0.01)
npm run eval:diaries    # 4 presets × 2 runs on Claude Sonnet 5.5 (about $0.11)
npm run eval:chatter    # 4 presets × 2 runs on Claude Sonnet 5.5 (about $0.06)
```

- **Parser eval:** a case passes only if all 3 runs agree with the expected reading. One case is a sign check: "Electricity bills cut 20%" must come back as utilities −20.
- **Diary eval:** every diary is checked against the numbers it was given. All 8 must arrive, the mood must fit the verdict, every dollar amount must be one the writer was given, the lengths must be right, and there must be no politics.
- Both scripts print a pass/fail table and exit non-zero on a failure. They call the same code the app does (`lib/readPolicy.ts`, `lib/writeDiaries.ts`).

## Recording the demo

```bash
npm run build && npm start     # production mode: faster, no dev overlay
```

Open http://localhost:3000 at desktop width. Then:
1. Tap "Bus and train fares rise 20%": the MRT and bus stop light up, and Chloe and Uncle Raju turn worried.
2. Tap "Petrol prices rise 15%": the town flips. The petrol station lights up, and Faizal is hard hit.
3. Type your own policy, and click a pin on the map to jump to that person's card.

## Cost

Measured during the build at first-party prices:

| Call | Model | Tokens (in / out) | Cost |
|---|---|---|---|
| Reading a typed policy | Claude Haiku 5.5 | about 2.2K / 0.1K | about $0.0003 |
| Diaries for all 8 residents | Claude Sonnet 5.5 | about 1.7K / 0.9K | about $0.013 |
| Town chatter | Claude Sonnet 5.5 | about 2.0K / 0.3K | about $0.007 |

So a crash test costs about 2 cents. The first diary arrives in about 2 seconds and all 8 in about 9.

## Project layout

```
app/            the page, layout and styles, and the two API routes (parse, diaries)
components/     input, status line, town map, illustrated characters, chart, policy panel, resident card, spare-money bar, diary note
lib/            schemas, engine, formatting, presets, diary input, the two AI calls, the run controller, the map's rules, faces, count-up
data/           the 8 residents and the 4 preset lever files
prompts/        the parser and diary prompts the routes load
tests/          offline Vitest tests
evals/          the live evals
devpost/        planning docs: scope, PRD, spec (with an HTML companion), build checklist
```

## Built with

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, the Anthropic TypeScript SDK, zod, Vitest and tsx. The models are Claude Haiku 5.5 for reading policies and Claude Sonnet 5.5 for diaries.

The project was planned and built with the [Devpost Learn](https://devpost.com) skill pack for "Build With AI: Basics": scope, then PRD, spec and build checklist. The documents are in `devpost/`.

## Disclaimer

Fictional residents, illustrative numbers. Not financial advice or a forecast. The engine shows direct budget effects only; it doesn't predict the economy or take political sides.
