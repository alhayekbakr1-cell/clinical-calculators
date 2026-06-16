/**
 * rhythm.ts — Multi-beat AV-conduction timeline (Tier-2: AV blocks).
 *
 * The single-cycle engine assumes a fixed P-QRS-T that repeats. AV block breaks
 * that: the atria keep firing at the sinus rate, but some P waves do not conduct
 * to the ventricles (dropped beats), or the ventricles run on an independent
 * escape pacemaker (complete block / AV dissociation).
 *
 * So we decouple the two. This module is an *infinite generator* on an absolute
 * time axis: given a time t (ms), it knows which P waves and which QRS-T
 * complexes are near t, sums their directed Gaussian events into the same
 * vector m(t), and reports the conduction state (including a blocked AV node).
 *
 * Wave morphology is reused from buildNormalSinus, so the Tier-1 transforms
 * still apply; only the *scheduling* is new.
 */

import { buildNormalSinus } from './normalSinus';
import { projectToLeads } from './leads';
import type {
  ConductionState,
  LeadVoltages,
  Vec3,
  WaveEvent,
} from './types';

export type AvMode =
  | 'normal'
  | 'firstDegree'
  | 'wenckebach'
  | 'mobitz2'
  | 'complete';

export interface RhythmParams {
  mode: AvMode;
  atrialRateBpm: number;
  basePrMs: number;
  /** PR increment per conducted beat (Mobitz I / Wenckebach). */
  wenckebachStepMs: number;
  /** Group size N: conduct N-1 P waves, drop the Nth (Wenckebach / Mobitz II). */
  dropRatio: number;
  /** Ventricular escape rate for complete block (or the VT focus rate). */
  escapeRateBpm: number;
  /** Wide (ventricular) vs narrow (junctional) escape complexes. */
  escapeWide: boolean;
  /** Conducted beats are wide too (BBB aberrancy — SVT with aberration). */
  conductedWide?: boolean;
}

export const DEFAULT_RHYTHM: RhythmParams = {
  mode: 'wenckebach',
  atrialRateBpm: 75,
  basePrMs: 160,
  wenckebachStepMs: 55,
  dropRatio: 4,
  escapeRateBpm: 40,
  escapeWide: true,
};

interface Templates {
  p: WaveEvent[]; // centers relative to P onset
  qrst: WaveEvent[]; // centers relative to QRS onset (narrow)
  qrstWide: WaveEvent[]; // wide escape complex
  pDur: number;
  qrsDur: number;
  qrsWideDur: number;
  tOnsetRel: number;
  tEndRel: number;
}

function buildTemplates(p: RhythmParams): Templates {
  const base = buildNormalSinus({ rateBpm: p.atrialRateBpm, prMs: p.basePrMs });
  const L = base.landmarks;
  const pEvents = base.events
    .filter((e) => e.id === 'P')
    .map((e) => ({ ...e, centerMs: e.centerMs - L.pOnset }));
  const qEvents = base.events
    .filter((e) => e.id !== 'P')
    .map((e) => ({ ...e, centerMs: e.centerMs - L.qrsOnset }));

  // Wide escape complex: widened QRS, discordant T (ventricular origin look).
  const wide = buildNormalSinus({
    rateBpm: p.escapeRateBpm,
    prMs: p.basePrMs,
    qrsMs: 150,
  });
  const Lw = wide.landmarks;
  const wideEvents = wide.events
    .filter((e) => e.id !== 'P')
    .map((e) => {
      const c = { ...e, centerMs: e.centerMs - Lw.qrsOnset };
      if (e.id === 'T') {
        // discordant T (opposite the main QRS direction)
        c.direction = { x: -0.45, y: -0.2, z: 0.4 };
        c.magnitude = 0.5;
      }
      if (e.id === 'R') c.magnitude = e.magnitude * 1.2;
      return c;
    });

  return {
    p: pEvents,
    qrst: qEvents,
    qrstWide: wideEvents,
    pDur: L.pEnd - L.pOnset,
    qrsDur: L.qrsEnd - L.qrsOnset,
    qrsWideDur: Lw.qrsEnd - Lw.qrsOnset,
    tOnsetRel: L.tOnset - L.qrsOnset,
    tEndRel: L.tEnd - L.qrsOnset,
  };
}

/** AV conduction decision for atrial beat index i. */
function avFor(i: number, p: RhythmParams): { conducts: boolean; prMs: number } {
  switch (p.mode) {
    case 'normal':
      return { conducts: true, prMs: p.basePrMs };
    case 'firstDegree':
      return { conducts: true, prMs: Math.max(p.basePrMs, 240) };
    case 'wenckebach': {
      const pos = ((i % p.dropRatio) + p.dropRatio) % p.dropRatio;
      if (pos === p.dropRatio - 1) return { conducts: false, prMs: 0 };
      return { conducts: true, prMs: p.basePrMs + pos * p.wenckebachStepMs };
    }
    case 'mobitz2': {
      const pos = ((i % p.dropRatio) + p.dropRatio) % p.dropRatio;
      if (pos === p.dropRatio - 1) return { conducts: false, prMs: 0 };
      return { conducts: true, prMs: p.basePrMs };
    }
    case 'complete':
      return { conducts: false, prMs: 0 };
  }
}

export interface RhythmEngine {
  params: RhythmParams;
  templates: Templates;
  ppMs: number; // P-P interval
  vvMs: number; // escape V-V interval (complete block)
}

export function makeRhythm(params: RhythmParams): RhythmEngine {
  return {
    params,
    templates: buildTemplates(params),
    ppMs: 60000 / params.atrialRateBpm,
    vvMs: 60000 / params.escapeRateBpm,
  };
}

/** Ventricular activation (QRS onset) times near t, with wide flag. */
function ventOnsetsNear(
  R: RhythmEngine,
  t: number,
  span: number,
): { onset: number; wide: boolean }[] {
  const out: { onset: number; wide: boolean }[] = [];
  if (R.params.mode === 'complete') {
    const jc = Math.round(t / R.vvMs);
    for (let j = jc - 2; j <= jc + 2; j++) {
      if (j < 0) continue;
      out.push({ onset: j * R.vvMs, wide: R.params.escapeWide });
    }
  } else {
    const ic = Math.round(t / R.ppMs);
    for (let i = ic - 3; i <= ic + 3; i++) {
      if (i < 0) continue;
      const av = avFor(i, R.params);
      if (av.conducts)
        out.push({ onset: i * R.ppMs + av.prMs, wide: !!R.params.conductedWide });
    }
  }
  return out.filter((v) => Math.abs(v.onset + 40 - t) < span);
}

/** All wave events near t (P waves + QRS-T complexes). */
function eventsNear(R: RhythmEngine, t: number, span: number): WaveEvent[] {
  const ev: WaveEvent[] = [];
  // Atrial P waves (always present)
  const ic = Math.round(t / R.ppMs);
  for (let i = ic - 3; i <= ic + 3; i++) {
    if (i < 0) continue;
    const onset = i * R.ppMs;
    for (const e of R.templates.p) ev.push({ ...e, centerMs: onset + e.centerMs });
  }
  // Ventricular complexes
  for (const v of ventOnsetsNear(R, t, span + 400)) {
    const tpl = v.wide ? R.templates.qrstWide : R.templates.qrst;
    for (const e of tpl) ev.push({ ...e, centerMs: v.onset + e.centerMs });
  }
  return ev.filter((e) => Math.abs(e.centerMs - t) < span);
}

/** The heart vector at absolute time t. */
export function heartVectorAtAbs(R: RhythmEngine, t: number): Vec3 {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const e of eventsNear(R, t, 6 * 60)) {
    const d = e.centerMs - t;
    const g = Math.exp(-(d * d) / (2 * e.sigmaMs * e.sigmaMs));
    if (g < 1e-4) continue;
    const a = e.magnitude * g;
    x += a * e.direction.x;
    y += a * e.direction.y;
    z += a * e.direction.z;
  }
  return { x, y, z };
}

export function leadsAtAbs(R: RhythmEngine, t: number): LeadVoltages {
  return projectToLeads(heartVectorAtAbs(R, t));
}

export interface PMarker {
  onset: number;
  conducts: boolean;
}

/** P-wave onsets within [from, to], flagged by whether they conduct. */
export function pMarkers(R: RhythmEngine, from: number, to: number): PMarker[] {
  const out: PMarker[] = [];
  const i0 = Math.max(0, Math.floor(from / R.ppMs));
  const i1 = Math.ceil(to / R.ppMs);
  for (let i = i0; i <= i1; i++) {
    const conducts =
      R.params.mode === 'complete' ? false : avFor(i, R.params).conducts;
    out.push({ onset: i * R.ppMs, conducts });
  }
  return out;
}

/** Effective ventricular rate (bpm) for the current mode. */
export function ventricularRate(p: RhythmParams): number {
  switch (p.mode) {
    case 'normal':
    case 'firstDegree':
      return p.atrialRateBpm;
    case 'wenckebach':
    case 'mobitz2':
      return Math.round((p.atrialRateBpm * (p.dropRatio - 1)) / p.dropRatio);
    case 'complete':
      return p.escapeRateBpm;
  }
}

const LABELS: Record<string, string> = {
  saFire: 'SA node fires',
  atrial: 'Atrial depolarization',
  avDelay: 'AV conduction',
  avBlocked: 'AV block — beat dropped',
  hisPurkinje: 'His-Purkinje conduction',
  ventricular: 'Ventricular depolarization',
  repolarization: 'Ventricular repolarization',
  diastole: 'Electrical diastole',
};

/** Conduction state on the absolute timeline (handles dropped beats / blocks). */
export function conductionAtAbs(R: RhythmEngine, t: number): ConductionState {
  const { templates: tpl } = R;

  // Ventricular windows
  for (const v of ventOnsetsNear(R, t, 800)) {
    if (t >= v.onset && t < v.onset + tpl.qrsDur + (v.wide ? 60 : 0)) {
      const into = (t - v.onset) / (tpl.qrsDur + (v.wide ? 60 : 0));
      if (into < 0.2)
        return { phase: 'hisPurkinje', progress: into / 0.2, label: LABELS.hisPurkinje, active: ['his', 'lbb', 'rbb', 'purkinje'] };
      return { phase: 'ventricular', progress: into, label: LABELS.ventricular, active: ['septum', 'lv', 'rv'] };
    }
    if (t >= v.onset + tpl.tOnsetRel && t < v.onset + tpl.tEndRel) {
      return { phase: 'repolarization', progress: (t - v.onset - tpl.tOnsetRel) / (tpl.tEndRel - tpl.tOnsetRel), label: LABELS.repolarization, active: ['ventRepol'] };
    }
  }

  // Atrial window
  const iP = Math.round(t / R.ppMs);
  const pOnset = iP * R.ppMs;
  if (t >= pOnset && t < pOnset + tpl.pDur) {
    const f = (t - pOnset) / tpl.pDur;
    if (f < 0.15) return { phase: 'saFire', progress: f / 0.15, label: LABELS.saFire, active: ['sa', 'ra'] };
    return { phase: 'atrial', progress: f, label: LABELS.atrial, active: ['ra', 'la'] };
  }

  // Between this P and its (would-be) QRS: conducting delay or a block?
  if (R.params.mode !== 'complete') {
    const av = avFor(iP, R.params);
    const pEnd = pOnset + tpl.pDur;
    const expectedQrs = pOnset + (av.conducts ? av.prMs : Math.max(R.params.basePrMs, 200));
    if (t >= pEnd && t < expectedQrs + 30) {
      if (av.conducts) {
        return { phase: 'avDelay', progress: (t - pEnd) / Math.max(1, expectedQrs - pEnd), label: LABELS.avDelay, active: ['av'] };
      }
      return { phase: 'avBlocked', progress: (t - pEnd) / Math.max(1, expectedQrs - pEnd), label: LABELS.avBlocked, active: ['avBlock'] };
    }
  } else {
    // Complete block: AV node persistently non-conducting (dissociation).
    return { phase: 'avBlocked', progress: 0, label: 'Complete AV block — dissociation', active: ['avBlock'] };
  }

  return { phase: 'diastole', progress: 0, label: LABELS.diastole, active: [] };
}
