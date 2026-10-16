import { useId, type ReactNode } from "react";
import type { Expression } from "@/lib/expressions";
import type { Look as YourChoices } from "@/lib/yourself";

// The 8 residents (and you, if you move in) as flat, friendly characters: a head-and-shoulders
// bust in a 100×100 circle. Everyone is built from the same parts (head, face, outfit) plus their
// own hair and props, so any face can show any of the five expressions.

const INK = "#2B1B12";
// Shoulders, drawn below the circle's edge so a scaled-down person (the couple) still fills it.
const BUST = "M8 134 C8 97 24 76.5 50 75.5 C76 76.5 92 97 92 134 Z";

interface Look {
  skin: string;
  shade: string; // ears and neck
  lips: string;
  brow?: string;
  outfit: ReactNode; // clothes, below the neck
  hairBack?: ReactNode; // hair behind the head
  under?: ReactNode; // on the face, under its features (beards, stubble, wrinkles)
  hair: ReactNode; // hair and hats
  front?: ReactNode; // props in front of everything
  glasses?: boolean;
  mustache?: boolean;
}

const bust = (fill: string) => <path d={BUST} fill={fill} />;

const LOOKS: Record<string, Look> = {
  // Mdm Lim: hawker, 63. Grey bun, coral top under a white apron.
  lim: {
    skin: "#F1C9A0",
    shade: "#DDA87C",
    lips: "#A65A4E",
    outfit: (
      <>
        {bust("#E07A5F")}
        <path d="M35.5 82 Q50 86.5 64.5 82 L69 134 L31 134 Z" fill="#FBFAF6" stroke="#E2DDD2" strokeWidth="0.8" />
        <path d="M37.5 83 Q41.5 71 45.5 66 M62.5 83 Q58.5 71 54.5 66" fill="none" stroke="#FBFAF6" strokeWidth="3" />
        <rect x="44" y="96" width="12" height="8" rx="1.6" fill="#EFEBE1" />
      </>
    ),
    hair: (
      <>
        <circle cx="50" cy="21.5" r="6.8" fill="#666666" />
        <path d="M31.5 45 C31 30 39 23 50 23 C61 23 69 30 68.5 45 C66 36.5 59 31.5 50 31.5 C41 31.5 34 36.5 31.5 45 Z" fill="#666666" />
        <path d="M39.5 27.5 Q45.5 24.6 50.5 28.8" fill="none" stroke="#9C9C9C" strokeWidth="2" strokeLinecap="round" />
        <circle cx="32.4" cy="52.5" r="1.3" fill="#E8B84A" />
        <circle cx="67.6" cy="52.5" r="1.3" fill="#E8B84A" />
      </>
    ),
  },

  // Faizal: private-hire driver, 38. Navy cap and polo, light stubble.
  faizal: {
    skin: "#C68E5C",
    shade: "#A9713F",
    lips: "#6E3A26",
    outfit: (
      <>
        {bust("#2F4B7C")}
        <path d="M40.5 74.5 L50 83.5 L59.5 74.5 L55.5 73.5 L50 79 L44.5 73.5 Z" fill="#253F68" />
        <circle cx="50" cy="88" r="0.95" fill="#DDE4F0" />
        <circle cx="50" cy="92.5" r="0.95" fill="#DDE4F0" />
      </>
    ),
    under: <path d="M34.6 52 Q36 64.5 50 66.2 Q64 64.5 65.4 52 Q63 60.6 50 61.8 Q37 60.6 34.6 52 Z" fill="#3A2416" fillOpacity="0.2" />,
    hair: (
      <>
        <path d="M31.8 45 L33 36.5 L36.2 37.5 L35.6 46.5 Z M68.2 45 L67 36.5 L63.8 37.5 L64.4 46.5 Z" fill="#1E1611" />
        <path d="M30.8 36 C30.8 22 40 16.8 50 16.8 C60 16.8 69.2 22 69.2 36 Z" fill="#1F2E4D" />
        <path d="M42 20.5 Q50 18.2 58 20.5 L57.2 31 Q50 29.2 42.8 31 Z" fill="#2B3F66" />
        <path d="M29 36 Q50 31 71 36 Q70.5 39.2 50 38.8 Q29.5 39.2 29 36 Z" fill="#162238" />
        <circle cx="50" cy="17.4" r="1.4" fill="#2B3F66" />
      </>
    ),
  },

  // Chloe: university student, 21. Long hair, glasses, hoodie, backpack straps.
  chloe: {
    skin: "#F7D7BD",
    shade: "#E4B694",
    lips: "#B5545C",
    glasses: true,
    hairBack: <path d="M30 46 C28 27 38 19 50 19 C62 19 72 27 70 46 L71.6 75 Q66 80 61 75 L61 52 L39 52 L39 75 Q34 80 28.4 75 Z" fill="#3B2416" />,
    outfit: (
      <>
        {bust("#A694D6")}
        <path d="M36.5 75.5 Q50 88.5 63.5 75.5 Q60 72.5 50 78.5 Q40 72.5 36.5 75.5 Z" fill="#8F7CC4" />
        <path d="M47 80.5 L46.3 93 M53 80.5 L53.7 93" stroke="#F2F0FA" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M27.5 82 Q30.5 97 31.5 134 M72.5 82 Q69.5 97 68.5 134" fill="none" stroke="#3A3F58" strokeWidth="6" strokeLinecap="round" />
      </>
    ),
    hair: <path d="M31.5 44 C31.5 29 40 22.5 50 22.5 C60 22.5 68.5 29 68.5 44 C64 35 57 31.5 49 33.5 C44 35 40 38.5 38 43 C36 38 34 40 31.5 44 Z" fill="#3B2416" />,
  },

  // Uncle Raju: retiree, 72. White hair at the sides, white mustache, pocket pen, walking stick.
  raju: {
    skin: "#8D5A36",
    shade: "#6F4428",
    lips: "#4A2618",
    brow: "#E4E4E4",
    mustache: true,
    outfit: (
      <>
        {bust("#9CC3E6")}
        <path d="M41 73.5 L47.6 82 L50 76.5 Z M59 73.5 L52.4 82 L50 76.5 Z" fill="#EAF2FA" stroke="#7FA9D0" strokeWidth="0.6" />
        <circle cx="50" cy="88" r="0.95" fill="#7FA9D0" />
        <circle cx="50" cy="94" r="0.95" fill="#7FA9D0" />
        <rect x="56.5" y="88.5" width="9" height="7" rx="1" fill="none" stroke="#7FA9D0" strokeWidth="0.8" />
        <path d="M60.2 85 L60.2 90.5" stroke="#C0392B" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
    under: (
      <>
        <path d="M43 33.5 Q50 31.8 57 33.5" fill="none" stroke="#5E3A22" strokeWidth="0.9" strokeOpacity="0.6" />
        <ellipse cx="45" cy="29.5" rx="4.2" ry="2" fill="#FFFFFF" fillOpacity="0.16" />
      </>
    ),
    hair: (
      <>
        <path d="M31.5 48.5 C30 40 31.6 33 36.2 30 C35.2 36 35.6 42 36.6 49.5 Z" fill="#EDEDED" />
        <path d="M68.5 48.5 C70 40 68.4 33 63.8 30 C64.8 36 64.4 42 63.4 49.5 Z" fill="#EDEDED" />
        <path d="M44 26.6 Q50 24.8 56 26.6" fill="none" stroke="#EDEDED" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
    front: <path d="M74 134 L74 90 Q74 82 80 82 Q86 82 86 88" fill="none" stroke="#7A4E2D" strokeWidth="4.2" strokeLinecap="round" />,
  },

  // Nurul: nurse, 34. Teal scrubs, stethoscope, ID badge, hair up in a bun.
  nurul: {
    skin: "#D7A275",
    shade: "#BE8657",
    lips: "#A8505A",
    outfit: (
      <>
        {bust("#3AAFA9")}
        <path d="M43.5 73.5 L50 83.5 L56.5 73.5 Z" fill="#D7A275" />
        <rect x="30.5" y="92" width="11" height="8" rx="1.5" fill="#33A09A" />
        <rect x="58" y="90" width="9" height="11.5" rx="1.5" fill="#FFFFFF" />
        <path d="M62.5 93 L62.5 98.6 M59.7 95.8 L65.3 95.8" stroke="#E04F5F" strokeWidth="1.5" />
      </>
    ),
    hair: (
      <>
        <circle cx="65.5" cy="26.5" r="6.2" fill="#3E2416" />
        <path d="M31.5 45 C31 29 39.5 22.5 50 22.5 C60.5 22.5 69 29 68.5 45 C67 38 62 33 56 31.5 C52 33.5 46 33.5 42 31 C37 33.5 33.5 38 31.5 45 Z" fill="#3E2416" />
      </>
    ),
    front: (
      <>
        <path d="M39.5 72.5 Q35 86 41 94 Q45.5 99 50 95.5" fill="none" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" />
        <path d="M60.5 72.5 Q64 82 60 88.5" fill="none" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" />
        <circle cx="51.6" cy="95.4" r="3.4" fill="#9CA3AF" stroke="#4B5563" strokeWidth="1.2" />
      </>
    ),
  },

  // Marcus: runs a small logistics firm, 45. Hi-vis vest, greying temples, short beard.
  marcus: {
    skin: "#E2B58A",
    shade: "#C99666",
    lips: "#8C4A3A",
    outfit: (
      <>
        {bust("#23395D")}
        <path d="M8 134 C8 99 20 82 38.5 77 L44 134 Z M92 134 C92 99 80 82 61.5 77 L56 134 Z" fill="#C9E265" />
        <path d="M13 99 L42 101.5 M87 99 L58 101.5" stroke="#E5E7EB" strokeWidth="3.2" />
        <path d="M43 74.5 L50 81.5 L57 74.5" fill="none" stroke="#1A2B47" strokeWidth="2" />
      </>
    ),
    under: <path d="M35 53 Q36 66.5 50 68.2 Q64 66.5 65 53 Q62 60.4 57 61.4 Q50 59.8 43 61.4 Q38 60.4 35 53 Z" fill="#4A3527" />,
    hair: (
      <>
        <path d="M31.5 43 C31.5 27 40 21 50 21 C60 21 68.5 27 68.5 43 C67 35 62 30 56 29 L50 31 L44 29 C38 30 33 35 31.5 43 Z" fill="#3A2A1E" />
        <path d="M31.5 43 L32.6 36 L35.2 37.6 L34.6 45.4 Z M68.5 43 L67.4 36 L64.8 37.6 L65.4 45.4 Z" fill="#A8A8A8" />
      </>
    ),
  },

  // Tan Wei Jie: software engineer, 26. Messy fringe, hoodie, headphones round his neck.
  tan: {
    skin: "#F3CFAE",
    shade: "#DDAF88",
    lips: "#A0554B",
    outfit: (
      <>
        {bust("#4B5563")}
        <path d="M35 76.5 Q50 70.5 65 76.5 Q60 74.5 50 78.5 Q40 74.5 35 76.5 Z" fill="#3B4452" />
        <path d="M46.5 81.5 L45.8 94.5 M53.5 81.5 L54.2 94.5" stroke="#D1D5DB" strokeWidth="1.2" strokeLinecap="round" />
        <rect x="57.5" y="90" width="8" height="5.5" rx="1.2" fill="#60A5FA" />
      </>
    ),
    hair: <path d="M30.5 45 C29.5 26 40 19 50 19 C61 19 70.5 26 69.5 45 C68 37 66 34 63.5 33 L61 37.5 L58 32 L54.5 36.5 L51 31 L47 36 L43.5 31.5 L40.5 37 L37.5 33 C34 35 32 39 30.5 45 Z" fill="#17120F" />,
    front: (
      <>
        <path d="M35 77.5 Q50 89.5 65 77.5" fill="none" stroke="#1F2937" strokeWidth="3.4" />
        <rect x="29" y="71.5" width="9" height="11" rx="3.5" fill="#111827" />
        <rect x="62" y="71.5" width="9" height="11" rx="3.5" fill="#111827" />
        <rect x="31" y="73.5" width="5" height="7" rx="2" fill="#374151" />
        <rect x="64" y="73.5" width="5" height="7" rx="2" fill="#374151" />
      </>
    ),
  },
};

// The Gohs: a young couple, drawn as two smaller people side by side.
const DANIEL: Look = {
  skin: "#F0C8A2",
  shade: "#D9A87F",
  lips: "#A65A4E",
  outfit: (
    <>
      {bust("#2A9D8F")}
      <path d="M43 74.5 L50 82.5 L57 74.5" fill="none" stroke="#1F7A6F" strokeWidth="2" />
    </>
  ),
  hair: (
    <>
      <path d="M32 43 C31.5 27 40 21 50 21 C61 21 68.5 27 68 43 C66 34 61 30.5 55 30 C50 32 44 30.5 40 31.5 C35.5 33 33.5 37 32 43 Z" fill="#1A1412" />
      <path d="M40 23.5 Q50 15 60 22.5 Q52 20.5 44 25.5 Z" fill="#1A1412" />
    </>
  ),
};

const MEI_LING: Look = {
  skin: "#F5D2B4",
  shade: "#E2B38E",
  lips: "#B5545C",
  hairBack: <path d="M30 46 C29 27 39 20 50 20 C61 20 71 27 70 46 L70 63 Q66 68 62 63 L62 50 L38 50 L38 63 Q34 68 30 63 Z" fill="#231815" />,
  outfit: (
    <>
      {bust("#E76F51")}
      <circle cx="50" cy="80" r="1.4" fill="#F4D35E" />
    </>
  ),
  hair: (
    <>
      <path d="M32 42 C32 28 40 22.5 50 22.5 C60 22.5 68 28 68 42 L68 40 C64 36 60 34.5 50 35 C40 34.5 36 36 32 40 Z" fill="#231815" />
      <rect x="59.5" y="30" width="7" height="2.6" rx="1.2" fill="#F4A261" transform="rotate(-20 63 31.3)" />
    </>
  ),
};

// ---- You: drawn from the character builder's choices ----

const TONES: Record<YourChoices["skin"], { skin: string; shade: string; lips: string }> = {
  tone1: { skin: "#F7D7BD", shade: "#E4B694", lips: "#B5545C" },
  tone2: { skin: "#F1C9A0", shade: "#DDA87C", lips: "#A65A4E" },
  tone3: { skin: "#D7A275", shade: "#BE8657", lips: "#A8505A" },
  tone4: { skin: "#C68E5C", shade: "#A9713F", lips: "#6E3A26" },
  tone5: { skin: "#8D5A36", shade: "#6F4428", lips: "#4A2618" },
};

export const HAIR_FILL: Record<YourChoices["hairColour"], string> = { black: "#1A1412", brown: "#5A3A22", grey: "#A3A3A3" };

// Swatches for the character builder.
export const SKIN_SWATCH = Object.fromEntries(Object.entries(TONES).map(([tone, { skin }]) => [tone, skin])) as Record<YourChoices["skin"], string>;

function yourHair(style: YourChoices["hair"], fill: string): { hair: ReactNode; hairBack?: ReactNode } {
  switch (style) {
    case "fringe":
      return { hair: <path d="M30.5 45 C29.5 26 40 19 50 19 C61 19 70.5 26 69.5 45 C68 37 66 34 63.5 33 L61 37.5 L58 32 L54.5 36.5 L51 31 L47 36 L43.5 31.5 L40.5 37 L37.5 33 C34 35 32 39 30.5 45 Z" fill={fill} /> };
    case "long":
      return {
        hairBack: <path d="M30 46 C28 27 38 19 50 19 C62 19 72 27 70 46 L71.6 75 Q66 80 61 75 L61 52 L39 52 L39 75 Q34 80 28.4 75 Z" fill={fill} />,
        hair: <path d="M31.5 44 C31.5 29 40 22.5 50 22.5 C60 22.5 68.5 29 68.5 44 C64 35 57 31.5 49 33.5 C44 35 40 38.5 38 43 C36 38 34 40 31.5 44 Z" fill={fill} />,
      };
    case "bun":
      return {
        hair: (
          <>
            <circle cx="50" cy="18.5" r="7.4" fill={fill} />
            <path d="M31.5 45 C31 29 39.5 22.5 50 22.5 C60.5 22.5 69 29 68.5 45 C67 38 62 33 56 31.5 C52 33.5 46 33.5 42 31 C37 33.5 33.5 38 31.5 45 Z" fill={fill} />
          </>
        ),
      };
    case "cap":
      // A hazard-yellow cap: the crash-test lab's colours.
      return {
        hair: (
          <>
            <path d="M31.8 45 L33 36.5 L36.2 37.5 L35.6 46.5 Z M68.2 45 L67 36.5 L63.8 37.5 L64.4 46.5 Z" fill={fill} />
            <path d="M30.8 36 C30.8 22 40 16.8 50 16.8 C60 16.8 69.2 22 69.2 36 Z" fill="#FFD400" />
            <path d="M42 20.5 Q50 18.2 58 20.5 L57.2 31 Q50 29.2 42.8 31 Z" fill="#111111" />
            <path d="M29 36 Q50 31 71 36 Q70.5 39.2 50 38.8 Q29.5 39.2 29 36 Z" fill="#111111" />
          </>
        ),
      };
    case "bald":
      return {
        hair: (
          <>
            <path d="M31.5 48.5 C30 40 31.6 33 36.2 30 C35.2 36 35.6 42 36.6 49.5 Z" fill={fill} />
            <path d="M68.5 48.5 C70 40 68.4 33 63.8 30 C64.8 36 64.4 42 63.4 49.5 Z" fill={fill} />
          </>
        ),
      };
    default:
      return {
        hair: (
          <>
            <path d="M32 43 C31.5 27 40 21 50 21 C61 21 68.5 27 68 43 C66 34 61 30.5 55 30 C50 32 44 30.5 40 31.5 C35.5 33 33.5 37 32 43 Z" fill={fill} />
            <path d="M40 23.5 Q50 15 60 22.5 Q52 20.5 44 25.5 Z" fill={fill} />
          </>
        ),
      };
  }
}

const YOUR_OUTFITS: Record<YourChoices["outfit"], ReactNode> = {
  tee: (
    <>
      {bust("#FFD400")}
      <path d="M38 75 Q50 86 62 75 Q58 73 50 79 Q42 73 38 75 Z" fill="#E0B800" />
    </>
  ),
  shirt: (
    <>
      {bust("#FBFAF6")}
      <path d="M41 73.5 L47.6 82 L50 76.5 Z M59 73.5 L52.4 82 L50 76.5 Z" fill="#FFFFFF" stroke="#C9C3B6" strokeWidth="0.7" />
      <circle cx="50" cy="88" r="0.95" fill="#C9C3B6" />
      <circle cx="50" cy="94" r="0.95" fill="#C9C3B6" />
    </>
  ),
  hoodie: (
    <>
      {bust("#D64545")}
      <path d="M36.5 75.5 Q50 88.5 63.5 75.5 Q60 72.5 50 78.5 Q40 72.5 36.5 75.5 Z" fill="#B83A3A" />
      <path d="M47 80.5 L46.3 93 M53 80.5 L53.7 93" stroke="#FBE3E3" strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),
  blazer: (
    <>
      {bust("#2B3A55")}
      <path d="M42 74 L50 92 L58 74 Z" fill="#FBFAF6" />
      <path d="M42 74 L47 90 L40.5 84 Z M58 74 L53 90 L59.5 84 Z" fill="#22304A" />
    </>
  ),
};

const YOUR_PROPS: Record<Exclude<YourChoices["prop"], "none" | "glasses">, ReactNode> = {
  headphones: (
    <>
      <path d="M35 77.5 Q50 89.5 65 77.5" fill="none" stroke="#1F2937" strokeWidth="3.4" />
      <rect x="29" y="71.5" width="9" height="11" rx="3.5" fill="#111827" />
      <rect x="62" y="71.5" width="9" height="11" rx="3.5" fill="#111827" />
    </>
  ),
  lanyard: (
    <>
      <path d="M40 74 L47 96 M60 74 L53 96" stroke="#FFD400" strokeWidth="2.4" />
      <rect x="43" y="95" width="14" height="11" rx="1.5" fill="#FFFFFF" stroke="#111111" strokeWidth="0.9" />
      <rect x="43" y="95" width="14" height="3.4" rx="1" fill="#111111" />
    </>
  ),
};

function yourLook(choices: YourChoices): Look {
  return {
    ...TONES[choices.skin],
    ...yourHair(choices.hair, HAIR_FILL[choices.hairColour]),
    brow: choices.hairColour === "grey" ? "#8A8A8A" : undefined,
    outfit: YOUR_OUTFITS[choices.outfit],
    glasses: choices.prop === "glasses",
    front: choices.prop === "headphones" || choices.prop === "lanyard" ? YOUR_PROPS[choices.prop] : undefined,
  };
}

const NOSE = <path d="M48.6 52.2 Q50 53.7 51.4 52.2" fill="none" stroke={INK} strokeOpacity="0.35" strokeWidth="1.3" strokeLinecap="round" />;

function features(expression: Expression, look: Look): ReactNode {
  const brow = look.brow ?? INK;
  const line = { fill: "none", strokeLinecap: "round" as const };
  switch (expression) {
    case "happy":
      return (
        <>
          <path d="M40.6 47.8 Q43 44.6 45.4 47.8 M54.6 47.8 Q57 44.6 59.4 47.8" {...line} stroke={INK} strokeWidth="2.2" />
          <path d="M38.5 38.8 Q42.3 36.6 46 38.2 M54 38.2 Q57.7 36.6 61.5 38.8" {...line} stroke={brow} strokeWidth="2.2" />
          <path d="M44 55.4 Q50 64 56 55.4 Z" fill="#8C2F35" />
          <path d="M45.3 55.8 L54.7 55.8 Q54.2 57.6 50 57.8 Q45.8 57.6 45.3 55.8 Z" fill="#FFFFFF" />
          <circle cx="38.4" cy="53" r="3.3" fill="#F28B82" fillOpacity="0.45" />
          <circle cx="61.6" cy="53" r="3.3" fill="#F28B82" fillOpacity="0.45" />
        </>
      );
    case "relieved":
      return (
        <>
          <path d="M40.6 46.4 Q43 49.2 45.4 46.4 M54.6 46.4 Q57 49.2 59.4 46.4" {...line} stroke={INK} strokeWidth="2.2" />
          <path d="M38.5 39.8 Q42 38.2 46 39 M54 39 Q58 38.2 61.5 39.8" {...line} stroke={brow} strokeWidth="2.2" />
          <path d="M45 56.4 Q50 60.6 55 56.4" {...line} stroke={look.lips} strokeWidth="2.1" />
          <circle cx="38.4" cy="53" r="3.1" fill="#F28B82" fillOpacity="0.3" />
          <circle cx="61.6" cy="53" r="3.1" fill="#F28B82" fillOpacity="0.3" />
        </>
      );
    case "worried":
      return (
        <>
          <circle cx="43" cy="47.4" r="2.4" fill={INK} />
          <circle cx="57" cy="47.4" r="2.4" fill={INK} />
          <path d="M38.5 41 L46 37.6 M54 37.6 L61.5 41" {...line} stroke={brow} strokeWidth="2.2" />
          <path d="M45.6 59.2 Q50 55.8 54.4 59.2" {...line} stroke={look.lips} strokeWidth="2" />
        </>
      );
    case "stressed":
      return (
        <>
          <circle cx="43" cy="47" r="3.5" fill="#FFFFFF" stroke={INK} strokeWidth="1.2" />
          <circle cx="57" cy="47" r="3.5" fill="#FFFFFF" stroke={INK} strokeWidth="1.2" />
          <circle cx="43" cy="47.5" r="1.6" fill={INK} />
          <circle cx="57" cy="47.5" r="1.6" fill={INK} />
          <path d="M38 41.8 L46.4 36.8 M53.6 36.8 L62 41.8" {...line} stroke={brow} strokeWidth="2.4" />
          <rect x="44.4" y="55.6" width="11.2" height="4.8" rx="1.6" fill="#FFFFFF" stroke={INK} strokeWidth="1.2" />
          <path d="M44.6 58 L55.4 58 M48.1 55.8 L48.1 60.2 M51.9 55.8 L51.9 60.2" stroke={INK} strokeWidth="0.8" />
          <path d="M66.5 30.5 q4.6 6.8 0 10 q-4.6 -3.2 0 -10 Z" fill="#8FD0F5" stroke="#4A9FD8" strokeWidth="0.8" />
        </>
      );
    default:
      return (
        <>
          <circle cx="43" cy="47" r="2.3" fill={INK} />
          <circle cx="57" cy="47" r="2.3" fill={INK} />
          <path d="M38.5 40.6 L46 39.9 M54 39.9 L61.5 40.6" {...line} stroke={brow} strokeWidth="2.2" />
          <path d="M46 57.6 Q50 58.8 54 57.6" {...line} stroke={look.lips} strokeWidth="2" />
        </>
      );
  }
}

function Face({ expression, look }: { expression: Expression; look: Look }) {
  // Keyed by expression, so a change of mood replays the small "pop".
  return (
    <g key={expression} className="face-pop" data-expression={expression}>
      {NOSE}
      {features(expression, look)}
      {look.mustache && (
        <path
          d="M42.5 54.2 Q46.5 51.4 50 53.2 Q53.5 51.4 57.5 54.2 Q53.6 56.8 50 55.4 Q46.4 56.8 42.5 54.2 Z"
          fill="#F2F2F2"
          stroke="#CFCFCF"
          strokeWidth="0.6"
        />
      )}
      {look.glasses && (
        <>
          <g fill="#FFFFFF" fillOpacity="0.12" stroke="#3B2A4A" strokeWidth="1.6">
            <circle cx="43" cy="47" r="5.8" />
            <circle cx="57" cy="47" r="5.8" />
          </g>
          <path d="M48.8 47 L51.2 47 M37.2 46 L33 44.6 M62.8 46 L67 44.6" stroke="#3B2A4A" strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
    </g>
  );
}

function Person({ look, expression }: { look: Look; expression: Expression }) {
  return (
    <g>
      {look.hairBack}
      {look.outfit}
      <rect x="43" y="58" width="14" height="20" rx="6" fill={look.shade} />
      <circle cx="32.2" cy="47" r="4.2" fill={look.shade} />
      <circle cx="67.8" cy="47" r="4.2" fill={look.shade} />
      <ellipse cx="50" cy="45" rx="18" ry="20.5" fill={look.skin} />
      {look.under}
      {look.hair}
      <Face expression={expression} look={look} />
      {look.front}
    </g>
  );
}

interface Props {
  id: string;
  expression?: Expression;
  size?: number;
  ringClass?: string; // a stroke colour class for the verdict ring, e.g. "stroke-feels"
  className?: string;
  look?: YourChoices; // for you: drawn from the character builder instead of by id
}

// Decorative by default: the name, verdict and mood are always in text nearby.
export function ResidentAvatar({ id, expression = "neutral", size = 56, ringClass, className = "", look: choices }: Props) {
  const clipId = `avatar-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const look = choices ? yourLook(choices) : LOOKS[id];

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" className={className}>
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="50" fill="#EFE6D6" />
      <g clipPath={`url(#${clipId})`}>
        {look ? (
          <Person look={look} expression={expression} />
        ) : (
          <>
            <g transform="translate(-2 18) scale(0.68)">
              <Person look={DANIEL} expression={expression} />
            </g>
            <g transform="translate(34 20) scale(0.66)">
              <Person look={MEI_LING} expression={expression} />
            </g>
          </>
        )}
      </g>
      <circle
        cx="50"
        cy="50"
        r="47.5"
        fill="none"
        strokeWidth="5"
        className={`transition-[stroke] duration-300 motion-reduce:transition-none ${ringClass ?? "stroke-transparent"}`}
      />
    </svg>
  );
}
