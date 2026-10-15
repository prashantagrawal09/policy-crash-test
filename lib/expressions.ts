import type { Verdict } from "@/lib/engine";
import type { DiaryLine } from "@/lib/schemas";

// The face a resident's character shows: their diary's mood once it lands, otherwise the one
// their verdict calls for (the diary prompt's rule 4, read backwards), so face and diary agree.
export type Expression = DiaryLine["mood"]; // "happy" | "relieved" | "neutral" | "worried" | "stressed"

export const VERDICT_EXPRESSION: Record<Verdict, Expression> = {
  better_off: "happy",
  barely_affected: "neutral",
  unaffected: "neutral",
  feels_it: "worried",
  hard_hit: "stressed",
};

export function expressionFor(verdict: Verdict | null, mood: Expression | null = null): Expression {
  if (mood) return mood;
  return verdict ? VERDICT_EXPRESSION[verdict] : "neutral";
}

const EXPRESSION_WORDS: Record<Expression, string> = {
  happy: "happy",
  relieved: "relieved",
  neutral: "calm",
  worried: "worried",
  stressed: "stressed",
};

// "Uncle Raju, looking worried", for screen readers where the face is the only signal.
export function expressionLabel(name: string, expression: Expression): string {
  return `${name}, looking ${EXPRESSION_WORDS[expression]}`;
}
