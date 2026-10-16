"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ResidentResult } from "@/lib/engine";
import type { Expression } from "@/lib/expressions";
import { VERDICT_LABELS } from "@/lib/format";
import type { Lever, Resident } from "@/lib/schemas";
import { coinRecipients, directionLabel, HOMES, LANDMARKS, litLandmarks, MAP_HEIGHT, MAP_WIDTH, type Box, type Direction, type Landmark } from "@/lib/townMap";
import type { DiaryState } from "@/lib/useCrashTest";
import { ResidentAvatar } from "./ResidentAvatar";
import { VERDICT_STYLES } from "./verdictStyles";

// The town reacting to a policy (prd.md > Town Map): the places it touches light up, each
// resident's pin takes their verdict colour, coins drop on one-off recipients, and reactions pop
// up as diaries land. The scene is SVG; the pins are HTML buttons laid over it.

const BUBBLE_MS = 4000;
const ARROWS: Record<Direction, string> = { up: "▲", down: "▼", mixed: "▲▼" };

interface Props {
  residents: Resident[];
  results: ResidentResult[] | null;
  levers: Lever[] | null;
  runId: number | null;
  diaries: Record<string, DiaryState>;
  faces: Record<string, Expression>;
  onSelect: (residentId: string) => void;
}

const pct = (value: number, of: number) => `${(value / of) * 100}%`;

// ---- The scene ----

function Windows({ box, cols, color, top = 14, gap = 16 }: { box: Box; cols: number; color: string; top?: number; gap?: number }) {
  const cells: ReactNode[] = [];
  const cellW = (box.w - 12) / cols - 4;
  for (let y = box.y + top; y < box.y + box.h - 16; y += gap) {
    for (let c = 0; c < cols; c++) {
      cells.push(<rect key={`${y}-${c}`} x={box.x + 8 + c * (cellW + 4)} y={y} width={cellW} height={8} rx={1} fill={color} />);
    }
  }
  return <>{cells}</>;
}

function Block({ box, fill, stroke, label }: { box: Box; fill: string; stroke: string; label: string }) {
  return (
    <g>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={fill} stroke={stroke} strokeWidth="1.2" />
      <rect x={box.x - 2} y={box.y - 4} width={box.w + 4} height={6} rx={1.5} fill={stroke} />
      <Windows box={box} cols={3} color="#8FB3D9" />
      <rect x={box.x + box.w / 2 - 7} y={box.y + box.h - 16} width={14} height={16} fill={stroke} />
      <text x={box.x + box.w / 2} y={box.y + 11} textAnchor="middle" fontSize="8" fontWeight="700" fill="#5A4A3A">
        {label}
      </text>
    </g>
  );
}

function Scene() {
  const { mrt, hawker, bus, offices, petrol, childcare, clinic, campus, power, mart, mall } = LANDMARKS;
  return (
    <>
      <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="#E6EED9" />
      {/* Roads */}
      <rect x="478" y="44" width="32" height="256" fill="#CFCBC2" />
      <line x1="494" y1="50" x2="494" y2="296" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="10 8" />
      <rect x="0" y="294" width={MAP_WIDTH} height="4" fill="#BDB7AB" />
      <rect x="0" y="298" width={MAP_WIDTH} height="34" fill="#CFCBC2" />
      <line x1="0" y1="315" x2={MAP_WIDTH} y2="315" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="16 12" />
      <rect x="0" y="332" width={MAP_WIDTH} height="5" fill="#BDB7AB" />
      {/* MRT viaduct and train */}
      <rect x="0" y="34" width={MAP_WIDTH} height="7" fill="#AEB5BF" />
      {[90, 250, 410, 650, 810, 970].map((x) => (
        <rect key={x} x={x} y="41" width="6" height="12" fill="#AEB5BF" />
      ))}
      <g>
        <rect x="560" y="17" width="190" height="18" rx="7" fill="#F1F4F8" stroke="#8D97A3" strokeWidth="1.2" />
        <rect x="560" y="28" width="190" height="3" fill="#D84B4B" />
        {[574, 600, 626, 652, 678, 704, 726].map((x) => (
          <rect key={x} x={x} y="20" width="16" height="6" rx="1.5" fill="#9CC6E6" />
        ))}
      </g>
      {/* Trees */}
      {[
        [900, 372],
        [942, 392],
        [978, 366],
        [258, 118],
        [222, 96],
        [612, 120],
        [652, 104],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x - 2} y={y + 8} width="4" height="12" fill="#8B6A4A" />
          <circle cx={x} cy={y} r="13" fill="#8DBF7A" />
          <circle cx={x - 5} cy={y - 4} r="6" fill="#A6D093" />
        </g>
      ))}

      {/* MRT station */}
      <g>
        <rect x={mrt.box.x + 8} y={mrt.box.y + 16} width={mrt.box.w - 16} height={mrt.box.h - 18} fill="#D7E6F4" stroke="#6E95BC" strokeWidth="1.2" />
        <rect x={mrt.box.x} y={mrt.box.y + 8} width={mrt.box.w} height="10" rx="3" fill="#6E95BC" />
        <rect x={mrt.box.x + 62} y={mrt.box.y + 40} width="26" height="30" fill="#FFFFFF" stroke="#6E95BC" />
        <rect x={mrt.box.x + 16} y={mrt.box.y + 26} width="28" height="10" rx="2" fill="#D84B4B" />
        <text x={mrt.box.x + 30} y={mrt.box.y + 34} textAnchor="middle" fontSize="8" fontWeight="800" fill="#FFFFFF">MRT</text>
      </g>
      {/* Hawker centre */}
      <g>
        <rect x={hawker.box.x + 8} y={hawker.box.y + 38} width={hawker.box.w - 16} height={hawker.box.h - 40} fill="#F6E7D2" stroke="#C9A98A" />
        <polygon points={`${hawker.box.x},${hawker.box.y + 40} ${hawker.box.x + 80},${hawker.box.y + 2} ${hawker.box.x + 160},${hawker.box.y + 40}`} fill="#D85A30" />
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x={hawker.box.x + 18 + i * 34} y={hawker.box.y + 52} width="26" height="24" fill="#FFFFFF" stroke="#C9A98A" />
            <rect x={hawker.box.x + 18 + i * 34} y={hawker.box.y + 52} width="26" height="6" fill={i % 2 ? "#F2C14E" : "#5BA4CF"} />
          </g>
        ))}
        <text x={hawker.box.x + 80} y={hawker.box.y + 33} textAnchor="middle" fontSize="10" fontWeight="800" fill="#FFFFFF">HAWKER</text>
      </g>
      {/* Bus stop and bus */}
      <g>
        <rect x={bus.box.x + 6} y={bus.box.y + 8} width="54" height="6" rx="1.5" fill="#2E7D5B" />
        <rect x={bus.box.x + 10} y={bus.box.y + 14} width="3" height="34" fill="#6B7280" />
        <rect x={bus.box.x + 53} y={bus.box.y + 14} width="3" height="34" fill="#6B7280" />
        <rect x={bus.box.x + 15} y={bus.box.y + 38} width="36" height="4" fill="#8B5E3C" />
        <rect x={bus.box.x - 4} y={bus.box.y + 57} width="74" height="22" rx="5" fill="#3E8E5E" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={bus.box.x + 2 + i * 16} y={bus.box.y + 61} width="12" height="7" rx="1" fill="#CDE7F5" />
        ))}
        <circle cx={bus.box.x + 10} cy={bus.box.y + 79} r="4" fill="#333333" />
        <circle cx={bus.box.x + 56} cy={bus.box.y + 79} r="4" fill="#333333" />
      </g>

      {/* Homes */}
      <Block box={HOMES.lim.box} fill="#F2E3C6" stroke="#B9A27A" label="BLK 21" />
      <Block box={HOMES.raju.box} fill="#E8D7EF" stroke="#A88BB8" label="BLK 22" />
      <Block box={HOMES.nurul.box} fill="#D6EAE7" stroke="#86B3AC" label="BLK 23" />
      <Block box={HOMES.faizal.box} fill="#F6D7C3" stroke="#C99A7C" label="BLK 24" />
      <g>
        {(() => {
          const b = HOMES.chloe.box;
          return (
            <>
              <rect x={b.x + 4} y={b.y + 28} width={b.w - 8} height={b.h - 28} fill="#FFF3DD" stroke="#C9A98A" />
              <polygon points={`${b.x - 2},${b.y + 30} ${b.x + b.w / 2},${b.y + 4} ${b.x + b.w + 2},${b.y + 30}`} fill="#8C6A4F" />
              <rect x={b.x + 30} y={b.y + 52} width="12" height="24" fill="#8C6A4F" />
              <rect x={b.x + 12} y={b.y + 40} width="12" height="10" fill="#8FB3D9" />
              <rect x={b.x + 48} y={b.y + 40} width="12" height="10" fill="#8FB3D9" />
            </>
          );
        })()}
      </g>
      <g>
        {(() => {
          const b = HOMES.goh.box;
          return (
            <>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="#E3E7EE" stroke="#9AA6B2" strokeWidth="1.2" />
              <Windows box={b} cols={2} color="#A8C4DE" />
              {Array.from({ length: 7 }, (_, i) => (
                <rect key={i} x={b.x - 3} y={b.y + 22 + i * 16} width={b.w + 6} height="2" fill="#9AA6B2" />
              ))}
            </>
          );
        })()}
      </g>
      <g>
        {(() => {
          const b = HOMES.tan.box;
          return (
            <>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="#F7E3A8" stroke="#C9A75A" strokeWidth="1.2" />
              <rect x={b.x - 3} y={b.y - 4} width={b.w + 6} height="6" fill="#C9A75A" />
              {[0, 1, 2].map((i) => (
                <rect key={i} x={b.x + 8 + i * 16} y={b.y + 14} width="10" height="18" rx="5" fill="#5BA4CF" stroke="#2F6F95" />
              ))}
              {[0, 1, 2].map((i) => (
                <path key={i} d={`M${b.x + 4 + i * 18} ${b.y + b.h} L${b.x + 4 + i * 18} ${b.y + 64} Q${b.x + 12 + i * 18} ${b.y + 54} ${b.x + 20 + i * 18} ${b.y + 64} L${b.x + 20 + i * 18} ${b.y + b.h}`} fill="#E0C27A" />
              ))}
            </>
          );
        })()}
      </g>
      <g>
        {(() => {
          const b = HOMES.marcus.box;
          return (
            <>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="2" fill="#CFE3F2" stroke="#8BAFCB" strokeWidth="1.2" />
              <rect x={b.x + 10} y={b.y - 8} width={b.w - 20} height="10" rx="2" fill="#8BAFCB" />
              {Array.from({ length: 17 }, (_, i) => (
                <rect key={i} x={b.x + 4} y={b.y + 10 + i * 12} width={b.w - 8} height="5" fill="#A9C9E2" />
              ))}
              <rect x={b.x + b.w / 2 - 9} y={b.y + b.h - 18} width="18" height="18" fill="#8BAFCB" />
            </>
          );
        })()}
      </g>
      {/* Offices */}
      <g>
        <rect x={offices.box.x + 2} y={offices.box.y + 20} width="36" height={offices.box.h - 20} fill="#A7BCD1" />
        <rect x={offices.box.x + 42} y={offices.box.y} width="36" height={offices.box.h} fill="#8FA8C2" />
        {Array.from({ length: 4 }, (_, i) => (
          <rect key={i} x={offices.box.x + 6 + i * 9} y={offices.box.y + 28} width="4" height={offices.box.h - 34} fill="#C5D5E4" />
        ))}
        {Array.from({ length: 4 }, (_, i) => (
          <rect key={`b${i}`} x={offices.box.x + 46 + i * 8} y={offices.box.y + 8} width="4" height={offices.box.h - 14} fill="#B5C7DA" />
        ))}
      </g>

      {/* Below the road */}
      <g>
        <rect x={petrol.box.x + 6} y={petrol.box.y + 8} width={petrol.box.w - 12} height="10" rx="2" fill="#D84B4B" />
        <rect x={petrol.box.x + 14} y={petrol.box.y + 18} width="4" height="40" fill="#9CA3AF" />
        <rect x={petrol.box.x + petrol.box.w - 18} y={petrol.box.y + 18} width="4" height="40" fill="#9CA3AF" />
        <rect x={petrol.box.x + 36} y={petrol.box.y + 36} width="14" height="22" rx="2" fill="#F2C14E" />
        <rect x={petrol.box.x + 66} y={petrol.box.y + 36} width="14" height="22" rx="2" fill="#F2C14E" />
      </g>
      <g>
        <rect x={childcare.box.x + 10} y={childcare.box.y + 22} width={childcare.box.w - 20} height="40" fill="#FFE08A" stroke="#E0B84A" />
        <polygon points={`${childcare.box.x + 4},${childcare.box.y + 24} ${childcare.box.x + 58},${childcare.box.y + 2} ${childcare.box.x + 112},${childcare.box.y + 24}`} fill="#F28B82" />
        {["#5BA4CF", "#8DBF7A", "#E07A5F"].map((c, i) => (
          <rect key={c} x={childcare.box.x + 22 + i * 14} y={childcare.box.y + 46} width="10" height="10" fill={c} />
        ))}
        <rect x={childcare.box.x + 76} y={childcare.box.y + 38} width="14" height="24" fill="#E0B84A" />
      </g>
      <g>
        <rect x={clinic.box.x + 10} y={clinic.box.y + 12} width={clinic.box.w - 20} height="50" fill="#FFFFFF" stroke="#BFC7CF" />
        <rect x={clinic.box.x + 50} y={clinic.box.y + 22} width="16" height="6" fill="#E04F5F" />
        <rect x={clinic.box.x + 55} y={clinic.box.y + 17} width="6" height="16" fill="#E04F5F" />
        <rect x={clinic.box.x + 20} y={clinic.box.y + 40} width="16" height="10" fill="#A8C4DE" />
        <rect x={clinic.box.x + 80} y={clinic.box.y + 40} width="16" height="10" fill="#A8C4DE" />
      </g>
      <g>
        <rect x={campus.box.x + 10} y={campus.box.y + 24} width={campus.box.w - 20} height="38" fill="#E7B48F" stroke="#C9785B" />
        <polygon points={`${campus.box.x + 4},${campus.box.y + 26} ${campus.box.x + 58},${campus.box.y + 6} ${campus.box.x + 112},${campus.box.y + 26}`} fill="#C9785B" />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={campus.box.x + 18 + i * 18} y={campus.box.y + 30} width="6" height="32" fill="#FFF3E6" />
        ))}
      </g>
      <g>
        <rect x={power.box.x + 12} y={power.box.y + 8} width="30" height="20" rx="4" fill="#9CC3E6" stroke="#6E95BC" />
        <path d={`M${power.box.x + 16} ${power.box.y + 28} L${power.box.x + 12} ${power.box.y + 62} M${power.box.x + 38} ${power.box.y + 28} L${power.box.x + 42} ${power.box.y + 62}`} stroke="#6B7280" strokeWidth="2.5" />
        <rect x={power.box.x + 52} y={power.box.y + 30} width="44" height="32" fill="#B0B7BF" stroke="#8D949C" />
        <path d={`M${power.box.x + 76} ${power.box.y + 34} L${power.box.x + 68} ${power.box.y + 48} L${power.box.x + 75} ${power.box.y + 48} L${power.box.x + 71} ${power.box.y + 59} L${power.box.x + 82} ${power.box.y + 43} L${power.box.x + 75} ${power.box.y + 43} Z`} fill="#F2C14E" />
      </g>
      <g>
        <rect x={mart.box.x + 8} y={mart.box.y + 20} width={mart.box.w - 16} height="42" fill="#A8DCCB" stroke="#6FB7A2" />
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x={mart.box.x + 8 + i * 11} y={mart.box.y + 14} width="11" height="8" fill={i % 2 ? "#FFFFFF" : "#2E9C7E"} />
        ))}
        <rect x={mart.box.x + 40} y={mart.box.y + 38} width="24" height="24" fill="#E8F6F1" stroke="#6FB7A2" />
      </g>
      <g>
        <rect x={mall.box.x + 8} y={mall.box.y + 10} width={mall.box.w - 16} height="52" rx="3" fill="#EAD7F5" stroke="#B79BD6" />
        <rect x={mall.box.x + 40} y={mall.box.y + 16} width="60" height="10" rx="2" fill="#B79BD6" />
        <rect x={mall.box.x + 56} y={mall.box.y + 38} width="28" height="24" fill="#FFFFFF" stroke="#B79BD6" />
      </g>

      {/* Labels for the places below the road */}
      {(["petrol", "childcare", "clinic", "campus", "power", "mart", "mall"] as const).map((key) => {
        const { box, label } = LANDMARKS[key];
        return (
          <text key={key} x={box.x + box.w / 2} y={box.y + box.h - 10} textAnchor="middle" fontSize="11" fontWeight="600" fill="#3F3A33">
            {label}
          </text>
        );
      })}
    </>
  );
}

// ---- What the policy touches ----

function boxesFor(landmark: Landmark): Box[] {
  if (landmark === "homes") return Object.values(HOMES).map((home) => home.box);
  return [LANDMARKS[landmark].box];
}

function Glows({ lit }: { lit: Map<Landmark, Direction> }) {
  return (
    <>
      {[...lit.keys()].flatMap((landmark) =>
        boxesFor(landmark).map((box, i) => (
          <rect
            key={`${landmark}-${i}`}
            x={box.x - 5}
            y={box.y - 7}
            width={box.w + 10}
            height={box.h + 10}
            rx="8"
            fill="#FFD400"
            fillOpacity="0.35"
            stroke="#111111"
            strokeWidth="2"
            strokeDasharray="7 5"
            className="map-lit"
          />
        )),
      )}
    </>
  );
}

function Tags({ lit }: { lit: Map<Landmark, Direction> }) {
  return (
    <>
      {[...lit.entries()].map(([landmark, direction]) => {
        const box = landmark === "homes" ? { x: 400, y: 70, w: 100, h: 0 } : LANDMARKS[landmark].box;
        const text = `${landmark === "homes" ? "Housing costs" : directionLabel(landmark, direction)} ${ARROWS[direction]}`;
        const width = text.length * 6.4 + 14;
        const x = Math.min(Math.max(box.x + box.w / 2 - width / 2, 4), MAP_WIDTH - width - 4);
        return (
          <g key={landmark} className="tag-pop">
            <rect x={x} y={box.y - 22} width={width} height="18" rx="9" fill="#111111" />
            <text x={x + width / 2} y={box.y - 9.5} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#FFD400">
              {text}
            </text>
          </g>
        );
      })}
    </>
  );
}

export function TownMap({ residents, results, levers, runId, diaries, faces, onSelect }: Props) {
  const lit = levers ? litLandmarks(levers) : new Map<Landmark, Direction>();
  const coins = new Set(results ? coinRecipients(results) : []);

  // Reactions pop up for a few seconds as each diary lands; hovering or focusing a pin shows them again.
  const [popped, setPopped] = useState<string[]>([]);
  const seen = useRef(new Set<string>());
  const currentRun = useRef(runId);
  useEffect(() => {
    currentRun.current = runId;
    seen.current = new Set();
    setPopped([]);
  }, [runId]);
  useEffect(() => {
    for (const [id, diary] of Object.entries(diaries)) {
      if (diary.status !== "arrived" || seen.current.has(id)) continue;
      seen.current.add(id);
      const run = currentRun.current;
      setPopped((ids) => [...ids.filter((x) => x !== id), id]);
      setTimeout(() => {
        if (currentRun.current === run) setPopped((ids) => ids.filter((x) => x !== id));
      }, BUBBLE_MS);
    }
  }, [diaries]);

  return (
    <figure className="mt-6 overflow-hidden rounded-lg border border-ink/15 bg-white">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 pt-4">
        <span className="font-display text-2xl font-black font-stretch-condensed">Around town</span>
        <span className="text-xs text-ink/55">
          {results ? "Lit places are what the policy touches. Select someone to see their card." : "Everyone at home. Pick a policy and watch the town react."}
        </span>
      </figcaption>
      <div className="overflow-x-auto px-3 pb-3">
        <div className="relative min-w-[760px] rounded-md bg-[#E6EED9] pt-10">
          <div className="relative w-full" style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}>
            <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="absolute inset-0 h-full w-full rounded-b-md" aria-hidden="true" key={runId ?? "calm"}>
              <Scene />
              <Glows lit={lit} />
              <Tags lit={lit} />
            </svg>

            {residents.map((resident, index) => {
              const home = HOMES[resident.id];
              const result = results?.find((r) => r.id === resident.id) ?? null;
              const verdict = result?.verdict ?? null;
              const diary = diaries[resident.id];
              const reaction = diary?.status === "arrived" ? diary.line.reaction : null;
              const xPct = (home.pin.x / MAP_WIDTH) * 100;
              const align = xPct > 78 ? "right-0" : xPct < 22 ? "left-0" : "left-1/2 -translate-x-1/2";
              const label = `${resident.name}: ${verdict ? VERDICT_LABELS[verdict] : "no policy yet"}${reaction ? `. "${reaction}"` : ""}. Show their card.`;
              return (
                <div
                  key={resident.id}
                  className="group absolute -translate-x-1/2 -translate-y-full"
                  style={{ left: pct(home.pin.x, MAP_WIDTH), top: pct(home.pin.y, MAP_HEIGHT), zIndex: popped.includes(resident.id) ? 30 + popped.indexOf(resident.id) : 10 + index }}
                >
                  {reaction && (
                    <span
                      className={`pointer-events-none absolute bottom-full mb-1.5 w-[168px] rounded-lg border border-ink/20 bg-diary px-2.5 py-1.5 font-diary text-[12.5px] italic leading-snug text-ink shadow-sm transition-opacity duration-200 ${align} ${
                        popped.includes(resident.id) ? "bubble-pop opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                      }`}
                    >
                      {reaction}
                    </span>
                  )}
                  {coins.has(resident.id) && (
                    <span key={`coins-${runId}`} className="pointer-events-none absolute -top-2 left-1/2 flex -translate-x-1/2 gap-0.5" aria-hidden>
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="coin-drop inline-block h-3.5 w-3.5 rounded-full border border-[#B8860B] bg-[#F4C542]" style={{ animationDelay: `${i * 140}ms` }} />
                      ))}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelect(resident.id)}
                    aria-label={label}
                    className={`relative flex flex-col items-center rounded-full transition-[opacity,transform] duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hazard motion-reduce:transition-none ${
                      verdict === "unaffected" ? "opacity-75" : ""
                    }`}
                  >
                    {verdict && verdict !== "unaffected" && (
                      <span key={`ping-${runId}`} className={`impact-ping absolute top-0 h-[46px] w-[46px] rounded-full ${VERDICT_STYLES[verdict].band}`} aria-hidden />
                    )}
                    <span className="relative rounded-full bg-white p-0.5 shadow-sm">
                      <ResidentAvatar id={resident.id} expression={faces[resident.id] ?? "neutral"} size={42} ringClass={verdict ? VERDICT_STYLES[verdict].ring : "stroke-ink/25"} />
                    </span>
                    <span className="-mt-px h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-white drop-shadow-sm" aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </figure>
  );
}
