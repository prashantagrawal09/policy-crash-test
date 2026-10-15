<!-- The learner's original idea brief, pasted during 1-start on 2026-10-15, with the learner's own
     fixes from the 1-start review applied (listed under "Changes after 1-start review").
     Source material for 2-scope, 3-prd and 4-spec. It is a starting point, not approved scope. -->

# Policy Crash Test

## One-line pitch
Paste any policy or headline, and watch a town of 8 fictional Singapore residents react:
who gains, who loses, by how much, and how it feels.

## Who it is for
- Curious citizens who read a policy headline and wonder "what does this mean for people
  like me?"
- Students, journalists and analysts who want a quick, human view of a policy, beyond averages.

## The problem
Policies are explained with averages ("the average household pays $X more"). Averages hide
people. A 10% fare rise barely matters to a software engineer but really matters to a
student or a retiree. There is no quick way to see that spread.

## The core loop (this must work end to end)
1. User types a policy, or clicks one of 4 preset examples.
2. A preset loads its fixed, hand-checked lever JSON (see Presets). A typed custom policy goes
   to the LLM (fast model, `PARSE_MODEL`), which returns structured "levers" in JSON
   (what changes, by how much, for whom), plus a list of assumptions it made.
3. A plain TypeScript engine applies the levers to each citizen's monthly budget and
   computes before/after numbers and a verdict.
4. UI shows the engine numbers and the bar chart as soon as they're ready: 8 citizen cards,
   a bar chart of monthly change per person, the assumptions panel, and the disclaimer.
5. Server sends the computed numbers to the LLM (main model, `DIARY_MODEL`) in ONE call,
   which returns a short diary entry and mood for each of the 8 citizens. Diaries fill into
   the cards as they arrive.

## The 8 citizens (fictional, monthly SGD, illustrative numbers)
Budget categories: housing, food, public_transport, private_transport, utilities,
healthcare, childcare, education, other. Savings = income minus all spending.

1. Mdm Lim Siew Hua, 63, hawker stall owner, 3-room HDB, lives with husband.
   Income 3200. housing 250, food 700, public_transport 150, private_transport 0,
   utilities 180, healthcare 250, childcare 0, education 0, other 500.
   Tags: business_owner, senior.
2. Faizal Rahman, 38, private-hire driver, married, 2 kids, 4-room HDB.
   Income 5200. housing 1100, food 1000, public_transport 0, private_transport 2000
   (car rental + petrol), utilities 200, healthcare 100, childcare 400, education 0, other 300.
   Tags: gig_worker, has_children, car_user.
3. Chloe Tan, 21, university student, lives with parents.
   Income 1000 (allowance + part-time). housing 0, food 350, public_transport 120,
   private_transport 0, utilities 0, healthcare 20, childcare 0, education 150, other 250.
   Tags: student.
4. Daniel and Mei Ling Goh, 29 and 28, young couple renting while waiting for their flat.
   Income 9500 combined. housing 2400, food 1200, public_transport 400, private_transport 0,
   utilities 200, healthcare 100, childcare 0, education 0, other 1400. Tags: renter.
5. Uncle Raju, 72, retired, 2-room HDB, lives alone.
   Income 1300 (retirement payouts + support from children). housing 100, food 450,
   public_transport 60, private_transport 0, utilities 120, healthcare 350,
   childcare 0, education 0, other 120. Tags: retiree, senior.
6. Nurul Aisyah, 34, nurse, single mum with a 6-year-old, 3-room HDB.
   Income 4200. housing 900, food 900, public_transport 200, private_transport 0,
   utilities 180, healthcare 120, childcare 800, education 0, other 600.
   Tags: healthcare_worker, has_children, single_parent.
7. Marcus Fernandes, 45, runs a small logistics company, married, 2 teenagers, condo.
   Income 11000. housing 3200, food 1800, public_transport 0, private_transport 1200,
   utilities 300, healthcare 300, childcare 0, education 1200, other 1500.
   Tags: business_owner, has_children, car_user.
8. Tan Wei Jie, 26, software engineer, rents a room.
   Income 6500. housing 1600, food 900, public_transport 180, private_transport 0,
   utilities 100, healthcare 50, childcare 0, education 0, other 1200. Tags: renter.

Each citizen also has: age, household_size, housing_type, has_children.

## Lever format (what the LLM returns from a policy)
{
  "isPolicy": boolean,
  "rejectReason": string (only if isPolicy is false),
  "levers": [
    {
      "kind": "percent_change" | "fixed_monthly_change" | "one_off_payment",
      "target": one budget category | "income" | "all_taxable_spending",
      "value": number,
      "eligibility": {
        "minAge"?: number, "maxAge"?: number,
        "maxMonthlyIncome"?: number, "minMonthlyIncome"?: number,
        "housingTypes"?: string[], "mustHaveChildren"?: boolean,
        "tagsAny"?: string[]
      },
      "description": "plain English summary of this lever"
    }
  ],
  "assumptions": ["plain English assumptions the AI had to make"],
  "confidence": "high" | "medium" | "low"
}
"all_taxable_spending" means food, public_transport, private_transport, utilities, other.

## Engine rules
- percent_change: category amount times (1 + value/100). Negative means cheaper.
- fixed_monthly_change on a spending category: add value to that category.
- fixed_monthly_change on income: add value to income.
- one_off_payment: shown as its own "one-off" line on the card. For the verdict only,
  count it as value/12 per month.
- Citizens who fail eligibility are unaffected by that lever.
- Verdict: judge each citizen by BOTH "net monthly change as % of income" and
  "net monthly change as % of savings (spare money)", and use whichever is worse.
  - Income: more than +1% = "Better off", between -1% and +1% = "Barely affected",
    -1% to -5% = "Feels it", worse than -5% OR savings go below 0 = "Hard hit".
  - Savings: worse than -10% = "Feels it", worse than -30% OR savings go below 0 = "Hard hit".
  - The savings check only applies to losses: it can make a verdict worse, never better,
    so gains are judged on income alone. (Confirmed by the learner.)
- Show both numbers (% of income and % of savings) on each card.

## Diary format (what the LLM returns for each citizen)
{ "id": string, "mood": "happy" | "relieved" | "neutral" | "worried" | "stressed",
  "reaction": "max 12 words", "diary": "2 to 4 sentences, first person" }

## Screen (single page)
- Top: big text box, "Run the crash test" button, 4 preset chips:
  "Bus and train fares rise 20%",
  "$300 one-off payout for adults earning under $3,000 a month",
  "Petrol prices rise 15%",
  "Childcare fees cut by half for working parents".
- Loading state while the policy is parsed. (The town "reacting" animation moved to stretch goals.)
- Results: grid of 8 cards (name, age, role, big monthly change number in green or red,
  change as % of income and as % of savings, verdict badge, reaction, diary).
  Bar chart of monthly change per citizen.
  Numbers and chart appear as soon as the engine is done; diaries fill in as they arrive.
  Panel "How the AI read this policy" showing levers and assumptions in plain English.
  Disclaimer always visible.
- Friendly message if the input is not a policy (for example "what's for lunch").

## Speed
- Show engine numbers and the chart as soon as they're ready, then fill in diaries as they arrive.
- Use a faster model for policy parsing (env var `PARSE_MODEL`) and the main model for
  diaries (env var `DIARY_MODEL`).

## Presets
- The 4 presets use fixed, hand-checked lever JSON files (for example `data/presets/*.json`),
  so the demo is the same every time.
- Only custom typed policies go through the LLM parser.
- Diaries are still written by the LLM for both.

## Demo (90 seconds, the video must show this)
1. Click "Bus and train fares rise 20%": Chloe and Uncle Raju feel it (Raju because it eats
   a big share of his small savings), while Faizal and Marcus are unaffected.
2. Click "Petrol prices rise 15%": it flips. Faizal is hard hit, Marcus feels it,
   Chloe and Raju are unaffected.
3. Type a custom policy live and watch the town react.

## Out of scope for this version
Login, database, saving results, editing citizens, comparing two policies side by side,
real government data, predictions about the economy.

## Stretch goals (only if the core is done and recorded)
Compare two policies side by side. Let users add their own "citizen like me".
Loading animation of the town "reacting".

## What success looks like
- All 4 presets give sensible results in under 15 seconds.
- Numbers on cards always match engine output exactly (tested).
- A vague policy still works, with its assumptions clearly shown.

---

## Changes after 1-start review (2026-10-15)
The learner's fixes, applied above:
1. Verdicts use both % of income and % of savings, whichever is worse; both numbers shown on cards.
2. `childcare_education` split into `childcare` and `education`.
3. Demo script rewritten for the fare and petrol presets.
4. Speed: engine numbers and chart first, diaries fill in as they arrive;
   `PARSE_MODEL` for parsing, `DIARY_MODEL` for diaries.
5. Town "reacting" animation moved to stretch goals.

Second round, same day:
6. Fare preset raised from 10% to 20%, keeping the 10% savings rule. The learner chose this
   over lowering the threshold, so the rules stay principled and the scenario is what changes.
7. Presets use fixed, hand-checked lever JSON; only custom policies go through the LLM parser.
   This removes the petrol demo's dependence on how the parser reads "petrol".
8. Losses-only savings check confirmed.

## Agent check of the demo script (1-start, 2026-10-15)
All 4 presets were run through the engine rules above in a throwaway script (10% savings
threshold, each preset read as its single lever), then re-run after the 20% change.

| Preset | Citizen | Change / month | % of income | % of savings | Verdict | Script |
|---|---|---|---|---|---|---|
| Fares +20% | Chloe | -$24 | -2.4% | -21.8% | Feels it | holds |
| | Uncle Raju | -$12 | -0.92% | -12.0% | Feels it | holds |
| | Faizal, Marcus | $0 | — | — | unaffected | holds |
| | Mdm Lim, Gohs, Nurul, Tan | -$30 to -$80 | -0.55% to -0.95% | -1.5% to -8.0% | Barely affected | — |
| Petrol +15% | Faizal | -$300 | -5.8% | savings $100 → -$200 | Hard hit | holds |
| | Marcus | -$180 | -1.6% | -12% | Feels it | holds |
| | Chloe, Raju | $0 | — | — | unaffected | holds |

Close calls under the fare preset: Mdm Lim (-0.94%) and Nurul (-0.95%) sit just inside the
-1% income line, and Nurul is at 8% of savings against the 10% line. Fixed preset levers keep
this stable, but a later change to either budget could flip them.

Other presets: the $300 one-off makes Chloe and Raju "Better off" (Mdm Lim, at $3,200, just
misses out). Halving childcare makes Faizal (+$200) and Nurul (+$400) "Better off". After the
split, Marcus is no longer touched.

## Open questions
- **Cards when savings go negative:** under petrol, Faizal's card would read "-300% of
  savings". For PRD: how a card shows savings going below zero.
- **Panel label for presets:** with fixed levers, a preset's "How the AI read this policy"
  panel shows hand-checked levers, not a live AI reading. For PRD: how to label it honestly.
