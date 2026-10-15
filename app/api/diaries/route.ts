import { z } from "zod";
import { RESIDENTS } from "@/data/residents";
import { anthropic, costLine, DIARY_MODEL, errorKind, MissingKeyError } from "@/lib/anthropic";
import { buildDiaryInput } from "@/lib/diaryInput";
import { runTown } from "@/lib/engine";
import { loadPrompt } from "@/lib/prompts";
import { DiaryLineSchema, LeverSchema } from "@/lib/schemas";

// POST { policyText, levers, residentIds } -> one JSON object per line:
// {"type":"diary",...} as each diary arrives, then {"type":"done"} or {"type":"error"}.
export const runtime = "nodejs";

const RequestSchema = z.object({
  policyText: z.string().trim().min(1).max(500),
  levers: z.array(LeverSchema).max(20),
  residentIds: z.array(z.string()).min(1).max(RESIDENTS.length),
});

const encoder = new TextEncoder();

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });

  const { policyText, levers } = parsed.data;
  const ids = [...new Set(parsed.data.residentIds)].filter((id) => RESIDENTS.some((r) => r.id === id));
  if (ids.length === 0) return Response.json({ ok: false }, { status: 400 });

  let client;
  try {
    client = anthropic();
  } catch (error) {
    if (error instanceof MissingKeyError) console.error(`[diaries] ${error.message}`);
    return Response.json({ ok: false }, { status: 502 });
  }

  // The numbers are re-run here, never taken from the browser.
  const results = runTown(RESIDENTS, levers);
  const input = buildDiaryInput({ policyText, residents: RESIDENTS, results, ids });
  const system = await loadPrompt("write-diaries");

  // A cancelled run (the browser aborts the fetch) stops the model call.
  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort());

  let closed = false;
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: object) => {
        if (!closed) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      const started = performance.now();
      let firstDiaryMs: number | null = null;
      const sent = new Set<string>();

      // Shape check only: a known id from this request and one of the five moods.
      // Content checks (amounts, mood fit, lengths) live in the eval.
      const flushLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        let json: unknown;
        try {
          json = JSON.parse(trimmed);
        } catch {
          console.warn("[diaries] dropped a line that isn't JSON");
          return;
        }
        const diary = DiaryLineSchema.safeParse(json);
        if (!diary.success || !ids.includes(diary.data.id) || sent.has(diary.data.id)) {
          console.warn("[diaries] dropped a line that failed the shape check");
          return;
        }
        sent.add(diary.data.id);
        firstDiaryMs ??= performance.now() - started;
        send({ type: "diary", ...diary.data });
      };

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
          { signal: abort.signal },
        );

        let buffer = "";
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            buffer += event.delta.text;
            let newline: number;
            while ((newline = buffer.indexOf("\n")) >= 0) {
              flushLine(buffer.slice(0, newline));
              buffer = buffer.slice(newline + 1);
            }
          }
        }

        const message = await stream.finalMessage();
        if (message.stop_reason === "refusal") {
          console.warn(`[diaries] refusal (${message.stop_details?.category ?? "no category"})`);
          send({ type: "error" });
        } else {
          flushLine(buffer); // the last line may not end with a newline
          send({ type: "done" });
        }
        const total = Math.round(performance.now() - started);
        console.log(
          `[diaries] ${message.model} ${sent.size}/${ids.length} diaries, first=${firstDiaryMs === null ? "-" : Math.round(firstDiaryMs)}ms total=${total}ms stop=${message.stop_reason} ${costLine(message.model, message.usage)}`,
        );
      } catch (error) {
        if (abort.signal.aborted) {
          console.log(`[diaries] aborted after ${Math.round(performance.now() - started)}ms (${sent.size}/${ids.length} sent)`);
        } else {
          console.error(`[diaries] ${errorKind(error)}`);
          send({ type: "error" });
        }
      } finally {
        if (!closed) {
          closed = true;
          controller.close();
        }
      }
    },
    cancel() {
      closed = true;
      abort.abort();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      // no-transform keeps compression from buffering the stream.
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
