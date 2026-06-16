/**
 * curriculum.ts — Tier-1 module scaffolding.
 *
 * Each module loads a parameter "focus" into the lab and shows a teaching note.
 * Unlock/progression gating (module completed + check passed) is Phase 3
 * (Supabase); for now every Tier-1 module is open.
 */

import type { SinusParams } from './engine';

export type LabParams = {
  rateBpm: number;
  prMs: number;
  qrsAxisDeg: number | null; // null = natural
  potassiumMmol: number;
  lvh: number;
  lvStrain: boolean;
  atrial: SinusParams['atrial'];
};

export const NORMAL_PARAMS: LabParams = {
  rateBpm: 72,
  prMs: 160,
  qrsAxisDeg: null,
  potassiumMmol: 4.0,
  lvh: 0,
  lvStrain: false,
  atrial: 'none',
};

export interface Module {
  id: string;
  tier: 1 | 2;
  title: string;
  short: string;
  note: string;
  preset: Partial<LabParams>;
}

export const TIER1: Module[] = [
  {
    id: 'genesis',
    tier: 1,
    title: 'Conduction & waveform genesis',
    short: 'Where each wave comes from',
    note: 'Scrub slowly through one beat. Each deflection on the tracing is the projection of the same vector m(t): the P wave is atrial depolarisation, the PR segment is the AV nodal delay (the vector is quiet), the QRS is ventricular depolarisation, and the T wave is repolarisation. Watch the conduction wavefront and the vector arrow move together.',
    preset: { ...NORMAL_PARAMS },
  },
  {
    id: 'calibration',
    tier: 1,
    title: 'Paper & calibration',
    short: '25 mm/s · 10 mm/mV',
    note: 'The grid is exact: 1 small box = 0.04 s wide and 0.1 mV tall; 1 large box = 0.20 s and 0.5 mV. The calibration pulse at the left of the rhythm strip is 1 mV (10 mm) tall. Every interval you measure is read from the same landmarks that drive the animation.',
    preset: { ...NORMAL_PARAMS },
  },
  {
    id: 'rate',
    tier: 1,
    title: 'Rate',
    short: 'The 300 rule & RR',
    note: 'At 25 mm/s, rate = 300 / (large boxes between R waves) = 1500 / (small boxes). Move the rate slider and count: at 100 bpm the R waves are 3 large boxes apart; at 75 bpm, 4 boxes. QT shortens as rate rises (the QTc holds).',
    preset: { ...NORMAL_PARAMS, rateBpm: 100 },
  },
  {
    id: 'axis',
    tier: 1,
    title: 'Mean QRS axis',
    short: 'Rotate it, watch leads flip',
    note: 'The mean axis is the direction of the net QRS vector in the frontal plane (normal -30° to +90°). Override the axis and watch the limb-lead projections flip sign: with left axis deviation, aVF turns negative; with right axis deviation, lead I turns negative. The amber dashed line is the mean axis.',
    preset: { ...NORMAL_PARAMS, qrsAxisDeg: -45 },
  },
  {
    id: 'intervals',
    tier: 1,
    title: 'Intervals (PR, QRS, QT)',
    short: 'PR / QRS / QTc gating',
    note: 'PR (120–200 ms) is P onset to QRS onset — mostly AV nodal delay. Lengthen PR past 200 ms and the read-out flags first-degree AV block while the wavefront lingers at the AV node. QRS should stay narrow (<120 ms); QT is rate-corrected (Bazett).',
    preset: { ...NORMAL_PARAMS, prMs: 240 },
  },
  {
    id: 'lvh',
    tier: 1,
    title: 'Chamber enlargement — LVH',
    short: 'Sokolow-Lyon voltage',
    note: 'Left ventricular hypertrophy increases QRS voltage: the Sokolow-Lyon index (S in V1 + R in V5/V6) rises ≥ 3.5 mV (35 mm). Add the strain pattern and the lateral T waves invert (discordant to the QRS). The axis also tends to shift leftward.',
    preset: { ...NORMAL_PARAMS, lvh: 0.9, lvStrain: true },
  },
  {
    id: 'atrial',
    tier: 1,
    title: 'Chamber enlargement — atria',
    short: 'P-wave morphology',
    note: 'The P wave is atrial depolarisation: right atrial enlargement makes it tall and peaked (P pulmonale, best in II); left atrial enlargement makes it broad (P mitrale) with a terminal posterior force (negative terminal P in V1). Toggle the atrial pattern and inspect the P in II and V1.',
    preset: { ...NORMAL_PARAMS, atrial: 'biatrial' },
  },
  {
    id: 'hyperk',
    tier: 1,
    title: 'Electrolytes — hyperkalaemia',
    short: 'Peaked T → wide QRS',
    note: 'Raise the potassium and watch the classic progression: first tall, peaked, narrow T waves (~5.5–6.5), then the P wave flattens and PR lengthens (~6.5–7.5), then the QRS widens toward a sine wave (>7.5). All three views respond to the same parameter.',
    preset: { ...NORMAL_PARAMS, potassiumMmol: 7.5 },
  },
  {
    id: 'leadgroups',
    tier: 1,
    title: 'Lead groups & coronary territories',
    short: 'Inferior / lateral / anterior / septal',
    note: 'Leads are grouped by the wall they view: inferior (II, III, aVF — usually RCA), lateral (I, aVL, V5, V6 — circumflex), anterior (V3, V4 — LAD) and septal (V1, V2 — LAD). Contiguous changes in one group localise ischaemia to that territory.',
    preset: { ...NORMAL_PARAMS },
  },
];
