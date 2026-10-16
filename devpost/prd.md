---
doc: prd
status: approved
---

# Policy Crash Test — Product Requirements

Paste any policy or headline, and watch a town of 8 fictional Singapore residents react: who gains, who loses, by how much, and how it feels. Built first for a young working adult in Singapore who reads the news on their phone.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

1. **Meet the town.** The page opens on the title, a big text box, the "Run the crash test" button and 4 preset chips. Below them, the 8 residents are already on screen in their normal state: who they are, what they earn, what they have left each month, and a line about their everyday life.
2. **Pick a policy.** Tapping a preset chip fills the text box and runs it straight away. Or they type or paste their own policy and press "Run the crash test".
3. **Wait a moment.** The cards stay where they are with a soft shimmer, and a status line steps through "Reading the policy", "Running the numbers", "Writing diaries". Presets skip the first step.
4. **See the spread.** A one-line town summary appears ("2 feel it, 4 barely affected, 2 unaffected"), the town map lights up the places the policy touches and flips each resident's pin to their verdict colour, then the chart of each person's monthly change. Each card updates in place: verdict colour and word, the big change number, and the spare-money bar showing how much of their spare money the policy eats or adds. A panel explains how the policy was read.
5. **Hear from them.** Each person's diary fills in as it arrives: a mood, a short reaction and a few first-person sentences. Their reaction pops up over their home on the map, and their face changes to match.
6. **Try the next one.** Another chip or a typed policy runs on the same town. Cards never move, so each person's card changes colour in place. That's how the flip shows.

Success is the 90-second demo in `scope.md > What "Working" Looks Like`, with the on-screen results listed under **Expected Preset Results**.

## Screens and Layout
One page, top to bottom:
1. **Header:** the title "Policy Crash Test" with hazard-stripe accents.
2. **Policy input:** the big text box, the "Run the crash test" button and the 4 preset chips. Messages (can't read it, not a policy) appear right under the box.
3. **Status and town summary line:** the waiting steps while running; the one-line summary once numbers are in.
4. **Town map:** an illustrated neighbourhood with every resident at home; the hero of the page once a policy runs.
5. **Chart and policy panel:** the monthly-change chart, with the policy panel beside it on wide screens and below it on narrow ones.
6. **Resident cards:** 8 cards in a fixed order that never changes: Mdm Lim, Faizal, Chloe, the Gohs, Uncle Raju, Nurul, Marcus, Tan Wei Jie. Four across and two down on a wide screen.
7. **Disclaimer:** a slim footer, always visible.

On a phone, everything stacks into one column and stays usable. The demo video is recorded on desktop.

## Look and Feel
Source: `scope.md > Inspiration & Identity`.
- **"Crash test lab report meets personal diary."**
- **Lab parts** (header, summary, chart, numbers): off-white background, black text, hazard yellow `#FFD400` and black stripe accents, bold condensed headings.
- **Diary parts:** notebook-paper feel, slightly warm card background, serif italic text.
- **Reference:** The Pudding (https://pudding.cool): human data storytelling, lots of white space.
- **Verdict colours:** green = Better off, grey = Barely affected, amber = Feels it, red = Hard hit. The verdict word is always shown, so colour is never the only signal. Unaffected cards keep the calm "before" look, slightly faded, with an outline badge.
- **Fonts:** Archivo Black for headings, Inter for numbers and labels, Lora italic for diaries. (See small call 15 on the condensed look.)
- **Avatars:** each resident is a flat, friendly illustrated character that shows their role (hawker apron, driver's cap, student backpack and glasses, the couple, white hair and walking stick, scrubs and stethoscope, hi-vis vest, hoodie and headphones). Their face reacts: calm, smiling, relieved, worried or stressed. No photos of real people.
- **Hazard stripes** also mark spare money going below zero.

## Features and Behavior

### Policy Input and Presets
- A big text box, the "Run the crash test" button, and 4 chips: "Bus and train fares rise 20%", "$300 one-off payout for adults earning under $3,000 a month", "Petrol prices rise 15%", "Childcare fees cut by half for working parents".
- Tapping a chip fills the box and runs immediately; no extra click.
- Presets use fixed, hand-checked settings, so they give the same result every time. Only typed policies are read live by the AI.

- [ ] Tapping any chip shows that chip's text in the box and starts a run with that one click.
- [ ] Running the same preset twice gives identical numbers.
- [ ] A typed policy is read by the AI, and the panel title says "How the AI read this policy".

### Town Summary
- One line counting people per label, worst first, listing only labels that occur: "1 hit hard, 1 feels it, 6 unaffected".

- [ ] The counts add up to 8 and match the card badges.

### Town Map
An illustrated neighbourhood between the summary and the chart: the residents' homes (HDB blocks, a condo, rented homes, a family home) and the places their money goes (MRT station and bus stop, petrol station, hawker centre, childcare centre, polyclinic, university, power and water, a mall, offices).
- Each resident is a pin, drawn as their character, at home. Before any run the town is calm: neutral faces, nothing lit.
- When a policy runs, each pin takes its verdict colour with a short impact pulse, and the places the policy touches light up: public transport lights the MRT station and bus stop, private transport the petrol station, childcare the childcare centre, and so on. A one-off payment drops coins over the residents who get it.
- As each diary arrives, that resident's reaction pops up over their pin for a few seconds; hovering over or focusing a pin shows it again.
- Selecting a pin brings that resident's card into view and highlights it.
- The map shows no numbers of its own: only verdict colours, lit places and the diaries' reactions, so it can never disagree with a card.

- [ ] Fares lights the MRT station and the bus stop; petrol lights the petrol station; childcare lights the childcare centre; the payout drops coins over Chloe and Uncle Raju only.
- [ ] Every pin's colour matches its card's verdict.
- [ ] Selecting a pin brings its card into view.
- [ ] On a phone the map can be panned sideways inside its frame, and nothing else on the page scrolls sideways.
- [ ] With reduced motion, nothing pulses or floats.

### Average vs. the People
Source: `scope.md > The Unique Kernel` ("averages hide people").
- After a run, a strip between the summary and the map sets **the average resident**, a faceless grey character, beside the 8 real faces. It shows that resident's monthly change and the verdict that average would get, then one sentence naming who the average hides.
- The average resident's numbers are the town's means (monthly change, one-off, income and spare money), judged by the same verdict rules.
- If nobody is affected, the strip doesn't show.

- [ ] Fares: the average resident is barely affected at −$28 a month. "But Chloe and Uncle Raju feel it, and Faizal and Marcus aren't touched at all."
- [ ] Petrol: the average resident feels it at −$60 a month. "But Faizal is hit hard, and 6 people aren't touched at all."

### What-if Sliders and Tipping Points
- After a run, each change in the policy gets a slider that starts at the policy's value. Moving it re-runs the engine instantly: cards, chart, map, faces and summary all update. Diaries only rewrite when "Write new diaries" is pressed, to keep cost down.
- A "what-if" tag says what moved ("Fares +35%, the policy said +20%"), and "Back to the policy" resets it.
- For a policy with a single monthly change, each card shows its **tipping point**: the value at which that person's verdict would change ("Feels it from +22%").
- Tipping points come from the engine, searched in whole steps (1% or $1), so they're exact for the values a slider can reach.

- [ ] Moving the fares slider changes card numbers to match the engine at the new value.
- [ ] Under fares, Nurul and Mdm Lim show they'd feel it from +22%.

### Living Town
- The residents move around town: each one goes back and forth between home and their usual place (Chloe to the university, Mdm Lim to her stall, Raju to the polyclinic, and so on). The train and bus run, and the light shifts from day to night.
- When a policy lands, each resident it touches walks to the place that matters most to them (fares: the MRT or bus stop; petrol: the petrol station) and reacts there. Everyone else carries on with their day.
- With reduced motion, everyone stays at home and nothing moves.

- [ ] Before any run, residents move between home and their usual place.
- [ ] Under fares, Chloe and Uncle Raju gather at the MRT and bus stop; under petrol, Faizal and Marcus go to the petrol station.
- [ ] With reduced motion, nobody moves.

### Town Chatter
- After the diaries, the residents talk to each other about the policy: a short exchange of 4–6 lines, streamed into a chatter feed and shown as speech bubbles between them on the map.
- It's written by Claude Sonnet 5.5 from each person's exact card strings and the policy, using a chatter prompt you approve. The same rules as the diaries apply: amounts only from the cards or the policy, no politics, no real people.
- If chatter fails, the rest of the page is unaffected.

- [ ] For each preset, chatter arrives, and its amounts all appear in the speakers' card strings or the policy (checked by the eval).

### Add Yourself
- "Move into town" opens a short form: name (default "You"), age, monthly income, monthly spending in a few grouped categories (or a starting template), housing, children and car. You also build a character (skin, hair, outfit, prop).
- You become resident #9, with a home on the map, a card, a place in the chart and summary, and a diary. Nothing is saved, and refreshing removes you.
- Only what you enter is used; it goes to Claude only for your diary.

- [ ] With you added, your card's numbers match the engine for every preset, and the summary counts 9.

### Guided Intro
- On first visit, a short scrolling story plays before the free-play page. It moves through: meet the town, the average hides people, watch a fare rise land (numbers only, no AI calls), Raju vs. Nurul, then "your turn".
- It can be skipped, and replayed from the header.
- With reduced motion, the story shows as still steps.

- [ ] The intro can be skipped at any point and never blocks the app.

### Monthly Change Chart
- One bar per resident, in card order, showing each person's monthly change from a zero line: losses one way, gains the other.
- Bars use the verdict colours, so a short amber bar (Raju, −$12) sits beside a longer grey one (Nurul, −$40).
- One-offs show their monthly equivalent (value ÷ 12) as a striped green bar, with a legend "one-off, spread over 12 months".
- Unaffected residents show $0 and no bar.

- [ ] Every bar's amount matches its card's number.
- [ ] The $300 one-off preset shows striped green bars of +$25 for Chloe and Uncle Raju, and $0 for everyone else.

### Resident Cards
**Before a run:** avatar (their illustrated character), name, age, role, monthly income, monthly spare money, a one-line description of their everyday life, and a full spare-money bar.

**After a run, each card shows:**
- the verdict word and colour;
- the big monthly change number in green (gain) or red (loss), with "% of income" under it;
- the spare-money bar: their monthly spare money, with the part the policy eats shaded red, or the part it adds shaded green, plus a line like "$12 = 12% of what's left each month";
- the diary area (see **Diaries**).

**Spare money below zero:** the bar fills fully red, then spills into a striped hazard zone past its end. The line reads like "Eats all $100 spare, $200 short each month". No percentage over 100% is ever shown.

**One-offs:** the big number reads "+$300 one-off" in green, with a small line "About $25 a month over a year". If a policy has both a monthly change and a one-off, the big number is the monthly change and the one-off appears as a chip under it.

**Unaffected** (net change exactly $0: no monthly change and no one-off): the card keeps its calm "before" look, slightly faded, with an outline "Unaffected" badge and a full, unshaded bar. They still get a diary.

Cards never move or re-sort between runs.

- [ ] Before any run, all 8 cards show income, spare money, an everyday-life line and a full bar.
- [ ] After a run, every card's numbers match the engine's numbers exactly (tested).
- [ ] Faizal's petrol card reads "Eats all $100 spare, $200 short each month", and his bar spills into the hazard zone.
- [ ] No card ever shows a percentage over 100%.
- [ ] Between two runs, every card stays in the same position.

### Verdicts
Source: `scope.md > The Unique Kernel`.

Each person is judged on their monthly change both as a % of income and as a % of their spare money, and gets whichever verdict is worse:
- **Income:** above +1% = Better off; between −1% and +1% = Barely affected; −1% to −5% = Feels it; worse than −5%, or spare money below zero = Hard hit.
- **Spare money (losses only):** worse than −10% = Feels it; worse than −30%, or below zero = Hard hit. This check can only make a verdict worse, never better.
- One-offs count as value ÷ 12 per month for the verdict.
- **Unaffected:** net change exactly $0.

- [ ] Every preset matches **Expected Preset Results**.

### Expected Preset Results
Computed from the rules above, using the same check that shaped the demo.

| Preset | Summary line | Key cards |
|---|---|---|
| Bus and train fares rise 20% | 2 feel it, 4 barely affected, 2 unaffected | Chloe, Feels it: −$24, 2.4% of income, "$24 = 21.8% of what's left each month". Uncle Raju, Feels it: −$12, 0.9% of income, "$12 = 12% of what's left each month". Nurul, Barely affected: −$40, "$40 = 8% of what's left each month". Faizal and Marcus, Unaffected. |
| Petrol prices rise 15% | 1 hit hard, 1 feels it, 6 unaffected | Faizal, Hard hit: −$300, 5.7% of income, "Eats all $100 spare, $200 short each month". Marcus, Feels it: −$180, "$180 = 12% of what's left each month". Chloe and Raju, Unaffected. |
| $300 one-off payout for adults earning under $3,000 a month | 2 better off, 6 unaffected | Chloe and Uncle Raju, Better off: "+$300 one-off", "About $25 a month over a year". Mdm Lim (earns $3,200), Unaffected. |
| Childcare fees cut by half for working parents | 2 better off, 6 unaffected | Faizal, Better off: +$200, "Spare money goes from $100 to $300 a month". Nurul, Better off: +$400, "+$400 = 80% more spare money each month". Marcus (teenagers, no childcare), Unaffected. |

### Diaries
- One diary per resident, Unaffected ones included: a mood (happy, relieved, neutral, worried or stressed), a reaction of at most 12 words, and a 2–4 sentence first-person diary.
- Diaries fill in as they arrive. If that proves fiddly, they can land together (`scope.md > The POC Boundary`).
- Numbers never wait for diaries, and never disappear because diaries fail.

- [ ] For each preset, all 8 diaries arrive within 15 seconds.
- [ ] Each diary agrees with its card: it never states an amount different from the card, and its mood fits the verdict (small call 12).
- [ ] Diary text looks like notebook paper (serif italic), visibly apart from the lab-style numbers.

### How the Policy Was Read
- **Typed policies:** titled "How the AI read this policy". Lists each change in plain English (what changes, by how much, for whom), the assumptions the AI made, and its confidence (high, medium or low).
- **Presets:** titled "How this preset is set up". Shows the same kind of plain-English changes and assumptions, a small "Hand-checked preset" tag, and one line: "Type your own policy to watch the AI read it live."

- [ ] A vague typed policy (for example "make transport cheaper for old folks") still produces a full town result, with its assumptions listed in the panel.
- [ ] The panel never says the AI read a preset.

### Disclaimer
- Always visible. Says the residents are fictional and the numbers illustrative, and that this is not financial advice or a forecast.

- [ ] The disclaimer can be seen at every moment, on desktop and on a phone.

## States and Boundaries
- **First visit:** the town in its normal state, with the summary line inviting them to pick a policy. Nothing has run.
- **Waiting:** cards shimmer in place; the status line steps through "Reading the policy", "Running the numbers", "Writing diaries" (presets skip the first step).
- **Numbers in, diaries pending:** summary, chart, verdicts and numbers are fully shown; diary spots shimmer until each diary lands.
- **Diaries fail, or take longer than about 20 seconds:** numbers, chart and verdicts stay. Each missing diary spot says "Diary didn't come through", with one "Retry diaries" button for the whole town.
- **Couldn't read the policy (AI error):** a friendly message under the text box, "Couldn't read that one right now. Try again, or tap a preset.", with a Try again button. The town stays as it was.
- **Not a policy:** the AI's reason is shown under the text box, and the town stays as it was.
- **A policy that changes nobody's budget:** all 8 are Unaffected; the summary says nobody's monthly budget changes, and the panel's assumptions explain why.
- **A new run while diaries are still arriving:** the new run replaces the old one, and late diaries from the earlier run never land on the new cards.
- **What persists:** nothing. Refreshing the page returns the town to its normal state.

## Product Decisions
- **The town is on screen before any run:** you meet the people before the policy hits them.
- **A chip fills the box and runs immediately:** one click per demo step.
- **Summary, then chart, then cards:** the headline, then the spread, then the people.
- **Cards never move or re-sort:** each card changes colour in place, which is how the flip shows.
- **The spare-money bar with "% of what's left":** shows why a small change hurts someone with little left over.
- **Judge by % of income and % of spare money, whichever is worse, with the spare-money check on losses only:** a small change can still hurt, and gains aren't capped (from 1-start).
- **A fifth label, "Unaffected", for exactly $0:** matches how the demo talks about Faizal and Marcus; the summary counts them separately.
- **Presets are hand-checked and labelled honestly** ("How this preset is set up", "Hand-checked preset"): the same result every time for the video, without pretending the AI read them.
- **Below zero spills into a hazard zone; never a percentage over 100%:** readable and honest.
- **One-offs show as "+$300 one-off", "About $25 a month over a year", and a striped monthly-equivalent bar:** a one-off isn't a monthly change, but the chart shouldn't go flat.
- **Numbers never wait for diaries or vanish when diaries fail:** the math is the product; the diaries are its voice.
- **The fare preset is 20%, rather than a lower threshold:** the rules stay principled and the scenario changes (from 1-start).
- **Look: lab report meets personal diary.** See **Look and Feel**.

## What We're Building
- The one page: header, policy input with 4 preset chips, status and summary line, chart with policy panel, 8 resident cards, disclaimer.
- Presets with fixed, hand-checked settings; typed policies read live by the AI, with the "not a policy" and "couldn't read" messages.
- The verdict rules and the spare-money bar, with card numbers that match the engine exactly.
- Diaries for all 8, arriving after the numbers, with one retry for the town.
- Illustrated characters whose faces react, and the town map (an upgrade agreed after the build).
- Average vs. the people, what-if sliders with tipping points, a living town, town chatter, adding yourself, and a guided intro (second upgrade, feature freeze Oct 24).
- The waiting, failure and empty states under **States and Boundaries**.

## Deferred From the POC
- **Saving or sharing a result, and a history of past runs:** nothing persists in this version, so there's nothing to save or link to.

## Possible Later Enhancements
- Compare two policies side by side.

## Non-Goals
- **Login or accounts:** one session is the whole experience.
- **Editing residents:** the fixed eight keep the demo repeatable and the checks valid.
- **Real government data:** the numbers are illustrative, and the disclaimer says so.
- **Predicting the economy:** only direct budget effects are shown.
- **Taking political sides:** diaries talk about everyday life and money, not parties or public figures.

## Open Questions
- **The 8 everyday-life lines:** drafted from the brief during the build, for the learner's approval. *Resolved: approved at the `5-build` early checkpoint.*
- **Which custom policy to type in the video:** pick and rehearse it before recording (`6-ship`). Doesn't block `4-spec`.

## Agent's Small Calls (veto any)
1. A verdict changes only when a line is crossed: landing exactly on −1%, −5%, −10% or −30% keeps the milder verdict.
2. Amounts show as whole dollars. Percentages show one decimal, rounded toward zero, dropping ".0". That way a displayed number never crosses a line the real one didn't: Nurul's 0.95% shows as "0.9%", not "1.0%", next to "Barely affected".
3. Gains read "+$400 = 80% more spare money each month". When a gain is bigger than someone's spare money, it reads "Spare money goes from $100 to $300 a month" instead (Faizal, childcare). One-offs read "Spread over a year: 22.7% more spare money each month".
4. Each spare-money bar has a faint tick at 10%, the "feels it" line. Raju's chunk (12%) and Nurul's (8%) look closer than "big vs. thin", so the tick shows Raju's crossing the line and Nurul's stopping short. (The truly stark pair is Raju against Tan, at 1.4%.)
5. "% of income" sits small under the big number; one-off cards say "about 2.5% of income".
6. Chart bars use the verdict colours, so Raju's short amber bar beside Nurul's longer grey one shows the core idea in one picture. For mixed policies, the monthly part is solid and the one-off's monthly share striped, on both the spare-money bar and the chart.
7. The policy panel sits beside the chart on wide screens and below it on narrow ones, always open rather than collapsed. Low AI confidence shows as an amber tag.
8. Summary wording is worst first, listing only labels that occur ("1 hit hard, 1 feels it, 6 unaffected"). Before any run it reads "8 residents. Pick a policy to crash-test the town.", and the chart and panel stay hidden until the first run.
9. Editing a preset's text turns it into a typed policy: the hand-checked settings apply only when the chip's text runs unedited.
10. A new run replaces the old one, and late diaries from the earlier run are dropped. Run and the chips are disabled only while a policy is being read.
11. "Retry diaries" fills in only the missing diaries; the ones that already arrived stay.
12. Diaries never contradict their card: same amounts, and a mood that fits the verdict (no "happy" on a Hard hit card). They stay on everyday life and money, not politics or real public figures. Mood shows as a small word tag next to the reaction.
13. The Run button is disabled while the box is empty. Typed text is capped at about 500 characters (a headline or short paragraph). Hostile or hateful input gets the "not a policy" treatment.
14. The disclaimer is a slim footer pinned to the bottom of the screen: "Fictional residents, illustrative numbers. Not financial advice or a forecast."
15. Archivo Black is heavy but not condensed. For your "bold condensed headings", headings use Archivo (the same family on Google Fonts) at a black weight and condensed width. Veto to keep Archivo Black as is.
16. Role icons: bowl (Mdm Lim), car (Faizal), book (Chloe), key (the Gohs), walking stick (Uncle Raju), medical cross (Nurul), delivery truck (Marcus), laptop (Tan Wei Jie). *Superseded by the illustrated characters, which carry each role in the drawing.*
17. On a phone, everything stacks into one column; the demo video is recorded on desktop.
