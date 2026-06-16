"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The single deterministic clock. One monotonic time base; everything else
 * (conduction, vector, tracing) is a pure function of it. `elapsedMs` is
 * monotonic (drives the scrolling rhythm strip); `tMs` is the phase within the
 * current cycle (drives the per-beat views).
 */
export function useCardiacClock(rrMs: number, autoplay = true) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const [speed, setSpeed] = useState(1);

  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    if (!playing) {
      lastRef.current = null;
      return;
    }
    const tick = (now: number) => {
      if (lastRef.current == null) lastRef.current = now;
      const dt = now - lastRef.current;
      lastRef.current = now;
      // Clamp dt so tab-switch pauses don't fast-forward wildly.
      const step = Math.min(dt, 100) * speedRef.current;
      setElapsedMs((prev) => prev + step);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      lastRef.current = null;
    };
  }, [playing]);

  const tMs = ((elapsedMs % rrMs) + rrMs) % rrMs;

  /** Scrub to an absolute phase (0..rr); pauses playback. */
  const scrubToPhase = useCallback(
    (phase: number) => {
      setPlaying(false);
      setElapsedMs(((phase % rrMs) + rrMs) % rrMs);
    },
    [rrMs],
  );

  const toggle = useCallback(() => setPlaying((p) => !p), []);

  return {
    elapsedMs,
    tMs,
    playing,
    speed,
    setSpeed,
    setPlaying,
    toggle,
    scrubToPhase,
  };
}
