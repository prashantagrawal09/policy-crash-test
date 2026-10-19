"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { HOUR_MS, walk, WALK_SPEED, type Point } from "@/lib/townLife";

// The moving parts of the living town (prd.md > Living Town): a clock, and walkers that follow
// the streets to wherever they're meant to be. Both stand still for people who prefer reduced motion.

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

// True on the server and during hydration, so the town first renders still, with everyone at home.
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(MOTION_QUERY);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(MOTION_QUERY).matches,
    () => true,
  );
}

const START_HOUR = 7;

// The hour of the town's day (0–23), one hour every HOUR_MS. While not running it shows `held`
// (the start of the day by default).
export function useTownClock(running: boolean, held = START_HOUR): number {
  const [hour, setHour] = useState(START_HOUR);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setHour((h) => (h + 1) % 24), HOUR_MS);
    return () => window.clearInterval(timer);
  }, [running]);
  return running ? hour : held;
}

export interface Leg {
  point: Point; // where the pin is heading (or standing)
  ms: number; // how long this leg takes, for the CSS transition
  walking: boolean;
}

const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const standing = (points: Record<string, Point>): Record<string, Leg> =>
  Object.fromEntries(Object.entries(points).map(([id, point]) => [id, { point, ms: 0, walking: false }]));

// Each walker heads for their spot in `desired`, one street leg at a time. A new destination
// mid-walk takes over once the current leg ends. While still, everyone stands at `homes`.
export function useWalkers(desired: Record<string, Point>, homes: Record<string, Point>, moving: boolean): Record<string, Leg> {
  const [legs, setLegs] = useState<Record<string, Leg>>(() => standing(homes));
  const at = useRef<Record<string, Point>>({ ...homes });
  const queues = useRef<Record<string, Point[]>>({});
  const timers = useRef<Record<string, number>>({});

  const step = useCallback((id: string) => {
    const next = queues.current[id]?.shift();
    if (!next) {
      delete timers.current[id];
      setLegs((all) => ({ ...all, [id]: { point: at.current[id], ms: 0, walking: false } }));
      return;
    }
    const from = at.current[id];
    const ms = Math.max(200, Math.round(Math.hypot(next.x - from.x, next.y - from.y) / WALK_SPEED));
    at.current[id] = next;
    setLegs((all) => ({ ...all, [id]: { point: next, ms, walking: true } }));
    timers.current[id] = window.setTimeout(() => step(id), ms);
  }, []);

  const desiredKey = JSON.stringify(desired);
  const homesKey = JSON.stringify(homes);
  useEffect(() => {
    const targets: Record<string, Point> = JSON.parse(moving ? desiredKey : homesKey);
    if (!moving) {
      Object.values(timers.current).forEach((timer) => window.clearTimeout(timer));
      timers.current = {};
      queues.current = {};
      at.current = { ...targets };
      setLegs(standing(targets));
      return;
    }
    for (const [id, target] of Object.entries(targets)) {
      at.current[id] ??= target;
      const end = queues.current[id]?.at(-1) ?? at.current[id];
      if (same(end, target)) continue;
      queues.current[id] = walk(at.current[id], target).slice(1);
      if (!timers.current[id]) step(id);
    }
  }, [desiredKey, homesKey, moving, step]);

  useEffect(() => () => Object.values(timers.current).forEach((timer) => window.clearTimeout(timer)), []);

  return legs;
}
