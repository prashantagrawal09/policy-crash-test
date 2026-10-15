import Anthropic from "@anthropic-ai/sdk";

// Server only: one SDK client, and the two model names. The key stays on the server.
export const PARSE_MODEL = process.env.PARSE_MODEL || "claude-haiku-5-5";
export const DIARY_MODEL = process.env.DIARY_MODEL || "claude-sonnet-5-5";

export class MissingKeyError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local, add your key, and restart the server.");
  }
}

let client: Anthropic | null = null;

// Created on first use, so a missing key is reported clearly instead of as an auth error.
export function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new MissingKeyError();
  client ??= new Anthropic();
  return client;
}

// Logs which kind of failure happened, most specific first, without the request details.
export function errorKind(error: unknown): string {
  if (error instanceof MissingKeyError) return "MissingKeyError";
  if (error instanceof Anthropic.APIUserAbortError) return "APIUserAbortError";
  if (error instanceof Anthropic.RateLimitError) return "RateLimitError";
  if (error instanceof Anthropic.APIConnectionTimeoutError) return "APIConnectionTimeoutError";
  if (error instanceof Anthropic.APIConnectionError) return "APIConnectionError";
  if (error instanceof Anthropic.APIError) return `APIError ${error.status ?? ""}`.trim();
  return error instanceof Error ? error.name : "UnknownError";
}

// First-party prices per million tokens (input, output), for the server log's cost line.
const PRICES: Record<string, [number, number]> = {
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-sonnet-5-5": [2, 10],
};

export function costLine(model: string, usage: { input_tokens: number; output_tokens: number }): string {
  const [inPrice, outPrice] = PRICES[model] ?? [NaN, NaN];
  const dollars = (usage.input_tokens * inPrice + usage.output_tokens * outPrice) / 1_000_000;
  return `in=${usage.input_tokens} out=${usage.output_tokens} cost=$${dollars.toFixed(4)}`;
}
