import { readFile } from "node:fs/promises";
import path from "node:path";

// Server only: reads your runtime prompts from prompts/*.md. Cached in production;
// re-read on every call in development, so prompt edits apply without a restart.
export type PromptName = "parse-policy" | "write-diaries";

const cache = new Map<PromptName, Promise<string>>();

export function loadPrompt(name: PromptName): Promise<string> {
  const read = () => readFile(path.join(process.cwd(), "prompts", `${name}.md`), "utf8");
  if (process.env.NODE_ENV !== "production") return read();

  let prompt = cache.get(name);
  if (!prompt) {
    prompt = read().catch((error) => {
      cache.delete(name);
      throw error;
    });
    cache.set(name, prompt);
  }
  return prompt;
}
