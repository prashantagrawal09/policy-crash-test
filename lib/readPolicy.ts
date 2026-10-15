import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { anthropic, costLine, errorKind, MissingKeyError, PARSE_MODEL } from "@/lib/anthropic";
import { loadPrompt } from "@/lib/prompts";
import { ParseResultSchema, type ParseResult } from "@/lib/schemas";

// Server only: reads a typed policy into levers with Claude Haiku 5.5 and your parser prompt.
// Used by POST /api/parse and by the parser eval, so the eval tests exactly what the app runs.

// Structured output keeps the reply in the lever shape. zod's own JSON Schema is sent (minus
// $schema) because SDK 0.134's zodOutputFormat moves `enum` into a description, which would not
// hold the model to the allowed targets, kinds, housing types and tags.
const { $schema: _unused, ...PARSE_RESULT_JSON_SCHEMA } = z.toJSONSchema(ParseResultSchema);

// parse() returns null instead of throwing, so stop_reason can be checked before the content.
const PARSE_RESULT_FORMAT = {
  type: "json_schema" as const,
  schema: PARSE_RESULT_JSON_SCHEMA,
  parse(content: string): ParseResult | null {
    try {
      const result = ParseResultSchema.safeParse(JSON.parse(content));
      return result.success ? result.data : null;
    } catch {
      return null;
    }
  },
};

export type ReadPolicyOutcome =
  | { ok: true; result: ParseResult; model: string; usage: Anthropic.Usage }
  | { ok: false; reason: "missing_key" | "refusal" | "unreadable" | "api_error"; detail: string };

export async function readPolicy(text: string): Promise<ReadPolicyOutcome> {
  let client: Anthropic;
  try {
    client = anthropic();
  } catch (error) {
    if (error instanceof MissingKeyError) return { ok: false, reason: "missing_key", detail: error.message };
    throw error;
  }
  const system = await loadPrompt("parse-policy");

  try {
    const message = await client.messages.parse(
      {
        model: PARSE_MODEL,
        max_tokens: 4000,
        system,
        messages: [{ role: "user", content: text }],
        output_config: { format: PARSE_RESULT_FORMAT, effort: "low" },
      },
      { timeout: 12_000, maxRetries: 1 },
    );

    // Refusals first (Haiku 5.5 has no server-side fallback), then the content.
    if (message.stop_reason === "refusal") {
      return { ok: false, reason: "refusal", detail: message.stop_details?.category ?? "no category" };
    }
    if (!message.parsed_output) {
      return { ok: false, reason: "unreadable", detail: `stop=${message.stop_reason}` };
    }
    return { ok: true, result: message.parsed_output, model: message.model, usage: message.usage };
  } catch (error) {
    return { ok: false, reason: "api_error", detail: errorKind(error) };
  }
}

export function describeOutcome(outcome: ReadPolicyOutcome): string {
  return outcome.ok
    ? `${outcome.model} isPolicy=${outcome.result.isPolicy} levers=${outcome.result.levers.length} confidence=${outcome.result.confidence} ${costLine(outcome.model, outcome.usage)}`
    : `${outcome.reason} (${outcome.detail})`;
}
