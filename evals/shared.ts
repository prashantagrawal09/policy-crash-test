// Small helpers shared by the live evals.

// Runs async tasks with at most `size` in flight, keeping results in task order.
export async function pool<T>(tasks: (() => Promise<T>)[], size: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const index = next++;
      results[index] = await tasks[index]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, tasks.length) }, worker));
  return results;
}

export const mark = (ok: boolean) => (ok ? "✓" : "✗");

export function pad(text: string, width: number): string {
  return text.length > width ? `${text.slice(0, width - 1)}…` : text.padEnd(width);
}

export const dollars = (amount: number) => `$${amount.toFixed(4)}`;

// Writing stays on everyday life and money, not politics (diary rule 7, chatter rule 7).
export const POLITICS = [
  /\belections?\b/i,
  /\bvot(e|es|ed|ing)\b/i,
  /\bministers?\b/i,
  /\bparliament\b/i,
  /\bpolitic(s|al|ian|ians)\b/i,
  /\bopposition\b/i,
  /\bruling party\b/i,
  /\bPAP\b/,
  /\bWorkers'? Party\b/i,
];

export const AMOUNT = /\$\s?(\d+(?:,\d{3})*(?:\.\d+)?)/g;
export const amounts = (text: string) => [...text.matchAll(AMOUNT)].map((m) => Number(m[1].replace(/,/g, "")));
export const sentences = (text: string) => text.trim().split(/(?<=[.!?])\s+(?=["“'‘(]?[A-Z0-9$])/).filter(Boolean);
export const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
