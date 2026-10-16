import { z } from "zod";
import { anthropic, costLine, MissingKeyError } from "@/lib/anthropic";
import { LeverSchema } from "@/lib/schemas";
import { writeChatter, type ChatterStats } from "@/lib/writeChatter";

// POST { policyText, levers } -> one JSON object per line:
// {"type":"remark","speaker","listener","text"} as each remark arrives, then {"type":"done"} or {"type":"error"}.
export const runtime = "nodejs";

const RequestSchema = z.object({
  policyText: z.string().trim().min(1).max(500),
  levers: z.array(LeverSchema).max(20),
});

const encoder = new TextEncoder();

function logStats(stats: ChatterStats) {
  const first = stats.firstMs === null ? "-" : Math.round(stats.firstMs);
  console.log(
    `[chatter] ${stats.model} ${stats.sent} remarks, first=${first}ms total=${Math.round(stats.totalMs)}ms stop=${stats.stopReason} ${costLine(stats.model, stats.usage)}`,
  );
}

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
  const { policyText, levers } = parsed.data;

  try {
    anthropic(); // a missing key is reported clearly, before the stream starts
  } catch (error) {
    if (error instanceof MissingKeyError) {
      console.error(`[chatter] ${error.message}`);
      return Response.json({ ok: false }, { status: 502 });
    }
    throw error;
  }

  // A cancelled run (the browser aborts the fetch) stops the model call.
  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort());

  const started = performance.now();
  let closed = false;
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: object) => {
        if (!closed) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        for await (const event of writeChatter({ policyText, levers, signal: abort.signal })) {
          if (event.type === "remark") send({ type: "remark", ...event.line });
          else if (event.type === "dropped") console.warn(`[chatter] dropped a line (${event.reason})`);
          else if (event.type === "done") {
            send({ type: "done" });
            logStats(event.stats);
          } else {
            send({ type: "error" });
            console.error(`[chatter] ${event.kind}`);
            if (event.stats) logStats(event.stats);
          }
        }
        if (abort.signal.aborted) console.log(`[chatter] aborted after ${Math.round(performance.now() - started)}ms`);
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
