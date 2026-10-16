import { z } from "zod";
import { CATEGORIES, HousingTypeSchema, type Category, type Resident, type Tag } from "@/lib/schemas";

// "Move into town" (prd.md > Add Yourself): your answers, checked, become resident #9. Nothing is
// saved. The server rebuilds you from the same answers with the same function, so it never takes
// a ready-made resident from the browser, and only the name is free text.

export const YOU_ID = "you";

// The character builder's choices; ResidentAvatar draws them.
export const SKINS = ["tone1", "tone2", "tone3", "tone4", "tone5"] as const;
export const HAIRS = ["short", "fringe", "long", "bun", "cap", "bald"] as const;
export const HAIR_COLOURS = ["black", "brown", "grey"] as const;
export const OUTFITS = ["tee", "shirt", "hoodie", "blazer"] as const;
export const PROPS = ["none", "glasses", "headphones", "lanyard"] as const;

export const LookSchema = z.object({
  skin: z.enum(SKINS),
  hair: z.enum(HAIRS),
  hairColour: z.enum(HAIR_COLOURS),
  outfit: z.enum(OUTFITS),
  prop: z.enum(PROPS),
});
export type Look = z.infer<typeof LookSchema>;

const money = z.number().finite().min(0, "Amounts can't be negative").max(1_000_000, "That amount is too large");

export const YourAnswersSchema = z
  .object({
    // Letters, numbers, spaces and a little punctuation only: it's the one free-text answer.
    name: z.string().trim().max(20).regex(/^[\p{L}\p{N} .'-]*$/u, "Use letters, numbers and spaces"),
    age: z.number().int("Age must be a whole number").min(16, "Age must be 16 to 100").max(100, "Age must be 16 to 100"),
    income: money,
    housingType: HousingTypeSchema,
    peopleAtHome: z.number().int("People at home must be a whole number").min(1, "At least 1 person at home").max(12, "At most 12 people at home"),
    children: z.boolean(),
    car: z.boolean(),
    spending: z.object(Object.fromEntries(CATEGORIES.map((c) => [c, money])) as Record<Category, typeof money>),
    look: LookSchema,
  })
  .refine((a) => !a.children || a.peopleAtHome >= 2, { message: "With children at home, that's at least 2 people", path: ["peopleAtHome"] });
export type YourAnswers = z.infer<typeof YourAnswersSchema>;

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("") || "Y";

// Tags come only from what you told us: children, a car, renting and age.
function tagsFor(a: YourAnswers): Tag[] {
  const tags: Tag[] = [];
  if (a.children) tags.push("has_children");
  if (a.car) tags.push("car_user");
  if (a.housingType === "renting") tags.push("renter");
  if (a.age >= 65) tags.push("senior");
  return tags;
}

export function buildYou(input: unknown): Resident {
  const a = YourAnswersSchema.parse(input);
  const name = a.name || "You";
  return {
    id: YOU_ID,
    name,
    shortName: name,
    initials: initialsOf(name),
    age: a.age,
    role: "New in town (you)",
    everydayLine: `${a.car ? "Drives most places" : "Takes the bus and MRT"}${a.children ? ", with children at home" : ""}. Just moved into town.`,
    householdSize: a.peopleAtHome,
    housingType: a.housingType,
    tags: tagsFor(a),
    icon: "home",
    income: a.income,
    // Car costs need a car, and childcare needs children.
    budget: {
      ...a.spending,
      private_transport: a.car ? a.spending.private_transport : 0,
      childcare: a.children ? a.spending.childcare : 0,
    },
    look: a.look,
  };
}

// Starting points for the form, to change as you like. Rough monthly amounts, not data.
const NOTHING: Record<Category, number> = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;

export const TEMPLATES: { id: string; label: string; answers: Omit<YourAnswers, "name" | "look"> }[] = [
  {
    id: "student",
    label: "Student",
    answers: {
      age: 20, income: 900, housingType: "with_parents", peopleAtHome: 4, children: false, car: false,
      spending: { ...NOTHING, food: 300, public_transport: 90, healthcare: 20, education: 150, other: 200 },
    },
  },
  {
    id: "worker",
    label: "Young worker",
    answers: {
      age: 27, income: 4200, housingType: "renting", peopleAtHome: 1, children: false, car: false,
      spending: { ...NOTHING, housing: 1100, food: 600, public_transport: 120, utilities: 90, healthcare: 50, other: 900 },
    },
  },
  {
    id: "family",
    label: "Parent",
    answers: {
      age: 38, income: 6800, housingType: "hdb_4_room", peopleAtHome: 4, children: true, car: false,
      spending: { ...NOTHING, housing: 1300, food: 1200, public_transport: 200, utilities: 180, healthcare: 150, childcare: 700, education: 300, other: 900 },
    },
  },
  {
    id: "retiree",
    label: "Retiree",
    answers: {
      age: 68, income: 1600, housingType: "hdb_3_room", peopleAtHome: 2, children: false, car: false,
      spending: { ...NOTHING, housing: 250, food: 550, public_transport: 60, utilities: 130, healthcare: 250, other: 200 },
    },
  },
];

export const DEFAULT_LOOK: Look = { skin: "tone2", hair: "short", hairColour: "black", outfit: "tee", prop: "none" };

export function startingAnswers(templateId = "worker"): YourAnswers {
  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[1];
  return { name: "", look: DEFAULT_LOOK, ...template.answers, spending: { ...template.answers.spending } };
}
