# Cardiac Vector Engine (ECG teaching module)

An interactive ECG teaching tool for cardiology fellows. The route lives at
**`/ecg`** and is open (no login required); it coexists with the QI tracker in
this repo and does not depend on Supabase.

## The keystone: one clock, one vector, three views

Everything is a projection of a single source of truth — the heart's
instantaneous electrical **dipole vector `m(t)`** in Frank (X, Y, Z)
coordinates, evaluated on one deterministic clock:

- **Conduction view** — the wavefront that *produces* `m(t)` (SA → atria → AV
  delay → His-Purkinje → ventricles → repolarization), read from the same
  cycle landmarks.
- **Axis vector view** — `m(t)` on the hexaxial reference, with its live
  projection onto each lead axis drawn as a coloured "shadow", plus the VCG
  loops and mean QRS axis.
- **12-lead tracing** — each lead's deflection at time `t` *is* the projection
  of `m(t)` onto that lead's axis. This is why one event looks different in
  every lead — the app shows it rather than asserting it.

## How the 12 leads are derived

- **Limb leads (I, II, III, aVR, aVL, aVF)** — exact Einthoven–Goldberger
  geometry applied to the frontal (X, Y) component. Einthoven's law
  `II = I + III` holds identically (verified to machine precision), so the
  vector view's shadows equal the limb tracings exactly.
- **Precordial leads (V1–V6)** — the published **Dower transformation matrix**
  applied to the full 3-D vector (the validated XYZ→12-lead projection).

## Fidelity invariants (hard-coded, not eyeballed)

- 25 mm/s, 10 mm/mV; small box 0.04 s / 0.1 mV; large box 0.2 s / 0.5 mV.
- Intervals (PR, QRS, QT/QTc-Bazett) are read from the **same landmarks** that
  drive the animation, so the clock and the displayed numbers agree to the ms.

## Sources

- McSharry & Clifford, *A dynamical model for generating synthetic
  electrocardiogram signals*, IEEE TBME 50(3):289–294, 2003 (ECGSYN) — the
  sum-of-Gaussians wave model, here generalised to a directed 3-D vector.
- Dower transformation matrix (Frank XYZ → 12-lead), as tabulated in the
  inverse-Dower literature (Edenbrandt & Pahlm, *J Electrocardiol* 1988;21(4))
  and reproduced widely.
- Standard hexaxial reference angles and AHA/ACC ECG calibration standards.

## Layout

```
engine/            framework-agnostic, pure TS — the source of truth
  constants.ts     calibration, hexaxial angles, Dower matrix, normal ranges
  normalSinus.ts   the cycle builder + Tier-1 morphology (axis, K+, LVH, atria)
  vector.ts        m(t) evaluation + QRS area vector
  leads.ts         projection to 12 leads + intervals/axis + Sokolow-Lyon
  conduction.ts    conduction-system phase from the same timeline
  rhythm.ts        multi-beat AV-conduction timeline (Tier-2 blocks)
curriculum.ts      Tier-1 module definitions (focus presets + teaching notes)
ui/                React/SVG renderers (Conduction, Vector, Tracing, EcgPaper,
                   ParameterLab, RhythmLab, RhythmStrip)
useCardiacClock.ts the single shared rAF clock
```

## Verifying the engine

```bash
npm run ecg:check
```

Compiles the engine and runs physiological assertions: exact intervals,
Einthoven/Goldberger laws, R-wave progression (V1 rS → V6 qR), P-wave polarity,
isoelectric diastole, and the conduction phase mapping.

## Roadmap

- **Phase 0 (done)** — vector engine + single-lead projection on normal sinus.
- **Phase 1 (done)** — all three views synchronized on sinus.
- **Phase 2 (done)** — parameter lab (axis, hyperkalaemia, LVH, atrial
  enlargement) + Tier-1 modules, plus a Tier-2 AV-conduction rhythm lab
  (1°, Mobitz I/II, complete block) on the multi-beat timeline.
- **Phase 3** — real-data case mode (PhysioNet), more Tier-2 (bundle/fascicular
  blocks, pre-excitation, reentry, wide-complex tachycardia, ischaemia,
  channelopathies, paced rhythms), progression/persistence in Supabase.
