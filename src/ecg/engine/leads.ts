/**
 * leads.ts — Project the one heart vector onto the 12 lead axes.
 *
 * Limb leads: exact hexaxial / Einthoven-Goldberger geometry from the frontal
 *   (x, y) component. This guarantees Einthoven's law (II = I + III) and makes
 *   the vector view's projection "shadows" equal the limb tracings exactly.
 * Precordial leads: the published Dower transform from the full (x, y, z).
 */

import {
  DOWER_PRECORDIAL,
  LIMB_LEAD_ANGLES_DEG,
  type LeadName,
  type LimbLeadName,
} from './constants';
import type {
  CardiacModel,
  LeadVoltages,
  Measurements,
  Vec3,
} from './types';
import { heartVectorAt, qrsAreaVector } from './vector';

const DEG = Math.PI / 180;

/** Project a frontal vector (x:left, y:inferior) onto a hexaxial lead axis. */
export function frontalProjection(
  x: number,
  y: number,
  lead: LimbLeadName,
): number {
  const a = LIMB_LEAD_ANGLES_DEG[lead] * DEG;
  return x * Math.cos(a) + y * Math.sin(a);
}

/** All 12 lead voltages (mV) for a given heart vector. */
export function projectToLeads(m: Vec3): LeadVoltages {
  // Limb leads from the frontal plane, via Einthoven + Goldberger.
  const I = m.x; // projection onto 0deg axis
  const II = frontalProjection(m.x, m.y, 'II'); // 60deg
  const III = II - I; // Einthoven
  const aVR = -(I + II) / 2; // Goldberger
  const aVL = (I - III) / 2;
  const aVF = (II + III) / 2;

  // Precordials from the Dower transform on (x, y, z).
  const dower = (row: readonly [number, number, number]) =>
    row[0] * m.x + row[1] * m.y + row[2] * m.z;

  return {
    I,
    II,
    III,
    aVR,
    aVL,
    aVF,
    V1: dower(DOWER_PRECORDIAL.V1),
    V2: dower(DOWER_PRECORDIAL.V2),
    V3: dower(DOWER_PRECORDIAL.V3),
    V4: dower(DOWER_PRECORDIAL.V4),
    V5: dower(DOWER_PRECORDIAL.V5),
    V6: dower(DOWER_PRECORDIAL.V6),
  };
}

/** Convenience: lead voltages directly from a model at time t. */
export function leadsAt(model: CardiacModel, tMs: number): LeadVoltages {
  return projectToLeads(heartVectorAt(model, tMs));
}

/** Sample one lead across the whole cycle into `n` points (mV). */
export function sampleLead(
  model: CardiacModel,
  lead: LeadName,
  n: number,
): number[] {
  const rr = model.landmarks.rrMs;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const t = (i / n) * rr;
    out[i] = projectToLeads(heartVectorAt(model, t))[lead];
  }
  return out;
}

/** Derived interval / axis read-outs. All authoritative from landmarks. */
export function measure(model: CardiacModel): Measurements {
  const L = model.landmarks;
  const rrSec = L.rrMs / 1000;
  const qtMs = L.tEnd - L.qrsOnset;

  const area = qrsAreaVector(model);
  const frontalAxisDeg = Math.round(Math.atan2(area.y, area.x) / DEG);

  return {
    rateBpm: Math.round(60000 / L.rrMs),
    prMs: Math.round(L.qrsOnset - L.pOnset),
    qrsMs: Math.round(L.qrsEnd - L.qrsOnset),
    qtMs: Math.round(qtMs),
    qtcMs: Math.round(qtMs / Math.sqrt(rrSec)),
    pDurationMs: Math.round(L.pEnd - L.pOnset),
    frontalAxisDeg,
  };
}
