/**
 * vector.ts — Evaluate the instantaneous cardiac dipole vector m(t).
 *
 * m(t) is the single source of truth. Everything else (conduction view,
 * hexaxial vector view, 12-lead tracing) is a pure function of this.
 */

import type { CardiacModel, Vec3 } from './types';

/** Minimal signed distance between two phases on a circle of length rr. */
function circularDelta(t: number, center: number, rr: number): number {
  let d = t - center;
  while (d > rr / 2) d -= rr;
  while (d < -rr / 2) d += rr;
  return d;
}

/**
 * The heart's electrical dipole vector at time t (ms within the cycle).
 * Sum of every directed Gaussian wave event, evaluated with wraparound so the
 * tails of T (late) and P (early) join smoothly across the cycle boundary.
 */
export function heartVectorAt(model: CardiacModel, tMs: number): Vec3 {
  const rr = model.landmarks.rrMs;
  // Normalize t into [0, rr).
  let t = tMs % rr;
  if (t < 0) t += rr;

  let x = 0;
  let y = 0;
  let z = 0;
  for (const e of model.events) {
    const d = circularDelta(t, e.centerMs, rr);
    const g = Math.exp(-(d * d) / (2 * e.sigmaMs * e.sigmaMs));
    if (g < 1e-4) continue; // negligible contribution
    const a = e.magnitude * g;
    x += a * e.direction.x;
    y += a * e.direction.y;
    z += a * e.direction.z;
  }
  return { x, y, z };
}

/** Magnitude of a 3D vector. */
export function magnitude(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

/**
 * Net QRS "area vector" in 3D — the integral of each QRS event over time
 * (Gaussian integral = magnitude * sigma * sqrt(2*pi)). Used for the mean
 * electrical axis. P and T are excluded; only depolarization events count.
 */
export function qrsAreaVector(model: CardiacModel): Vec3 {
  const SQRT_2PI = Math.sqrt(2 * Math.PI);
  let x = 0;
  let y = 0;
  let z = 0;
  for (const e of model.events) {
    // QRS depolarisation events only (exclude P, T and the ST injury vector).
    if (e.id === 'P' || e.id === 'T' || e.id === 'st') continue;
    const area = e.magnitude * e.sigmaMs * SQRT_2PI;
    x += area * e.direction.x;
    y += area * e.direction.y;
    z += area * e.direction.z;
  }
  return { x, y, z };
}
