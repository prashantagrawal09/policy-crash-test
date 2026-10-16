import type Anthropic from "@anthropic-ai/sdk";
import { RESIDENTS } from "@/data/residents";
import { anthropic, DIARY_MODEL, errorKind } from "@/lib/anthropic";
import { buildChatterInput, isValidRemark } from "@/lib/chatterInput";
import { runTown } from "@/lib/engine";
import { loadPrompt } from "@/lib/prompts";
import { ChatterLineSchema, type ChatterLine, type Lever } from "@/lib/schemas";

// Server only: writes the town chatter with Claude Sonnet 5.5 (the diary model) and your chatter
// prompt, yielding each remark as soon as its line is complete. Used by POST /api/chatter and by
// the chatter eval, so the eval tests exactly what the app runs. Throws MissingKeyError before
// starting if there's no key.

export const MAX_REMARKS = 6;

export interface ChatterStats {
  model: string;
  sent: number;
  firstMs: number | null;
  totalMs: number;
  stopReason: string | null;
  usage: Anthropic.Beta.BetaUsage;
}

export type ChatterEvent =
  | { type: "remark"; line: ChatterLine }
  | { type: "dropped"; reason: string }
  | { type: "done"; stats: ChatterStats }
  | { type: "error"; kind: string; stats?: ChatterStats };

export async function* writeChatter(args: { policyText: string; levers: Lever[]; signal?: AbortSignal }): AsyncGenerator<ChatterEvent> {
  const { policyText, levers, signal } = args;
  const client = anthropic();

  // The numbers are re-run here, never taken from the browser.
  const results = runTown(RESIDENTS, levers);
  const input = buildChatterInput({ policyText, levers, residents: RESIDENTS, results });
  const system = await loadPrompt("town-chatter");
  const ids = RESIDENTS.map((r) => r.id);

  const started = performance.now();
  let firstMs: number | null = null;
  let sent = 0;

  // Shape check only: known, different speaker and listener, and no more than six remarks.
  // Content checks (amounts, tone, lengths) live in the eval.
  function check(line: string): ChatterEvent | null {
    const trimmed = line.trim();
    if (!trimmed) return null;
    let json: unknown;
    try {
      json = JSON.parse(trimmed);
    } catch {
      return { type: "dropped", reason: "not JSON" };
    }
    const remark = ChatterLineSchema.safeParse(json);
    if (!remark.success) return { type: "dropped", reason: "failed the shape check" };
    if (!isValidRemark(remark.data, ids)) return { type: "dropped", reason: "unknown or same speaker and listener" };
    if (sent >= MAX_REMARKS) return { type: "dropped", reason: "more than six remarks" };
    sent += 1;
    firstMs ??= performance.now() - started;
    return { type: "remark", line: remark.data };
  }

  try {
    const stream = client.beta.messages.stream(
      {
        model: DIARY_MODEL,
        max_tokens: 16000,
        system,
        messages: [{ role: "user", content: input }],
        output_config: { effort: "low" },
        // Server-side refusal fallback, as for the diaries (spec small call 11).
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      },
      { signal },
    );

    let buffer = "";
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        buffer += event.delta.text;
        let newline: number;
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const result = check(buffer.slice(0, newline));
          buffer = buffer.slice(newline + 1);
          if (result) yield result;
        }
      }
    }

    const message = await stream.finalMessage();
    const stats = (): ChatterStats => ({
      model: message.model,
      sent,
      firstMs,
      totalMs: performance.now() - started,
      stopReason: message.stop_reason,
      usage: message.usage,
    });
    if (message.stop_reason === "refusal") {
      yield { type: "error", kind: `refusal (${message.stop_details?.category ?? "no category"})`, stats: stats() };
      return;
    }
    const last = check(buffer); // the last line may not end with a newline
    if (last) yield last;
    yield { type: "done", stats: stats() };
  } catch (error) {
    if (signal?.aborted) return; // the run was cancelled; nobody is listening
    yield { type: "error", kind: errorKind(error) };
  }
}
