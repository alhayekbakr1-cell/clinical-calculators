/**
 * constants.ts — Hard, sourced numeric invariants for the ECG engine.
 *
 * Nothing in this file is eyeballed. Every value is either a calibration
 * standard, a textbook geometric definition, or a published transform.
 * Sources are cited inline so a fellow (or a reviewer) can check them.
 */

// ---------------------------------------------------------------------------
// 1. Paper / calibration invariants (universal clinical ECG standard)
//    AHA/ACC recommendations for standardization of the ECG.
// ---------------------------------------------------------------------------
export const CALIBRATION = {
  paperSpeedMmPerSec: 25, // standard sweep speed
  gainMmPerMv: 10, // standard amplitude calibration (10 mm = 1 mV)
  smallBoxSec: 0.04, // 1 mm horizontally = 40 ms
  smallBoxMv: 0.1, // 1 mm vertically = 0.1 mV
  bigBoxSec: 0.2, // 5 mm horizontally = 200 ms
  bigBoxMv: 0.5, // 5 mm vertically = 0.5 mV
} as const;

// ---------------------------------------------------------------------------
// 2. Frontal-plane (hexaxial) lead axis angles, in degrees.
//    Convention: 0deg points to the patient's LEFT (Lead I direction);
//    positive angles rotate DOWNWARD (toward the feet, i.e. +90deg = aVF).
//    This is the standard hexaxial reference system.
// ---------------------------------------------------------------------------
export const LIMB_LEAD_ANGLES_DEG = {
  I: 0,
  II: 60,
  III: 120,
  aVR: -150, // equivalently +210
  aVL: -30,
  aVF: 90,
} as const;

export type LimbLeadName = keyof typeof LIMB_LEAD_ANGLES_DEG;

// ---------------------------------------------------------------------------
// 3. Dower transformation matrix: Frank orthogonal leads (X, Y, Z) -> ECG.
//    Each row is [cX, cY, cZ] so that lead = cX*X + cY*Y + cZ*Z.
//    Row order: V1, V2, V3, V4, V5, V6, I, II.
//
//    Source: Dower GE et al., "Deriving the 12-lead electrocardiogram from
//    four (EASI) electrodes" / the original Dower synthesis matrix as
//    tabulated in the inverse-Dower literature (Edenbrandt & Pahlm,
//    J Electrocardiol 1988;21(4):361-7) and reproduced widely, e.g.
//    Frontiers Physiol 2022 "Review of Processing Pathological VCG Records".
//
//    We use ONLY the precordial rows (V1..V6) here; the limb leads are
//    derived from the exact hexaxial/Goldberger geometry instead (leads.ts),
//    so that the vector-projection "shadows" equal the limb tracings exactly.
// ---------------------------------------------------------------------------
export const DOWER_PRECORDIAL: Record<
  'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6',
  readonly [number, number, number]
> = {
  V1: [-0.515, 0.157, -0.917],
  V2: [0.044, 0.164, -1.387],
  V3: [0.882, 0.098, -1.277],
  V4: [1.213, 0.127, -0.601],
  V5: [1.125, 0.127, -0.086],
  V6: [0.831, 0.076, 0.23],
} as const;

// Full canonical 12-lead order used everywhere for display.
export const LEAD_ORDER = [
  'I',
  'II',
  'III',
  'aVR',
  'aVL',
  'aVF',
  'V1',
  'V2',
  'V3',
  'V4',
  'V5',
  'V6',
] as const;

export type LeadName = (typeof LEAD_ORDER)[number];

// Standard print layout: 4 columns x 3 rows (the way a real 12-lead prints).
export const LEAD_GRID: LeadName[][] = [
  ['I', 'aVR', 'V1', 'V4'],
  ['II', 'aVL', 'V2', 'V5'],
  ['III', 'aVF', 'V3', 'V6'],
];

// Coronary territory grouping (for Tier-1 lead-groups module / future use).
export const LEAD_GROUPS = {
  inferior: ['II', 'III', 'aVF'],
  lateral: ['I', 'aVL', 'V5', 'V6'],
  anterior: ['V3', 'V4'],
  septal: ['V1', 'V2'],
} as const;

// ---------------------------------------------------------------------------
// 4. Normal reference ranges (ms / degrees) used for read-outs and gating.
//    Standard adult resting ECG reference values.
// ---------------------------------------------------------------------------
export const NORMAL_RANGES = {
  prMs: [120, 200] as const,
  qrsMs: [70, 110] as const, // < 120 ms is "narrow"
  qtcMs: [350, 450] as const, // Bazett-corrected, broad adult range
  pDurationMs: [80, 110] as const,
  axisDeg: [-30, 90] as const, // normal frontal QRS axis
  rateBpm: [60, 100] as const,
} as const;
