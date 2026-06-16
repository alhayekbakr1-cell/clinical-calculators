/**
 * normalSinus.ts — Build one cardiac cycle, with optional Tier-1 morphology
 * transforms (axis, hyperkalemia, LVH, atrial enlargement).
 *
 * Every transform is a no-op at its default, so buildNormalSinus({}) is exactly
 * the verified normal-sinus ground truth from Phase 0.
 *
 * Timing landmarks (PR, QRS, QT) remain authoritative — read-outs and the
 * animation clock both read them, so they agree to the millisecond.
 *
 * Directions are in Frank coordinates (x:left+, y:inferior+, z:posterior+).
 * The morphology transforms are illustrative teaching models (clearly labelled
 * as such in the UI), built on standard mechanisms and criteria; they are not a
 * claim to reproduce any individual patient's tracing.
 */

import type { CardiacModel, CycleLandmarks, Vec3, WaveEvent } from './types';

function unit(v: Vec3): Vec3 {
  const m = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / m, y: v.y / m, z: v.z / m };
}

/** Rotate a vector's frontal (x, y) component by `rad`; z unchanged. */
function rotateFrontal(v: Vec3, rad: number): Vec3 {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c, z: v.z };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export type AtrialEnlargement = 'none' | 'LAE' | 'RAE' | 'biatrial';

export type ConductionBlock =
  | 'none'
  | 'RBBB'
  | 'LBBB'
  | 'LAFB'
  | 'LPFB'
  | 'RBBB+LAFB'
  | 'RBBB+LPFB';

export type StemiTerritory =
  | 'none'
  | 'inferior'
  | 'anterior'
  | 'lateral'
  | 'septal'
  | 'posterior';

// "Injury current" direction toward each infarcting wall (Frank coords).
// The ST vector projects as elevation in the facing leads and, automatically,
// reciprocal depression in the opposite leads.
const STEMI_DIR: Record<Exclude<StemiTerritory, 'none'>, Vec3> = {
  inferior: { x: 0.0, y: 0.9, z: 0.3 },
  anterior: { x: 0.1, y: 0.1, z: -0.95 },
  lateral: { x: 0.92, y: -0.1, z: 0.0 },
  septal: { x: -0.2, y: 0.05, z: -0.95 },
  posterior: { x: 0.3, y: 0.2, z: 0.92 },
};

export interface SinusParams {
  rateBpm: number;
  prMs: number;
  qrsMs: number;
  pDurationMs: number;
  qtcMs: number;
  rAmplitude: number;
  tAmplitude: number;
  pAmplitude: number;
  // --- Phase 2 morphology (Tier-1) ---
  /** Target mean frontal QRS axis (deg). undefined = natural (~ +54). */
  qrsAxisDeg?: number;
  /** Serum potassium (mmol/L). 4.0 = normal. */
  potassiumMmol: number;
  /** LVH severity 0..1 (voltage + optional strain). */
  lvh: number;
  /** Repolarisation "strain" pattern with LVH. */
  lvStrain: boolean;
  /** Atrial enlargement pattern (P-wave morphology). */
  atrial: AtrialEnlargement;
  /** Intraventricular conduction block (Tier-2). */
  conductionBlock: ConductionBlock;
  /** Ventricular pre-excitation / WPW (0 = none .. 1 = maximal delta). */
  preExcitation: number;
  /** Acute STEMI territory (ST-segment injury current). */
  stemi: StemiTerritory;
}

export const DEFAULT_SINUS: SinusParams = {
  rateBpm: 72,
  prMs: 160,
  qrsMs: 92,
  pDurationMs: 110,
  qtcMs: 400,
  rAmplitude: 1,
  tAmplitude: 1,
  pAmplitude: 1,
  potassiumMmol: 4.0,
  lvh: 0,
  lvStrain: false,
  atrial: 'none',
  conductionBlock: 'none',
  preExcitation: 0,
  stemi: 'none',
};

// Base (normal) directions — the Phase-0 ground truth.
const BASE_DIR = {
  P: { x: 0.5, y: 0.8, z: -0.1 },
  septal: { x: -0.6, y: -0.5, z: -0.6 },
  R: { x: 0.45, y: 0.55, z: 0.5 },
  S: { x: -0.4, y: -0.4, z: 0.5 },
  T: { x: 0.4, y: 0.5, z: -0.5 },
};

const DEG = Math.PI / 180;

/** Build a fully self-consistent single cardiac cycle. */
export function buildNormalSinus(partial: Partial<SinusParams> = {}): CardiacModel {
  const p = { ...DEFAULT_SINUS, ...partial };

  // ---------------------------------------------------------------
  // Hyperkalaemia transform (illustrative progression).
  //   ~5.5+  tall, peaked, narrow T
  //   ~5.5+  P flattens (gone by ~8)
  //   ~6+    PR lengthens
  //   ~6.5+  QRS widens (toward sine wave)
  // ---------------------------------------------------------------
  const k = p.potassiumMmol;
  const tPeak = Math.max(0, k - 5.0);
  const tAmpK = 1 + tPeak * 0.6;
  const tSigmaK = 1 / (1 + tPeak * 0.4);
  const pFactorK = clamp(1 - Math.max(0, k - 5.5) * 0.45, 0, 1);
  const qrsK = 1 + Math.max(0, k - 6.5) * 0.3;
  const prK = Math.max(0, k - 6.0) * 15;

  // ---------------------------------------------------------------
  // LVH: increased voltage (Sokolow-Lyon rises), optional strain T.
  // ---------------------------------------------------------------
  const rLvh = 1 + p.lvh * 0.95;
  const sLvh = 1 + p.lvh * 0.6;

  // ---------------------------------------------------------------
  // Intraventricular conduction blocks (Tier-2).
  //   RBBB: a late terminal rightward + anterior force (the RV depolarises
  //         last, cell-to-cell) -> rSR' in V1, wide slurred S in I and V6.
  //   LBBB: loss of the normal septal q and a broad, slurred leftward QRS
  //         -> QS in V1, broad (often notched) R in I/aVL/V6, discordant T.
  //   LAFB / LPFB: fascicular axis shift (LAD / RAD) with mild widening.
  // ---------------------------------------------------------------
  const block = p.conductionBlock;
  const hasRBBB = block === 'RBBB' || block === 'RBBB+LAFB' || block === 'RBBB+LPFB';
  const isLBBB = block === 'LBBB';
  const hasLAFB = block === 'LAFB' || block === 'RBBB+LAFB';
  const hasLPFB = block === 'LPFB' || block === 'RBBB+LPFB';
  // QRS-width target for the block (ms); overrides hyperkalaemia widening.
  const blockQrs = isLBBB ? 150 : hasRBBB ? 140 : hasLAFB || hasLPFB ? 104 : 0;
  // Fascicular blocks set the frontal axis (deg).
  const blockAxis = hasLAFB ? -55 : hasLPFB ? 110 : undefined;

  // Pre-excitation (WPW): the accessory pathway reaches the ventricle early,
  // shortening PR and adding a slurred delta wave that widens the QRS.
  const wpw = clamp(p.preExcitation, 0, 1);

  // Effective timing
  const prMs = p.prMs + prK - wpw * 70;
  const qrsMs = (blockQrs || p.qrsMs * qrsK) + wpw * 42;

  const rrMs = 60000 / p.rateBpm;
  const rrSec = rrMs / 1000;

  // --- Landmarks ---
  const pOnset = 0;
  const pEnd = pOnset + p.pDurationMs;
  const qrsOnset = pOnset + prMs;
  const qrsEnd = qrsOnset + qrsMs;
  const qtMs = p.qtcMs * Math.sqrt(rrSec);
  const tEnd = qrsOnset + qtMs;
  const tPeakT = qrsEnd + 0.55 * (tEnd - qrsEnd);
  const tSigma = ((tEnd - tPeakT) / 2.3) * tSigmaK;
  const tOnset = Math.max(qrsEnd, tPeakT - 2.3 * tSigma);

  const landmarks: CycleLandmarks = {
    pOnset,
    pEnd,
    qrsOnset,
    qrsEnd,
    tOnset,
    tEnd,
    rrMs,
  };

  // --- QRS sub-event timing ---
  const qCenter = qrsOnset + 0.1 * qrsMs;
  const rCenter = qrsOnset + 0.33 * qrsMs;
  const sCenter = qrsOnset + 0.62 * qrsMs;

  // --- Atrial morphology (P direction / size) ---
  let pDir: Vec3 = { ...BASE_DIR.P };
  let pAmp = 0.18 * p.pAmplitude * pFactorK;
  let pDur = p.pDurationMs;
  const ae = p.atrial;
  if (ae === 'RAE' || ae === 'biatrial') {
    pAmp *= 1.6; // tall, peaked P
    pDir = { x: pDir.x, y: pDir.y + 0.4, z: pDir.z }; // more inferior
  }
  if (ae === 'LAE' || ae === 'biatrial') {
    pDur *= 1.4; // broad P
    pDir = { x: pDir.x, y: pDir.y, z: pDir.z + 0.45 }; // late posterior force -> V1 terminal negativity
  }
  // Re-derive P landmarks if duration changed
  landmarks.pEnd = pOnset + pDur;

  // --- Repolarisation (T) direction: strain inverts it laterally ---
  let tDir: Vec3 = { ...BASE_DIR.T };
  let tAmp = 0.45 * p.tAmplitude * tAmpK;
  if ((p.lvStrain && p.lvh > 0) || isLBBB) {
    // Discordant (opposite the main QRS): rightward, slightly superior, posterior.
    tDir = { x: -0.45, y: -0.15, z: 0.4 };
    tAmp = 0.45 * (1 + (isLBBB ? 0.3 : p.lvh * 0.4));
  }

  // --- Assemble events ---
  let events: WaveEvent[] = [
    {
      id: 'P',
      centerMs: pOnset + pDur / 2,
      sigmaMs: pDur / 5.0,
      magnitude: pAmp,
      direction: unit(pDir),
    },
    {
      id: 'septal',
      centerMs: qCenter,
      sigmaMs: 0.07 * qrsMs,
      magnitude: 0.16,
      direction: unit(BASE_DIR.septal),
    },
    {
      id: 'R',
      centerMs: rCenter,
      sigmaMs: 0.09 * qrsMs,
      magnitude: 1.5 * p.rAmplitude * rLvh,
      direction: unit(BASE_DIR.R),
    },
    {
      id: 'S',
      centerMs: sCenter,
      sigmaMs: 0.09 * qrsMs,
      magnitude: 0.35 * sLvh,
      direction: unit(BASE_DIR.S),
    },
    {
      id: 'T',
      centerMs: tPeakT,
      sigmaMs: tSigma,
      magnitude: tAmp,
      direction: unit(tDir),
    },
  ];

  // --- Conduction-block morphology (added before the axis rotation) ---
  if (hasRBBB) {
    // Initial septal + LV (R, S) stay normal; add the delayed terminal RV force.
    events.push({
      id: 'rbbTerm',
      centerMs: qrsOnset + 0.82 * qrsMs,
      sigmaMs: 0.13 * qrsMs,
      magnitude: 0.65,
      direction: unit({ x: -0.31, y: 0.0, z: -0.92 }), // mostly anterior, mildly right -> tall R' in V1, modest axis shift
    });
  }
  if (isLBBB) {
    // Drop the normal septal q; broaden/slur the leftward LV depolarisation.
    events = events
      .filter((e) => e.id !== 'septal')
      .map((e) => {
        if (e.id === 'R')
          return {
            ...e,
            sigmaMs: e.sigmaMs * 1.7,
            magnitude: e.magnitude * 1.15,
            direction: unit({ x: 0.5, y: 0.35, z: 0.62 }),
          };
        if (e.id === 'S') return { ...e, magnitude: e.magnitude * 0.25 };
        return e;
      });
    events.push({
      id: 'lbbInit',
      centerMs: qrsOnset + 0.12 * qrsMs,
      sigmaMs: 0.09 * qrsMs,
      magnitude: 0.18,
      direction: unit({ x: 0.4, y: 0.2, z: 0.5 }), // leftward initial -> no q, V1 starts negative
    });
    events.push({
      id: 'lbbNotch',
      centerMs: qrsOnset + 0.6 * qrsMs,
      sigmaMs: 0.12 * qrsMs,
      magnitude: 0.6,
      direction: unit({ x: 0.52, y: 0.3, z: 0.55 }), // notched broad leftward R
    });
  }

  if (wpw > 0) {
    // Delta wave: a broad, slurred initial force (pre-excited myocardium
    // depolarising slowly, cell-to-cell), fused with the normal QRS.
    events.push({
      id: 'delta',
      centerMs: qrsOnset + 0.16 * qrsMs,
      sigmaMs: 0.22 * qrsMs,
      magnitude: 0.5 * wpw,
      direction: unit({ x: 0.35, y: 0.45, z: 0.2 }),
    });
  }

  // --- Axis rotation (applied to all depolarisation events) ---
  // A fascicular block sets the axis; otherwise LVH biases it left and an
  // explicit target overrides.
  const lvhAxisShift = -p.lvh * 20;
  const targetAxis =
    blockAxis != null
      ? blockAxis
      : p.qrsAxisDeg != null
        ? p.qrsAxisDeg
        : naturalQrsAxis(events) + lvhAxisShift;
  const delta = (targetAxis - naturalQrsAxis(events)) * DEG;
  if (Math.abs(delta) > 1e-6) {
    events = events.map((e) =>
      e.id === 'P' || e.id === 'T' || e.id === 'st'
        ? e
        : { ...e, direction: rotateFrontal(e.direction, delta) },
    );
  }

  // --- STEMI injury current (ST-segment elevation toward the infarct wall) ---
  if (p.stemi !== 'none') {
    const stSpan = tEnd - qrsEnd;
    events.push({
      id: 'st',
      centerMs: qrsEnd + 0.35 * stSpan,
      sigmaMs: 0.32 * stSpan,
      magnitude: 0.28,
      direction: unit(STEMI_DIR[p.stemi]),
    });
  }

  const label =
    block !== 'none'
      ? `Sinus rhythm · ${block}`
      : wpw > 0
        ? 'Sinus rhythm · WPW pre-excitation'
        : p.stemi !== 'none'
          ? `Sinus rhythm · ${p.stemi} STEMI`
          : 'Sinus rhythm';

  return {
    events,
    landmarks,
    label,
    block: block === 'none' ? undefined : block,
    preExcited: wpw > 0 ? true : undefined,
    stemi: p.stemi === 'none' ? undefined : p.stemi,
  };
}

/** Natural mean frontal QRS axis (deg) from the area-weighted QRS events. */
function naturalQrsAxis(events: WaveEvent[]): number {
  const SQRT_2PI = Math.sqrt(2 * Math.PI);
  let x = 0;
  let y = 0;
  for (const e of events) {
    if (e.id === 'P' || e.id === 'T' || e.id === 'st') continue; // QRS events only
    const area = e.magnitude * e.sigmaMs * SQRT_2PI;
    x += area * e.direction.x;
    y += area * e.direction.y;
  }
  return Math.atan2(y, x) / DEG;
}
