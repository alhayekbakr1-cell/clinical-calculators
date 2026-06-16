/**
 * conduction.ts — The conduction-system view, derived from the SAME timeline.
 *
 * No independent clock: the wavefront that "produces" m(t) is just a reading of
 * where we are between the cycle landmarks. SA fires at P onset; the AV node
 * holds during the PR segment; His-Purkinje fires at QRS onset; the ventricles
 * depolarize through the QRS; the T wave is ventricular repolarization.
 */

import type {
  CardiacModel,
  ConductionPhaseId,
  ConductionState,
} from './types';

const SA_FRACTION = 0.15; // first 15% of the P wave = SA fire + RA
const HIS_FRACTION = 0.18; // first 18% of the QRS = His/Purkinje pre-myocardial

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

const LABELS: Record<ConductionPhaseId, string> = {
  saFire: 'SA node fires',
  atrial: 'Atrial depolarization',
  avDelay: 'AV nodal delay',
  avBlocked: 'AV block — beat dropped',
  hisPurkinje: 'His-Purkinje conduction',
  ventricular: 'Ventricular depolarization',
  plateau: 'Ventricular plateau (ST)',
  repolarization: 'Ventricular repolarization',
  diastole: 'Electrical diastole',
};

export function conductionAt(model: CardiacModel, tMs: number): ConductionState {
  const L = model.landmarks;
  let t = tMs % L.rrMs;
  if (t < 0) t += L.rrMs;

  const pDur = L.pEnd - L.pOnset;
  const qrsDur = L.qrsEnd - L.qrsOnset;

  // --- P wave: SA fire then atrial spread ---
  if (t < L.pEnd) {
    const f = (t - L.pOnset) / pDur;
    if (f < SA_FRACTION) {
      return {
        phase: 'saFire',
        progress: clamp01(f / SA_FRACTION),
        label: LABELS.saFire,
        active: ['sa', 'ra'],
      };
    }
    return {
      phase: 'atrial',
      progress: clamp01((f - SA_FRACTION) / (1 - SA_FRACTION)),
      label: LABELS.atrial,
      active: ['ra', 'la'],
    };
  }

  // --- PR segment: AV node holding ---
  if (t < L.qrsOnset) {
    return {
      phase: 'avDelay',
      progress: clamp01((t - L.pEnd) / (L.qrsOnset - L.pEnd)),
      label: LABELS.avDelay,
      active: ['av'],
    };
  }

  // --- QRS: His-Purkinje then ventricular myocardium ---
  if (t < L.qrsEnd) {
    const f = (t - L.qrsOnset) / qrsDur;
    const b = model.block ?? '';
    const rbbBlocked = b.startsWith('RBBB');
    const lbbBlocked = b === 'LBBB';
    if (f < HIS_FRACTION) {
      // The blocked bundle does not conduct down the His-Purkinje system.
      const active = ['his', 'purkinje'];
      if (!lbbBlocked) active.push('lbb');
      if (!rbbBlocked) active.push('rbb');
      return {
        phase: 'hisPurkinje',
        progress: clamp01(f / HIS_FRACTION),
        label: LABELS.hisPurkinje,
        active,
      };
    }
    const vp = clamp01((f - HIS_FRACTION) / (1 - HIS_FRACTION));
    // With a bundle block the affected ventricle depolarises late (cell-to-cell).
    let active = ['septum', 'lv', 'rv'];
    if (rbbBlocked) active = vp < 0.5 ? ['septum', 'lv'] : ['septum', 'lv', 'rv'];
    else if (lbbBlocked) active = vp < 0.5 ? ['septum', 'rv'] : ['septum', 'rv', 'lv'];
    return { phase: 'ventricular', progress: vp, label: LABELS.ventricular, active };
  }

  // --- ST plateau ---
  if (t < L.tOnset) {
    return {
      phase: 'plateau',
      progress: clamp01((t - L.qrsEnd) / Math.max(1, L.tOnset - L.qrsEnd)),
      label: LABELS.plateau,
      active: ['lv', 'rv'],
    };
  }

  // --- T wave: repolarization ---
  if (t < L.tEnd) {
    return {
      phase: 'repolarization',
      progress: clamp01((t - L.tOnset) / (L.tEnd - L.tOnset)),
      label: LABELS.repolarization,
      active: ['ventRepol'],
    };
  }

  // --- Diastole ---
  return {
    phase: 'diastole',
    progress: clamp01((t - L.tEnd) / Math.max(1, L.rrMs - L.tEnd)),
    label: LABELS.diastole,
    active: [],
  };
}
