"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Lightweight progress store for case-review practice.
 *
 * Persists to localStorage today. When Supabase is configured (a logged-in
 * fellow), the same shape can be mirrored to a `progress` row keyed by user id
 * — see syncToSupabase() below, currently a no-op until credentials exist.
 */

export interface CaseResult {
  attempts: number;
  correct: boolean; // ever answered correctly
}

export type ProgressMap = Record<string, CaseResult>;

const KEY = "ecg.progress.v1";

function load(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function save(p: ProgressMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore quota / private-mode errors */
  }
  void syncToSupabase(p);
}

// Placeholder for Phase-3 persistence: when Supabase is wired up and a fellow
// is signed in, upsert this map to their profile. No-op until then.
async function syncToSupabase(_p: ProgressMap): Promise<void> {
  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!configured) return;
  // TODO(phase-3): upsert _p into Supabase keyed by auth user id.
}

export function useProgress() {
  const [progress, setProgress] = useState<ProgressMap>({});

  useEffect(() => {
    setProgress(load());
  }, []);

  const recordResult = useCallback((caseId: string, correct: boolean) => {
    setProgress((prev) => {
      const prior = prev[caseId] ?? { attempts: 0, correct: false };
      const next: ProgressMap = {
        ...prev,
        [caseId]: {
          attempts: prior.attempts + 1,
          correct: prior.correct || correct,
        },
      };
      save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setProgress({});
    save({});
  }, []);

  return { progress, recordResult, reset };
}

export function countMastered(p: ProgressMap): number {
  return Object.values(p).filter((r) => r.correct).length;
}
