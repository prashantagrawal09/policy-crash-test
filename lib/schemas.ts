import { z } from "zod";
import type { Look } from "@/lib/yourself";

// One set of zod schemas checks preset files, parser replies and diary lines.
// TypeScript types are inferred from them so page and server share one shape.

export const CATEGORIES = [
  "housing",
  "food",
  "public_transport",
  "private_transport",
  "utilities",
  "healthcare",
  "childcare",
  "education",
  "other",
] as const;
export const CategorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof CategorySchema>;

export const HOUSING_TYPES = [
  "hdb_2_room",
  "hdb_3_room",
  "hdb_4_room",
  "condo",
  "renting",
  "with_parents",
] as const;
export const HousingTypeSchema = z.enum(HOUSING_TYPES);
export type HousingType = z.infer<typeof HousingTypeSchema>;

export const TAGS = [
  "student",
  "senior",
  "retiree",
  "gig_worker",
  "business_owner",
  "healthcare_worker",
  "single_parent",
  "renter",
  "car_user",
  "has_children",
] as const;
export const TagSchema = z.enum(TAGS);
export type Tag = z.infer<typeof TagSchema>;

export const EligibilitySchema = z.object({
  minAge: z.number().optional(),
  maxAge: z.number().optional(),
  minMonthlyIncome: z.number().optional(),
  maxMonthlyIncome: z.number().optional(),
  housingTypes: z.array(HousingTypeSchema).optional(),
  mustHaveChildren: z.boolean().optional(),
  tagsAny: z.array(TagSchema).optional(),
});
export type Eligibility = z.infer<typeof EligibilitySchema>;

export const LEVER_KINDS = ["percent_change", "fixed_monthly_change", "one_off_payment", "tax_rate_change"] as const;
export const LEVER_TARGETS = [...CATEGORIES, "income", "all_taxable_spending"] as const;

// tax_rate_change: a tax rate moving from `fromRate` to `value` (both in %). The AI reports the two
// rates; the engine works out what that does to prices or take-home pay (prd.md > Tax-Rate Changes).
export const LeverSchema = z
  .object({
    kind: z.enum(LEVER_KINDS),
    target: z.enum(LEVER_TARGETS),
    value: z.number(),
    fromRate: z.number().optional(),
    eligibility: EligibilitySchema,
    description: z.string(),
  })
  .refine(
    (l) => l.kind !== "tax_rate_change" || (l.fromRate !== undefined && l.fromRate >= 0 && l.fromRate < 100 && l.value >= 0 && l.value < 100),
    { message: "A tax-rate change needs fromRate and value between 0 and 100" },
  );
export type Lever = z.infer<typeof LeverSchema>;

export const ParseResultSchema = z.object({
  isPolicy: z.boolean(),
  rejectReason: z.string().optional(),
  levers: z.array(LeverSchema),
  assumptions: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
});
export type ParseResult = z.infer<typeof ParseResultSchema>;

export const PresetFileSchema = z.object({
  id: z.string(),
  chip: z.string(),
  levers: z.array(LeverSchema),
  assumptions: z.array(z.string()),
});
export type PresetFile = z.infer<typeof PresetFileSchema>;

export const MOODS = ["happy", "relieved", "neutral", "worried", "stressed"] as const;
export const DiaryLineSchema = z.object({
  id: z.string(),
  mood: z.enum(MOODS),
  reaction: z.string(),
  diary: z.string(),
});
export type DiaryLine = z.infer<typeof DiaryLineSchema>;

// One remark of town chatter: who says it, to whom, and what.
export const ChatterLineSchema = z.object({
  speaker: z.string(),
  listener: z.string(),
  text: z.string().trim().min(1),
});
export type ChatterLine = z.infer<typeof ChatterLineSchema>;

// The town is fixed code data, not validated input, so it is a plain type.
export interface Resident {
  id: string;
  name: string;
  shortName: string;
  initials: string;
  age: number;
  ageLabel?: string; // display override, e.g. "29 and 28" for a couple
  role: string;
  everydayLine: string;
  householdSize: number;
  housingType: HousingType;
  tags: Tag[];
  icon: string;
  income: number;
  budget: Record<Category, number>;
  look?: Look; // only for you (resident #9): your character builder's choices
}
