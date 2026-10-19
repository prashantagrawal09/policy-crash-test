import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CATEGORIES, LEVER_TARGETS, MOODS, ParseResultSchema } from "@/lib/schemas";

// Layer 2 of testing LLM output: the prompts themselves are checked offline.
const parsePrompt = readFileSync("prompts/parse-policy.md", "utf8");
const diaryPrompt = readFileSync("prompts/write-diaries.md", "utf8");

// Each example is `Output: {...}`, possibly wrapped over several lines, up to the next blank line or Input.
const examples = [...parsePrompt.matchAll(/Output: ([\s\S]*?)(?=\n\s*\n|\nInput:|$)/g)].map((m) => m[1].trim());

describe("parser prompt examples", () => {
  it("has the five examples", () => {
    expect(examples).toHaveLength(5);
  });

  it.each(examples.map((example, i) => [i + 1, example]))("example %i is valid JSON that passes the ParseResult schema", (_n, example) => {
    const json = JSON.parse(example as string);
    expect(ParseResultSchema.safeParse(json).success).toBe(true);
  });

  it("uses only known targets, and the not-a-policy example gives a reason", () => {
    const results = examples.map((e) => ParseResultSchema.parse(JSON.parse(e)));
    for (const lever of results.flatMap((r) => r.levers)) {
      expect(LEVER_TARGETS).toContain(lever.target);
    }
    // The not-a-policy example carries a reason and no levers.
    const lunch = results.find((r) => !r.isPolicy);
    expect(lunch?.rejectReason).toBeTruthy();
    expect(lunch?.levers).toEqual([]);
  });

  it("lists every target the engine knows", () => {
    for (const target of [...CATEGORIES, "income", "all_taxable_spending"]) expect(parsePrompt).toContain(target);
  });
});

describe("diary prompt", () => {
  it("names all five moods", () => {
    for (const mood of MOODS) expect(diaryPrompt).toContain(mood);
  });
});

describe("structured-output schema sent to the parser", () => {
  it("keeps the enums, so the model is held to the allowed values", () => {
    const schema = z.toJSONSchema(ParseResultSchema) as { properties: Record<string, any> };
    const lever = schema.properties.levers.items;
    expect(lever.properties.target.enum).toEqual([...LEVER_TARGETS]);
    expect(lever.properties.kind.enum).toEqual(["percent_change", "fixed_monthly_change", "one_off_payment", "tax_rate_change"]);
    expect(lever.required).not.toContain("fromRate"); // only tax-rate changes carry it
    expect(schema.properties.confidence.enum).toEqual(["high", "medium", "low"]);
    expect(lever.additionalProperties).toBe(false);
    expect(lever.properties.eligibility.additionalProperties).toBe(false);
  });
});
