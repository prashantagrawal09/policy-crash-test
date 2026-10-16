"use client";

import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Counts a number up (or down) to its new value over a moment, easing out. It starts from 0 the
// first time, then from wherever it last was. With reduced motion it shows the final value at once.
// The final frame is exactly `target`, so what's left on screen always matches the engine.
export function useCountUp(target: number, durationMs = 650): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  const shown = useRef(value);

  useEffect(() => {
    const from = shown.current;
    if (prefersReducedMotion() || from === target || Math.abs(target) < 1) {
      shown.current = target;
      setValue(target);
      return;
    }
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / durationMs);
      const next = progress === 1 ? target : from + (target - from) * (1 - (1 - progress) ** 3);
      shown.current = next;
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // Animation frames pause in background tabs; make sure the final value still lands.
    const snap = window.setTimeout(() => {
      cancelAnimationFrame(frame);
      shown.current = target;
      setValue(target);
    }, durationMs + 80);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(snap);
    };
  }, [target, durationMs]);

  return value;
}
