"use client";

import { useEffect, useState } from "react";
import type { ChatterLine } from "@/lib/schemas";

// Paces the town chatter like a conversation: remarks arrive from the stream in a burst, but
// each one is spoken in turn and stays the one being said for TALK_MS before the next.
export const TALK_MS = 3200;

export function useConversation(remarks: ChatterLine[], runId: number | null) {
  const [said, setSaid] = useState({ runId, count: 0, talking: false });
  // A new run starts a new conversation.
  const current = said.runId === runId ? said : { runId, count: 0, talking: false };

  useEffect(() => {
    if (current.count < remarks.length) {
      // The first remark is said at once; each next one waits for the one before.
      const timer = window.setTimeout(() => setSaid({ runId, count: current.count + 1, talking: true }), current.count === 0 ? 0 : TALK_MS);
      return () => window.clearTimeout(timer);
    }
    if (current.talking) {
      const timer = window.setTimeout(() => setSaid({ runId, count: current.count, talking: false }), TALK_MS);
      return () => window.clearTimeout(timer);
    }
  }, [current.count, current.talking, remarks.length, runId]);

  return {
    spoken: remarks.slice(0, current.count),
    speaking: current.talking && current.count > 0 ? remarks[current.count - 1] : null,
  };
}
