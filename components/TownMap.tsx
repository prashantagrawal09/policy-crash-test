"use client";

import { Moon, Plus, Sun } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ResidentResult } from "@/lib/engine";
import type { Expression } from "@/lib/expressions";
import { VERDICT_LABELS } from "@/lib/format";
import type { ChatterLine, Lever, Resident } from "@/lib/schemas";
import { policyFocusX, scrollLeftFor, talkFocusX } from "@/lib/mapFocus";
import { clockLabel, darkness, gatherings, HOUR_MS, whereAt, type Point } from "@/lib/townLife";
import { coinRecipients, directionLabel, HOMES, LANDMARKS, litLandmarks, MAP_HEIGHT, MAP_WIDTH, type Box, type Direction, type Landmark } from "@/lib/townMap";
import type { DiaryState } from "@/lib/useCrashTest";
import { useReducedMotion, useTownClock, useWalkers } from "@/lib/useTownLife";
import { ResidentAvatar } from "./ResidentAvatar";
import { VERDICT_STYLES } from "./verdictStyles";

// The town reacting to a policy (prd.md > Town Map, Living Town): residents go about their day
// while the train, bus and daylight move; when a policy lands, the places it touches light up and
// the people it reaches walk there, take their verdict colour and react. Coins drop on one-off
// recipients and reactions pop up as diaries land. The scene is SVG; the pins are HTML buttons over it.

const BUBBLE_MS = 3000;
const ARROWS: Record<Direction, string> = { up: "▲", down: "▼", mixed: "▲▼" };

interface Props {
  residents: Resident[];
  results: ResidentResult[] | null;
  levers: Lever[] | null;
  runId: number | null;
  diaries: Record<string, DiaryState>;
  faces: Record<string, Expression>;
  speaking: ChatterLine | null; // the remark of town chatter being said right now
  onSelect: (residentId: string) => void;
  onMoveIn: () => void; // the "Move in" sign on the empty plot
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
      {/* MRT viaduct and train (it runs in, stops at the station and runs on) */}
      <rect x="0" y="34" width={MAP_WIDTH} height="7" fill="#AEB5BF" />
      {[90, 250, 410, 650, 810, 970].map((x) => (
        <rect key={x} x={x} y="41" width="6" height="12" fill="#AEB5BF" />
      ))}
      <g className="train-run" transform="translate(560 0)">
        <rect x="0" y="17" width="190" height="18" rx="7" fill="#F1F4F8" stroke="#8D97A3" strokeWidth="1.2" />
        <rect x="0" y="28" width="190" height="3" fill="#D84B4B" />
        {[14, 40, 66, 92, 118, 144, 166].map((x) => (
          <rect key={x} x={x} y="20" width="16" height="6" rx="1.5" fill="#9CC6E6" />
        ))}
      </g>
      {/* A car passing along the far lane (only while the town moves; it starts off the map) */}
      <g className="car-run" transform="translate(-80 0)">
        <rect x="0" y="319" width="40" height="11" rx="4" fill="#E07A5F" />
        <rect x="8" y="314" width="22" height="7" rx="3" fill="#E07A5F" />
        <rect x="11" y="315.5" width="7" height="4.5" rx="1" fill="#CDE7F5" />
        <rect x="20" y="315.5" width="7" height="4.5" rx="1" fill="#CDE7F5" />
        <circle cx="9" cy="330" r="3.2" fill="#333333" />
        <circle cx="31" cy="330" r="3.2" fill="#333333" />
      </g>
      {/* Street lamps */}
      {LAMPS.map((x) => (
        <g key={x}>
          <rect x={x - 1} y="276" width="2" height="20" fill="#6B7280" />
          <circle cx={x} cy="276" r="3" fill="#F2E6B8" stroke="#6B7280" strokeWidth="0.8" />
        </g>
      ))}
      {/* Trees */}
      {[
        [900, 372],
        [942, 392],
        [978, 366],
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
      </g>
      {/* The bus (it pulls in at the stop, waits and drives on) */}
      <g className="bus-run">
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

// ---- Your place (prd.md > Add Yourself) ----

// An empty plot with a sign until you move in; then a small house in the lab's yellow.
function YourPlace({ movedIn, lit }: { movedIn: boolean; lit: boolean }) {
  const b = HOMES.you.box;
  if (!movedIn) {
    return (
      <g>
        <rect x={b.x} y={b.y + 18} width={b.w} height={b.h - 18} rx="4" fill="#DCE8CF" stroke="#8DA77A" strokeWidth="1.4" strokeDasharray="5 4" />
        <rect x={b.x + b.w / 2 - 1.2} y={b.y + 30} width="2.4" height="26" fill="#8B6A4A" />
      </g>
    );
  }
  return (
    <g>
      <rect x={b.x + 5} y={b.y + 22} width={b.w - 10} height={b.h - 22} fill="#FFF3C4" stroke="#C9A75A" strokeWidth="1.2" />
      <polygon points={`${b.x - 2},${b.y + 24} ${b.x + b.w / 2},${b.y + 2} ${b.x + b.w + 2},${b.y + 24}`} fill="#FFD400" stroke="#111111" strokeWidth="1.4" />
      <rect x={b.x + b.w / 2 - 6} y={b.y + b.h - 18} width="12" height="18" fill="#111111" />
      {[b.x + 11, b.x + b.w - 21].map((x) => (
        <rect key={x} x={x} y={b.y + 32} width="10" height="9" fill={lit ? "#FFD98A" : "#8FB3D9"} style={{ transition: `fill ${HOUR_MS}ms ease-in-out` }} />
      ))}
    </g>
  );
}

// ---- What the policy touches ----

function Glows({ lit, homes }: { lit: Map<Landmark, Direction>; homes: Box[] }) {
  return (
    <>
      {[...lit.keys()].flatMap((landmark) =>
        (landmark === "homes" ? homes : [LANDMARKS[landmark].box]).map((box, i) => (
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
        // Tags stay clear of the people gathered there: places below the road carry theirs inside,
        // and the bus stop's sits higher, above the queue.
        const y = box.y >= 340 ? box.y + 48 : landmark === "bus" ? box.y - 64 : box.y - 22;
        return (
          <g key={landmark} className="tag-pop">
            <rect x={x} y={y} width={width} height="18" rx="9" fill="#111111" />
            <text x={x + width / 2} y={y + 12.5} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#FFD400">
              {text}
            </text>
          </g>
        );
      })}
    </>
  );
}

// ---- Day and night ----

const LAMPS = [260, 474, 516, 677, 820, 907];

// Lit cells in the same grid that `Windows` draws, about two in three of them.
function litCells(box: Box, cols: number, seed: number, top = 14, gap = 16): ReactNode[] {
  const cells: ReactNode[] = [];
  const cellW = (box.w - 12) / cols - 4;
  for (let y = box.y + top, row = 0; y < box.y + box.h - 16; y += gap, row++) {
    for (let c = 0; c < cols; c++) {
      if ((row * 2 + c * 3 + seed) % 3 === 0) continue;
      cells.push(<rect key={`${box.x}-${y}-${c}`} x={box.x + 8 + c * (cellW + 4)} y={y} width={cellW} height={8} rx={1} fill="#FFD98A" />);
    }
  }
  return cells;
}

// Night falls: the town dims, and windows and street lamps come on.
function Night({ dark }: { dark: number }) {
  const fade = { transition: `opacity ${HOUR_MS}ms ease-in-out` };
  const { lim, raju, nurul, faizal, goh, chloe, tan, marcus } = HOMES;
  return (
    <g>
      <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="#1B2547" style={{ ...fade, opacity: dark * 0.45 }} />
      <g style={{ ...fade, opacity: dark >= 0.7 ? 1 : 0 }}>
        {litCells(lim.box, 3, 0)}
        {litCells(raju.box, 3, 1)}
        {litCells(nurul.box, 3, 2)}
        {litCells(faizal.box, 3, 1)}
        {litCells(goh.box, 2, 0)}
        <rect x={chloe.box.x + 12} y={chloe.box.y + 40} width="12" height="10" fill="#FFD98A" />
        {[0, 2].map((i) => (
          <rect key={i} x={tan.box.x + 8 + i * 16} y={tan.box.y + 14} width="10" height="18" rx="5" fill="#FFD98A" />
        ))}
        {Array.from({ length: 17 }, (_, i) => i)
          .filter((i) => i % 3 !== 1)
          .map((i) => (
            <rect key={i} x={marcus.box.x + 4} y={marcus.box.y + 10 + i * 12} width={marcus.box.w - 8} height="5" fill="#FFD98A" />
          ))}
        {LAMPS.map((x) => (
          <g key={x}>
            <circle cx={x} cy="276" r="9" fill="#FFE7A3" opacity="0.55" />
            <ellipse cx={x} cy="306" rx="24" ry="8" fill="#FFE7A3" opacity="0.35" />
          </g>
        ))}
      </g>
    </g>
  );
}

// Town chatter: a dashed line arcs from whoever is talking to whoever they're talking to.
const HEAD = 30; // from a pin's tip up to roughly the middle of its face, in map units

function TalkLine({ from, to }: { from: Point; to: Point }) {
  const [x1, y1, x2, y2] = [from.x, from.y - HEAD, to.x, to.y - HEAD];
  const lift = Math.max(Math.min(y1, y2) - 60, 12);
  return (
    <g aria-hidden>
      <path d={`M${x1} ${y1} Q${(x1 + x2) / 2} ${lift} ${x2} ${y2}`} fill="none" stroke="#111111" strokeWidth="2.5" strokeDasharray="5 6" strokeLinecap="round" className="talk-line" />
      <circle cx={x2} cy={y2} r="30" fill="none" stroke="#FFD400" strokeWidth="5" />
    </g>
  );
}

// The map's narrowest width. Below it the map scrolls sideways in its frame, and on those
// screens the frame follows the action (prd.md > Phone Map Follows the Action).
const STAGE_PX = 760;
const DEMO_HOUR = 12; // the hour held while a run is on screen
const FRAME_PADDING = 12; // px-3 on each side of the frame

const HOME_PINS: Record<string, Point> = Object.fromEntries(Object.entries(HOMES).map(([id, home]) => [id, home.pin]));

export function TownMap({ residents, results, levers, runId, diaries, faces, speaking, onSelect, onMoveIn }: Props) {
  const lit = levers ? litLandmarks(levers) : new Map<Landmark, Direction>();
  const coins = new Set(results ? coinRecipients(results) : []);

  // The living town: everyone follows their day until a policy reaches them, then goes to the
  // place behind it. With reduced motion the clock stops and everyone stays at home.
  const still = useReducedMotion();
  // While a run is on screen the town holds midday, so the map never turns grey mid-demo.
  const hour = useTownClock(!still && !results, results && !still ? DEMO_HOUR : undefined);
  const gathered = results && levers ? gatherings(residents, levers, results) : {};
  const homes = Object.fromEntries(residents.map((r) => [r.id, HOME_PINS[r.id]]));
  const desired = Object.fromEntries(residents.map((r) => [r.id, gathered[r.id]?.point ?? whereAt(r.id, hour)]));
  const legs = useWalkers(desired, homes, !still);
  const dark = still ? 0 : darkness(hour);
  const movedIn = residents.some((r) => r.id === "you");

  // On narrow screens: glide the frame to where a policy lands and to whoever is talking, or fit
  // the whole town on screen. Wide screens show the whole map and none of this happens.
  const frame = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState<number | null>(null);
  const [stageHeight, setStageHeight] = useState(0);
  const [fit, setFit] = useState(false);
  useEffect(() => {
    const scroller = frame.current;
    const map = stage.current;
    if (!scroller || !map) return;
    const measure = () => {
      setFrameWidth(scroller.clientWidth);
      setStageHeight(map.offsetHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    observer.observe(map);
    return () => observer.disconnect();
  }, []);
  const narrow = frameWidth !== null && frameWidth - 2 * FRAME_PADDING < STAGE_PX;
  const fitted = fit && narrow;
  const scale = frameWidth ? (frameWidth - 2 * FRAME_PADDING) / STAGE_PX : 1;

  const glideTo = (x: number | null) => {
    const scroller = frame.current;
    const map = stage.current;
    if (x === null || !scroller || !map || scroller.scrollWidth <= scroller.clientWidth) return;
    const focusPx = FRAME_PADDING + (x / MAP_WIDTH) * map.offsetWidth;
    scroller.scrollTo({ left: scrollLeftFor(focusPx, scroller.scrollWidth, scroller.clientWidth), behavior: still ? "auto" : "smooth" });
  };
  const policyX = results && levers ? policyFocusX(residents, levers, results) : null;
  const talkX = speaking && legs[speaking.speaker] ? talkFocusX(legs[speaking.speaker].point, legs[speaking.listener]?.point) : null;
  useEffect(() => glideTo(policyX), [runId, policyX]);
  useEffect(() => glideTo(talkX), [talkX]);

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
        <span className="flex items-baseline gap-2.5">
          <span className="font-display text-2xl font-black font-stretch-condensed">Around town</span>
          {!still && (
            <span className="inline-flex items-center gap-1 self-center rounded-full bg-ink px-2 py-0.5 text-xs font-bold tabular-nums text-hazard" aria-hidden>
              {dark >= 0.7 ? <Moon size={12} strokeWidth={2.5} /> : <Sun size={12} strokeWidth={2.5} />}
              {clockLabel(hour)}
            </span>
          )}
          {narrow && (
            <button
              type="button"
              onClick={() => setFit((on) => !on)}
              aria-pressed={fit}
              className="self-center rounded-full border-2 border-ink bg-white px-2.5 py-0.5 text-xs font-bold transition-colors hover:bg-hazard"
            >
              {fit ? "Close up" : "Whole town"}
            </button>
          )}
        </span>
        <span className="text-xs text-ink/55">
          {results
            ? `Lit places are what the policy touches${still ? "" : ", and the people it reaches go there"}. Select someone to see their card.`
            : still
              ? "Everyone at home. Pick a policy and watch the town react."
              : "A day in town. Pick a policy and watch who it reaches."}
          {narrow && !fit && " Swipe the map to look around."}
        </span>
      </figcaption>
      <div ref={frame} className="overflow-x-auto px-3 pb-3">
        <div style={fitted ? { height: stageHeight * scale, overflow: "hidden" } : undefined}>
        <div
          ref={stage}
          className="relative min-w-[760px] rounded-md bg-[#E6EED9] pt-10"
          style={fitted ? { width: STAGE_PX, transform: `scale(${scale})`, transformOrigin: "top left" } : undefined}
        >
          {/* The strip above the scene darkens with it at night. */}
          <div className="pointer-events-none absolute inset-0 rounded-md bg-[#1B2547]" style={{ opacity: dark * 0.45, transition: `opacity ${HOUR_MS}ms ease-in-out` }} aria-hidden />
          <div className="relative w-full" style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}>
            <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="absolute inset-0 h-full w-full rounded-b-md" aria-hidden="true">
              <Scene />
              <YourPlace movedIn={movedIn} lit={dark >= 0.7} />
              <Night dark={dark} />
              <g key={runId ?? "calm"}>
                <Glows lit={lit} homes={residents.map((r) => HOMES[r.id].box)} />
                <Tags lit={lit} />
              </g>
              {speaking && legs[speaking.speaker] && legs[speaking.listener] && (
                <TalkLine key={`${speaking.speaker}-${speaking.text}`} from={legs[speaking.speaker].point} to={legs[speaking.listener].point} />
              )}
            </svg>

            {!movedIn && (
              <button
                type="button"
                onClick={onMoveIn}
                className="absolute z-[5] inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-full border-2 border-ink bg-hazard px-2 py-0.5 text-[11px] font-black uppercase tracking-wide shadow-sm transition-transform hover:-translate-y-[60%] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/30 motion-reduce:transition-none"
                style={{ left: pct(HOMES.you.pin.x, MAP_WIDTH), top: pct(HOMES.you.box.y + 30, MAP_HEIGHT) }}
              >
                <Plus size={12} strokeWidth={3} aria-hidden /> Move in
              </button>
            )}

            {residents.map((resident) => {
              const leg = legs[resident.id] ?? { point: HOME_PINS[resident.id], ms: 0, walking: false };
              const result = results?.find((r) => r.id === resident.id) ?? null;
              const verdict = result?.verdict ?? null;
              const diary = diaries[resident.id];
              const reaction = diary?.status === "arrived" ? diary.line.reaction : null;
              const talking = speaking?.speaker === resident.id ? speaking : null;
              const xPct = (leg.point.x / MAP_WIDTH) * 100;
              const align = xPct > 78 ? "right-0" : xPct < 22 ? "left-0" : "left-1/2 -translate-x-1/2";
              const label = `${resident.name}: ${verdict ? VERDICT_LABELS[verdict] : "no policy yet"}${reaction ? `. "${reaction}"` : ""}. Show their card.`;
              return (
                <div
                  key={resident.id}
                  className="group absolute -translate-x-1/2 -translate-y-full"
                  style={{
                    left: pct(leg.point.x, MAP_WIDTH),
                    top: pct(leg.point.y, MAP_HEIGHT),
                    transition: leg.ms ? `left ${leg.ms}ms linear, top ${leg.ms}ms linear` : undefined,
                    // Nearer the bottom stands in front; a fresh reaction comes to the front, and whoever is talking above all.
                    zIndex: talking ? 200 : popped.includes(resident.id) ? 100 + popped.indexOf(resident.id) : 10 + Math.round(leg.point.y / 10),
                  }}
                >
                  {talking && (
                    <span
                      key={talking.text}
                      // Near the top of the map the bubble hangs below the pin, so it isn't cut off.
                      className={`bubble-pop pointer-events-none absolute w-[180px] rounded-2xl border-2 border-ink bg-white px-3 py-2 text-[13px] leading-snug text-ink shadow-md ${align} ${
                        leg.point.y < 180 ? "top-full mt-1.5" : "bottom-full mb-1.5"
                      }`}
                    >
                      <span className="block text-[10.5px] font-bold uppercase tracking-wider text-ink/50">
                        to {residents.find((r) => r.id === talking.listener)?.shortName ?? talking.listener}
                      </span>
                      {talking.text}
                    </span>
                  )}
                  {reaction && !talking && (
                    <span
                      className={`pointer-events-none absolute bottom-full mb-1.5 w-[150px] rounded-lg border border-ink/20 bg-diary px-2.5 py-1.5 font-diary text-[12.5px] italic leading-snug text-ink shadow-sm transition-opacity duration-200 ${align} ${
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
                    {/* They react once they get there. */}
                    {verdict && verdict !== "unaffected" && !leg.walking && (
                      <span key={`ping-${runId}`} className={`impact-ping absolute top-0 h-[46px] w-[46px] rounded-full ${VERDICT_STYLES[verdict].band}`} aria-hidden />
                    )}
                    <span className={`relative rounded-full bg-white p-0.5 shadow-sm ${leg.walking ? "walk-bob" : ""}`}>
                      {resident.id === "you" && (
                        <span className="absolute -right-2 -top-1 z-10 rounded bg-ink px-1 py-px text-[9px] font-black leading-none text-hazard" aria-hidden>
                          YOU
                        </span>
                      )}
                      <ResidentAvatar id={resident.id} look={resident.look} expression={faces[resident.id] ?? "neutral"} size={42} ringClass={verdict ? VERDICT_STYLES[verdict].ring : "stroke-ink/25"} />
                    </span>
                    <span className="-mt-px h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-white drop-shadow-sm" aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        </div>
      </div>
    </figure>
  );
}
