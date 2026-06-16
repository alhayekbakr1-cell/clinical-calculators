/**
 * normalSinus.ts — The normal-sinus-rhythm parameter set.
 *
 * This is the Phase-0 ground truth: one cycle of normal sinus, expressed as a
 * set of directed Gaussian wave events plus explicit timing landmarks. Timing
 * landmarks (PR, QRS, QT) are authoritative — the read-outs and the animation
 * clock both read them, so they agree to the millisecond by construction.
 *
 * Directions are in Frank coordinates (x:left+, y:inferior+, z:posterior+) and
 * encode standard activation physiology:
 *   P      atria depolarize  -> left, inferior, slightly anterior
 *   septal septum L->R       -> right, superior, anterior (gives r in V1, q in V6)
 *   R      main ventricular  -> left, inferior, posterior (tall R laterally, S in V1)
 *   S      basal/terminal    -> right, superior, posterior
 *   T      repolarization     -> left, inferior, anterior (concordant, upright)
 */

import type { CardiacModel, CycleLandmarks, Vec3, WaveEvent } from './types';

function unit(v: Vec3): Vec3 {
  const m = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / m, y: v.y / m, z: v.z / m };
}

export interface SinusParams {
  rateBpm: number; // sinus rate
  prMs: number; // PR interval (P onset -> QRS onset)
  qrsMs: number; // QRS duration
  pDurationMs: number; // P-wave duration
  qtcMs: number; // target Bazett-corrected QT
  // Morphology scalers (1 = normal); reserved for Tier-2 sliders.
  rAmplitude: number;
  tAmplitude: number;
  pAmplitude: number;
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
};

/** Build a fully self-consistent single cycle of normal sinus rhythm. */
export function buildNormalSinus(partial: Partial<SinusParams> = {}): CardiacModel {
  const p = { ...DEFAULT_SINUS, ...partial };

  const rrMs = 60000 / p.rateBpm;
  const rrSec = rrMs / 1000;

  // --- Landmarks (ms from cycle start = P onset) ---
  const pOnset = 0;
  const pEnd = pOnset + p.pDurationMs;
  const qrsOnset = pOnset + p.prMs;
  const qrsEnd = qrsOnset + p.qrsMs;

  // Bazett: QTc = QT / sqrt(RR_sec)  ->  QT = QTc * sqrt(RR_sec)
  const qtMs = p.qtcMs * Math.sqrt(rrSec);
  const tEnd = qrsOnset + qtMs;

  // Place the T wave inside the ST..tEnd window.
  const tPeak = qrsEnd + 0.55 * (tEnd - qrsEnd);
  const tSigma = (tEnd - tPeak) / 2.3; // tail reaches ~tEnd at +2.3 sigma
  const tOnset = Math.max(qrsEnd, tPeak - 2.3 * tSigma);

  const landmarks: CycleLandmarks = {
    pOnset,
    pEnd,
    qrsOnset,
    qrsEnd,
    tOnset,
    tEnd,
    rrMs,
  };

  // --- QRS sub-event timing (within the QRS window) ---
  const qCenter = qrsOnset + 0.1 * p.qrsMs;
  const rCenter = qrsOnset + 0.33 * p.qrsMs;
  const sCenter = qrsOnset + 0.62 * p.qrsMs;

  const events: WaveEvent[] = [
    {
      id: 'P',
      centerMs: pOnset + p.pDurationMs / 2,
      sigmaMs: p.pDurationMs / 5.0,
      magnitude: 0.18 * p.pAmplitude,
      direction: unit({ x: 0.5, y: 0.8, z: -0.1 }),
    },
    {
      id: 'septal',
      centerMs: qCenter,
      sigmaMs: 0.07 * p.qrsMs,
      magnitude: 0.16,
      direction: unit({ x: -0.6, y: -0.5, z: -0.6 }),
    },
    {
      id: 'R',
      centerMs: rCenter,
      sigmaMs: 0.09 * p.qrsMs,
      magnitude: 1.5 * p.rAmplitude,
      direction: unit({ x: 0.45, y: 0.55, z: 0.5 }),
    },
    {
      id: 'S',
      centerMs: sCenter,
      sigmaMs: 0.09 * p.qrsMs,
      magnitude: 0.35,
      direction: unit({ x: -0.4, y: -0.4, z: 0.5 }),
    },
    {
      id: 'T',
      centerMs: tPeak,
      sigmaMs: tSigma,
      magnitude: 0.45 * p.tAmplitude,
      direction: unit({ x: 0.4, y: 0.5, z: -0.5 }),
    },
  ];

  return { events, landmarks, label: 'Normal sinus rhythm' };
}
