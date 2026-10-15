import { z } from "zod";
import { describeOutcome, readPolicy } from "@/lib/readPolicy";

// POST { text } -> { ok: true, result } with the levers, assumptions and confidence
// (or a not-a-policy reason), or { ok: false } when the policy couldn't be read.
export const runtime = "nodejs";

const RequestSchema = z.object({ text: z.string().trim().min(1).max(500) });

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });

  const started = performance.now();
  const outcome = await readPolicy(parsed.data.text);
  console.log(`[parse] ${describeOutcome(outcome)} ${Math.round(performance.now() - started)}ms`);

  if (!outcome.ok) return Response.json({ ok: false }, { status: 502 });
  return Response.json({ ok: true, result: outcome.result });
}
