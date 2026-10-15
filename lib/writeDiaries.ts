import type Anthropic from "@anthropic-ai/sdk";
import { RESIDENTS } from "@/data/residents";
import { anthropic, DIARY_MODEL, errorKind } from "@/lib/anthropic";
import { buildDiaryInput } from "@/lib/diaryInput";
import { runTown } from "@/lib/engine";
import { loadPrompt } from "@/lib/prompts";
import { DiaryLineSchema, type DiaryLine, type Lever } from "@/lib/schemas";

// Server only: writes the diaries with Claude Sonnet 5.5 and your diary prompt, yielding each
// one as soon as its line is complete. Used by POST /api/diaries and by the diary eval, so the
// eval tests exactly what the app runs. Throws MissingKeyError before starting if there's no key.

export interface DiaryStats {
  model: string;
  sent: number;
  requested: number;
  firstMs: number | null;
  totalMs: number;
  stopReason: string | null;
  usage: Anthropic.Beta.BetaUsage;
}

export type DiaryEvent =
  | { type: "diary"; line: DiaryLine }
  | { type: "dropped"; reason: string }
  | { type: "done"; stats: DiaryStats }
  | { type: "error"; kind: string; stats?: DiaryStats };

export async function* writeDiaries(args: {
  policyText: string;
  levers: Lever[];
  ids: string[];
  signal?: AbortSignal;
}): AsyncGenerator<DiaryEvent> {
  const { policyText, levers, ids, signal } = args;
  const client = anthropic();

  // The numbers are re-run here, never taken from the browser.
  const results = runTown(RESIDENTS, levers);
  const input = buildDiaryInput({ policyText, residents: RESIDENTS, results, ids });
  const system = await loadPrompt("write-diaries");

  const started = performance.now();
  let firstMs: number | null = null;
  const sent = new Set<string>();

  // Shape check only: a known id from this request and one of the five moods.
  // Content checks (amounts, mood fit, lengths) live in the eval.
  function check(line: string): DiaryEvent | null {
    const trimmed = line.trim();
    if (!trimmed) return null;
    let json: unknown;
    try {
      json = JSON.parse(trimmed);
    } catch {
      return { type: "dropped", reason: "not JSON" };
    }
    const diary = DiaryLineSchema.safeParse(json);
    if (!diary.success) return { type: "dropped", reason: "failed the shape check" };
    if (!ids.includes(diary.data.id) || sent.has(diary.data.id)) return { type: "dropped", reason: "unexpected id" };
    sent.add(diary.data.id);
    firstMs ??= performance.now() - started;
    return { type: "diary", line: diary.data };
  }

  try {
    const stream = client.beta.messages.stream(
      {
        model: DIARY_MODEL,
        max_tokens: 16000,
        system,
        messages: [{ role: "user", content: input }],
        output_config: { effort: "low" },
        // Server-side refusal fallback (spec small call 11).
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
    const stats = (): DiaryStats => ({
      model: message.model,
      sent: sent.size,
      requested: ids.length,
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
