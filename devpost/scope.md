---
doc: scope
status: approved
---

# Policy Crash Test

Paste any policy or headline, and watch a town of 8 fictional Singapore residents react: who gains, who loses, by how much, and how it feels.

## The Unique Kernel
Averages hide people. Instead of "the average household pays $X more", the same policy runs through eight specific people, and you see the spread. Verdicts look at both % of income and % of spare money (savings), so a small change can still hurt someone with little left over: Uncle Raju feels a $12 fare rise because it is 12% of his spare money. The numbers come from tested code, not the AI, so they can be checked. The AI only reads the policy and writes the feelings.

## Who It's For
A young working adult in Singapore: mid-20s, one to three years into their first job, reading the news on their phone on the MRT or at lunch.

What they do today: read the headline and the first few paragraphs, which usually give an average. Then they scroll the comments or Reddit, where people argue from their own situation, or ask a chatbot and get a general answer. They're left wondering "is this good or bad, and for who?", with no quick way to see how it hits their parents or grandparents.

The town already holds people like them (Tan Wei Jie, 26; the Gohs) and people like their parents and grandparents (Mdm Lim, 63; Uncle Raju, 72). Students, journalists and analysts can use it too, but it's designed for this person first.

## The Core Loop
A headline lands. They paste it, or tap a preset, and within seconds see each of the eight people's monthly change and verdict, then each person's diary. Then they try the next policy and watch who flips: fares hurt Chloe and Uncle Raju, petrol hurts Faizal and Marcus.

## Inspiration & Identity
Volunteered so far: a "crash test" framing, a town of residents, cards with a big green or red number and a verdict badge, and first-person diaries with a mood. Quick and human, and honest about its guesses: the assumptions panel and disclaimer are always visible. No visual references yet; `3-prd` will ask.

## Why This Matters to the Learner
"I am an AI Engineer and I am making this for the hackathon."

## What "Working" Looks Like
The 90-second demo, running locally (deployment is optional):
1. Click "Bus and train fares rise 20%": Chloe and Uncle Raju feel it; Faizal and Marcus are unaffected.
2. Click "Petrol prices rise 15%": it flips. Faizal is hard hit, Marcus feels it, Chloe and Raju are unaffected.
3. Type a custom policy live and watch the town react.

The "oh, that's cool" beat: the flip between 1 and 2. Same town, different policy, different losers.

Proof it works: all 4 presets give sensible results in under 15 seconds; card numbers always match the engine exactly (tested); a vague policy still works, with its assumptions shown.

## The POC Boundary
- One page: policy box, "Run the crash test" button, 4 preset chips.
- 8 fixed fictional citizens; 4 presets stored as fixed, hand-checked lever JSON.
- Custom policies parsed by the LLM into levers and assumptions, with a friendly message when the input isn't a policy.
- A plain TypeScript engine with the income/savings verdict, unit-tested.
- Results: 8 cards, a bar chart, the "How the AI read this policy" panel and the disclaimer. Numbers and chart appear first; diaries from one LLM call fill in as they arrive. If streaming fights us, diaries can land together.
- A handful of parser checks (from the learning goal: test the LLM output, not just the engine).
- **Upgrade after the build (agreed 2026-10-16):** each resident is drawn as an illustrated character whose face reacts to their verdict and diary mood, and an illustrated town map above the chart reacts to each policy. Presentation only: the numbers, verdicts and checks don't change.
- **Second upgrade (agreed 2026-10-16, feature freeze Oct 24):** average vs. the people, what-if sliders with tipping points, a living town where residents move about and react, AI town chatter between residents, adding yourself as resident #9, and a guided intro. Every number still comes from the tested engine.

Full data, rules and the demo check: `devpost/idea-brief.md`.

## Later
- Compare two policies side by side.

## Explicitly Cut
- **Login, database, saving results:** the demo is one session; nothing needs to persist.
- **Editing citizens:** the fixed eight keep the demo repeatable and the checks valid.
- **Real government data:** the numbers are illustrative, and the disclaimer says so.
- **Predictions about the economy:** the engine shows direct budget effects only.
