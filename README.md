# Policy Crash Test

Paste any policy or headline and watch a town of 8 fictional Singapore residents react: who gains, who loses, by how much, and how it feels.

Policies are usually explained with averages ("the average household pays $X more"). Averages hide people. Here the same policy runs through eight specific people, from a 21-year-old student to a 72-year-old retiree, and you see the spread. Each person is judged on their monthly change as a share of their **income** and of their **spare money**, and the worse of the two wins. That's why a $12 fare rise hurts Uncle Raju: it's 12% of what he has left each month.

Built for a young working adult in Singapore who reads the news on their phone and wonders "is this good or bad, and for whom?" You can move in as resident #9 to see where you'd land.

## How it works

The AI does only the two things it's good at: reading messy text and writing in a human voice. Every number on screen comes from tested code.

```
 Preset chip ─► data/presets/*.json ──┐
                                      ├─► levers ─► engine (browser) ─► summary · map · chart · cards · panel
 Typed text ─► POST /api/parse ───────┘      │                            ▲
               Claude Haiku 5.5              │      what-if sliders ──────┘ (engine only, no AI)
               + prompts/parse-policy.md     │
                                             ├─► POST /api/diaries ─► Claude Sonnet 5.5 + prompts/write-diaries.md
                                             │   (engine re-run on      one diary per line, streamed
                                             │    the server)
                                             └─► POST /api/chatter ─► Claude Sonnet 5.5 + prompts/town-chatter.md
                                                 (after the diaries)    one remark per line, streamed
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

- **The town is alive.** Residents walk the streets between home and their usual place (Mdm Lim to her stall, Chloe to campus), the train and bus run, and day turns to night. When a policy lands, everyone it reaches walks to the place behind the change that moves their money most (fares: the MRT or their bus stop), and reacts there.
- **Averages hide people.** A strip shows the town's average resident next to the real faces it hides.
- **What-if sliders** drag a policy's numbers and re-run the town instantly, with no AI, and each card shows its tipping point ("Hard hit from +51%"). "Write new diaries" turns a what-if into a run of its own.
- **Town chatter.** Once the diaries are in, the neighbours talk: 4–6 remarks, written by Claude Sonnet 5.5 from each speaker's own card numbers, shown in a feed and as speech bubbles on the map.
- **Move into town.** A short form and a character builder (skin, hair, outfit, extra) make you resident #9, with a house on the map, a card, a bar in the chart and your own diary. The server rebuilds you from your answers rather than trusting the browser, and your answers go to Claude only for your diary.
- **A month in the life.** Press play and live through 30 days: each person's spare money drains (or grows) as the change adds up, and anyone who runs out gets "Gone by day N". Under petrol, Faizal's is gone by day 10.
- **Why?** Every card opens a drawer with that person's budget line by line, before and after, and the two checks behind the verdict: Uncle Raju's $12 is 0.9% of his income but 12% of his spare money, and spare money decides.
- **The phone map follows the action.** On narrow screens the map glides to where a policy lands and to whoever is talking, and "Whole town" fits it on screen.
- **A guided intro** plays on the first visit: meet the town, averages hide people, watch a fare rise land, Uncle Raju vs. Nurul, then your turn. It uses the engine only, can be skipped at any step and replayed from the header, and its steps stay still with reduced motion.

Every animation is still for people who prefer reduced motion. Nothing is saved: refreshing the page puts the town back to normal and moves you out. The browser only remembers that you've seen the intro.

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

145 Vitest tests cover:
- the engine: eligibility, every lever kind, and the verdict lines exactly at −1%, −5%, −10% and −30%;
- every card in `devpost/prd.md > Expected Preset Results`;
- the display rounding (percentages round toward zero, so Nurul's 0.95% shows as "0.9%");
- the map's rules (which places each kind of change lights up, and who gets coins) and the faces each verdict shows;
- the living town: everyone's day stays inside the map, walks follow the streets, and fares send Chloe to the MRT and Uncle Raju to the bus stop;
- the average resident, the what-if slider ranges, and the tipping points;
- the chatter input carrying every card's exact strings;
- moving in: your answers are checked, and your card matches the engine for every preset, with hand-checked cards for three starting templates;
- the month (Faizal gone by day 10, every day 30 matching the engine) and every Why? drawer adding up to its card, plus where the phone map centres for each preset;
- that every example in the parser prompt is valid against the lever schema.

**Live evals** use your key and test the AI's output, not just the code:

```bash
npm run eval:parser     # 15 fixture policies × 3 runs on Claude Haiku 5.5, with size bands (about $0.015)
npm run eval:diaries    # 4 presets × 2 runs on Claude Sonnet 5.5 (about $0.11)
npm run eval:chatter    # 4 presets × 2 runs on Claude Sonnet 5.5 (about $0.06)
```

- **Parser eval:** a case passes only if all 3 runs agree with the expected reading. One case is a sign check: "Electricity bills cut 20%" must come back as utilities −20.
- **Diary eval:** every diary is checked against the numbers it was given. All 8 must arrive, the mood must fit the verdict, every dollar amount must be one the writer was given, the lengths must be right, and there must be no politics.
- **Chatter eval:** 4–6 remarks between at least two people, every dollar amount from the speaker's own numbers or the policy, at most 25 words a remark, and no politics. It prints one conversation per preset to read.
- All three scripts print a pass/fail table and exit non-zero on a failure. They call the same code the app does (`lib/readPolicy.ts`, `lib/writeDiaries.ts`, `lib/writeChatter.ts`).

## Recording the demo

```bash
npm run build && npm start     # production mode: faster, no dev overlay
```

Open http://localhost:3000 at desktop width, in a private window so the intro shows. The town holds midday while a run is on screen, so the map stays bright. A script of about 2 minutes:
1. **Intro (15 s):** scroll through it quickly, then pick "Bus and train fares rise 20%" on the last step.
2. **Fares (30 s):** the MRT and bus stop light up and the riders walk there; Chloe and Uncle Raju turn worried. Tap "Why?" on Uncle Raju: his $12 is 0.9% of his income but 12% of his spare money, and spare money decides.
3. **Petrol (35 s):** scroll back to the top and tap "Petrol prices rise 15%": the page brings the summary into view, the town flips, and Faizal is hard hit. Jump to "Month" and play it: his spare money is gone by day 10.
4. **Your own policy (30 s):** type "GST goes up from 9% to 10% next year" (rehearsed). The panel shows the rate going from 9% to 10%, a price rise of about 0.92%, and Mdm Lim loses $14 a month.

## Cost

Measured during the build at first-party prices:

| Call | Model | Tokens (in / out) | Cost |
|---|---|---|---|
| Reading a typed policy | Claude Haiku 5.5 | about 2.2K / 0.1K | about $0.0003 |
| Diaries for all 8 residents | Claude Sonnet 5.5 | about 1.7K / 0.9K | about $0.013 |
| Town chatter | Claude Sonnet 5.5 | about 2.0K / 0.3K | about $0.007 |

So a crash test costs about 2 cents. The first diary arrives in about 2 seconds and all 8 in about 9; the chatter's first remark follows about 1.5 seconds after that.

## Project layout

```
app/            the page, layout and styles, and the three API routes (parse, diaries, chatter)
components/     guided intro, input, move-in form, status line, what-if sliders, average strip, town map, town chatter,
                month in the life, Why? drawer, illustrated characters, chart, policy panel, resident card, spare-money bar, diary note
lib/            schemas, engine, formatting, presets, the three AI calls and their inputs, the run controller, the map's
                rules and focus, the living town, averages, what-ifs, the month, the Why? drawer, moving in, faces, and hooks
data/           the 8 residents and the 4 preset lever files
prompts/        the parser, diary and chatter prompts the routes load
tests/          offline Vitest tests
evals/          the live evals
devpost/        planning docs: scope, PRD, spec (with an HTML companion), build checklist
```

## Built with

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, the Anthropic TypeScript SDK, zod, Vitest and tsx. The models are Claude Haiku 5.5 for reading policies and Claude Sonnet 5.5 for diaries and chatter.

The project was planned and built with the [Devpost Learn](https://devpost.com) skill pack for "Build With AI: Basics": scope, then PRD, spec and build checklist. The documents are in `devpost/`.

## Disclaimer

Fictional residents, illustrative numbers. Not financial advice or a forecast. The engine shows direct budget effects only; it doesn't predict the economy or take political sides.
