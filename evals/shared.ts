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
