/**
 * types.ts — Shared types for the cardiac vector engine.
 */

import type { LeadName } from './constants';

/** A 3D vector in Frank lead coordinates.
 *  x: + toward patient LEFT
 *  y: + toward patient FEET (inferior)
 *  z: + toward patient BACK (posterior)
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * A single electrical "event" — one Gaussian-shaped deflection of the heart's
 * dipole vector, placed at a fixed phase of the cardiac cycle and pointing in
 * a fixed 3D direction. Summing all active events at time t gives m(t).
 *
 * This is the vector generalization of the ECGSYN sum-of-Gaussians model
 * (McSharry & Clifford, IEEE TBME 2003): each P-Q-R-S-T deflection is a
 * Gaussian "bump", here additionally given a physiologic 3D direction so the
 * 12 leads fall out as projections rather than being synthesized separately.
 */
export interface WaveEvent {
  id: string; // 'P' | 'Q' | 'R' | 'S' | 'T' | 'septal' ...
  centerMs: number; // time of the Gaussian peak within the cycle
  sigmaMs: number; // Gaussian width (standard deviation, ms)
  magnitude: number; // peak vector length (in vector units ~ mV)
  direction: Vec3; // unit-ish direction; normalized at build time
}

/** Named landmarks of the cycle (ms from cycle start = P onset). */
export interface CycleLandmarks {
  pOnset: number;
  pEnd: number;
  qrsOnset: number;
  qrsEnd: number;
  tOnset: number;
  tEnd: number;
  rrMs: number; // total cycle length
}

/** A complete, self-consistent description of one cardiac cycle. */
export interface CardiacModel {
  events: WaveEvent[];
  landmarks: CycleLandmarks;
  label: string;
  /** Conduction block in effect (for the conduction view), e.g. 'RBBB'. */
  block?: string;
  /** Ventricular pre-excitation (WPW) active — for the conduction view. */
  preExcited?: boolean;
  /** Active STEMI territory (for annotations), e.g. 'inferior'. */
  stemi?: string;
}

/** Conduction-system phase, derived from the same timeline. */
export type ConductionPhaseId =
  | 'saFire'
  | 'atrial'
  | 'avDelay'
  | 'avBlocked'
  | 'hisPurkinje'
  | 'ventricular'
  | 'plateau'
  | 'repolarization'
  | 'diastole';

export interface ConductionState {
  phase: ConductionPhaseId;
  /** 0..1 progress within the current phase. */
  progress: number;
  label: string;
  /** Structures that are actively conducting / depolarized right now. */
  active: string[];
}

/** Derived interval/axis read-outs for one model (all in ms / degrees). */
export interface Measurements {
  rateBpm: number;
  prMs: number;
  qrsMs: number;
  qtMs: number;
  qtcMs: number; // Bazett
  pDurationMs: number;
  frontalAxisDeg: number; // mean QRS axis in the frontal plane
}

export type LeadVoltages = Record<LeadName, number>;
