/* Runtime sanity check for the cardiac vector engine.
 * Run via `npm run ecg:check` (compiles the engine to ./.ecgcheck first). */
const path = require('path');
const E = require(path.resolve(process.cwd(), '.ecgcheck/index.js'));

let failures = 0;
function check(name, cond, detail) {
  const ok = !!cond;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ::  ' + detail : ''}`);
}
function approx(a, b, eps = 1e-9) {
  return Math.abs(a - b) <= eps;
}

const model = E.buildNormalSinus();
const m = E.measure(model);
console.log('\n--- Measurements (normal sinus, default) ---');
console.log(m);

console.log('\n--- Interval / axis fidelity ---');
check('rate = 72 bpm', m.rateBpm === 72, `${m.rateBpm}`);
check('PR = 160 ms', m.prMs === 160, `${m.prMs}`);
check('QRS = 92 ms', m.qrsMs === 92, `${m.qrsMs}`);
check('QRS is narrow (<120)', m.qrsMs < 120, `${m.qrsMs}`);
check('PR in normal range 120-200', m.prMs >= 120 && m.prMs <= 200, `${m.prMs}`);
check('QTc in normal range 350-450', m.qtcMs >= 350 && m.qtcMs <= 450, `${m.qtcMs}`);
check('Frontal axis normal (-30..90)', m.frontalAxisDeg >= -30 && m.frontalAxisDeg <= 90, `${m.frontalAxisDeg} deg`);

console.log('\n--- Einthoven & Goldberger laws (sampled across cycle) ---');
let einthovenMax = 0, avrMax = 0, avlMax = 0, avfMax = 0;
for (let t = 0; t < model.landmarks.rrMs; t += 7) {
  const L = E.leadsAt(model, t);
  einthovenMax = Math.max(einthovenMax, Math.abs(L.II - (L.I + L.III)));
  avrMax = Math.max(avrMax, Math.abs(L.aVR - -(L.I + L.II) / 2));
  avlMax = Math.max(avlMax, Math.abs(L.aVL - (L.I - L.III) / 2));
  avfMax = Math.max(avfMax, Math.abs(L.aVF - (L.II + L.III) / 2));
}
check("Einthoven: II = I + III everywhere", einthovenMax < 1e-9, `maxerr ${einthovenMax.toExponential(2)}`);
check('Goldberger aVR = -(I+II)/2', avrMax < 1e-9, `maxerr ${avrMax.toExponential(2)}`);
check('Goldberger aVL = (I-III)/2', avlMax < 1e-9, `maxerr ${avlMax.toExponential(2)}`);
check('Goldberger aVF = (II+III)/2', avfMax < 1e-9, `maxerr ${avfMax.toExponential(2)}`);

console.log('\n--- Morphology at R-wave peak ---');
// find peak |m| within QRS
let tPeak = model.landmarks.qrsOnset, best = -1;
for (let t = model.landmarks.qrsOnset; t <= model.landmarks.qrsEnd; t += 0.5) {
  const mm = E.magnitude(E.heartVectorAt(model, t));
  if (mm > best) { best = mm; tPeak = t; }
}
const Lr = E.leadsAt(model, tPeak);
console.log('lead voltages at R peak (mV):');
for (const lead of E.LEAD_ORDER) console.log(`  ${lead.padEnd(4)} ${Lr[lead].toFixed(3)}`);
check('Tall R in II', Lr.II > 0.8, `${Lr.II.toFixed(2)} mV`);
check('V1 net negative (rS pattern)', Lr.V1 < 0, `${Lr.V1.toFixed(2)} mV`);
check('V6 net positive (qR pattern)', Lr.V6 > 0, `${Lr.V6.toFixed(2)} mV`);
check('R-wave progression V1<V3<V6', Lr.V1 < Lr.V3 && Lr.V3 < Lr.V6, `V1 ${Lr.V1.toFixed(2)} V3 ${Lr.V3.toFixed(2)} V6 ${Lr.V6.toFixed(2)}`);
check('aVR mostly negative in QRS', Lr.aVR < 0, `${Lr.aVR.toFixed(2)} mV`);

console.log('\n--- P wave polarity (at P peak) ---');
const Lp = E.leadsAt(model, model.landmarks.pOnset + 55);
check('P upright in II', Lp.II > 0, `${Lp.II.toFixed(3)} mV`);
check('P inverted in aVR', Lp.aVR < 0, `${Lp.aVR.toFixed(3)} mV`);

console.log('\n--- Baseline (mid-diastole) is isoelectric ---');
const tDiastole = (model.landmarks.tEnd + model.landmarks.rrMs) / 2;
const Ld = E.leadsAt(model, tDiastole);
let maxBaseline = 0;
for (const lead of E.LEAD_ORDER) maxBaseline = Math.max(maxBaseline, Math.abs(Ld[lead]));
check('All leads ~isoelectric in diastole (<0.05 mV)', maxBaseline < 0.05, `max ${maxBaseline.toFixed(4)} mV`);

console.log('\n--- Conduction phase mapping ---');
const phaseAt = (t) => E.conductionAt(model, t).phase;
check('SA fires at P onset', phaseAt(2) === 'saFire', phaseAt(2));
check('AV delay during PR segment', phaseAt(model.landmarks.pEnd + 10) === 'avDelay');
check('His-Purkinje at QRS onset', phaseAt(model.landmarks.qrsOnset + 1) === 'hisPurkinje');
check('Ventricular mid-QRS', phaseAt((model.landmarks.qrsOnset + model.landmarks.qrsEnd) / 2) === 'ventricular');
check('Repolarization during T', phaseAt((model.landmarks.tOnset + model.landmarks.tEnd) / 2) === 'repolarization');
check('Diastole after T', phaseAt(tDiastole) === 'diastole');

console.log('\n--- Phase 2: morphology transforms ---');
// Axis rotation
const lad = E.buildNormalSinus({ qrsAxisDeg: -30 });
const ladM = E.measure(lad);
check('Axis target -30 honored (+/-3)', Math.abs(ladM.frontalAxisDeg - -30) <= 3, `${ladM.frontalAxisDeg} deg`);
// On left axis deviation, aVF net QRS turns negative; compare QRS peak polarity.
const ladPk = E.qrsPeakAmplitudes(lad);
check('LAD: aVF becomes predominantly negative', ladPk.aVF.s > ladPk.aVF.r, `R ${ladPk.aVF.r.toFixed(2)} vs S ${ladPk.aVF.s.toFixed(2)}`);
const rad = E.measure(E.buildNormalSinus({ qrsAxisDeg: 120 }));
check('Axis target +120 honored (+/-3)', Math.abs(rad.frontalAxisDeg - 120) <= 3, `${rad.frontalAxisDeg} deg`);

// Hyperkalemia (sample at the true T-peak = the T event center)
const tAt = (mdl) => E.leadsAt(mdl, mdl.events.find((e) => e.id === 'T').centerMs).II;
const hyperK = E.buildNormalSinus({ potassiumMmol: 7.5 });
const hyperKsevere = E.buildNormalSinus({ potassiumMmol: 8.5 });
check('Hyperkalemia peaks the T (taller in II)', tAt(hyperK) > tAt(model) * 1.3, `${tAt(model).toFixed(2)} -> ${tAt(hyperK).toFixed(2)} mV`);
const pAmp = (mdl) => E.leadsAt(mdl, mdl.landmarks.pOnset + (mdl.landmarks.pEnd - mdl.landmarks.pOnset) / 2).II;
check('Hyperkalemia flattens the P', pAmp(hyperK) < pAmp(model) * 0.7, `${pAmp(model).toFixed(3)} -> ${pAmp(hyperK).toFixed(3)} mV`);
check('Severe hyperkalemia widens QRS', E.measure(hyperKsevere).qrsMs > E.measure(model).qrsMs + 20, `${E.measure(model).qrsMs} -> ${E.measure(hyperKsevere).qrsMs} ms`);

// LVH
const slNormal = E.sokolowLyonMv(model);
const lvh = E.buildNormalSinus({ lvh: 1, lvStrain: true });
const slLvh = E.sokolowLyonMv(lvh);
check('LVH raises Sokolow-Lyon voltage', slLvh > slNormal * 1.3, `${slNormal.toFixed(2)} -> ${slLvh.toFixed(2)} mV`);
check('Severe LVH meets Sokolow-Lyon (>=3.5 mV)', slLvh >= 3.5, `${slLvh.toFixed(2)} mV`);

// Atrial enlargement
const rae = E.buildNormalSinus({ atrial: 'RAE' });
check('RAE: taller P in II', pAmp(rae) > pAmp(model) * 1.3, `${pAmp(model).toFixed(3)} -> ${pAmp(rae).toFixed(3)} mV`);
const lae = E.buildNormalSinus({ atrial: 'LAE' });
check('LAE: broader P (duration up)', E.measure(lae).pDurationMs > E.measure(model).pDurationMs + 20, `${E.measure(model).pDurationMs} -> ${E.measure(lae).pDurationMs} ms`);

console.log('\n--- Tier-2: bundle / fascicular blocks ---');
const tPeakV6 = (mdl) => E.leadsAt(mdl, mdl.events.find((e) => e.id === 'T').centerMs).V6;

// RBBB: wide QRS, tall terminal R' in V1, wide S in I and V6
const rbbb = E.buildNormalSinus({ conductionBlock: 'RBBB' });
const rbbbPk = E.qrsPeakAmplitudes(rbbb);
const normPk = E.qrsPeakAmplitudes(model);
check('RBBB: QRS wide (>=120 ms)', E.measure(rbbb).qrsMs >= 120, `${E.measure(rbbb).qrsMs} ms`);
check('RBBB: tall R\' in V1', rbbbPk.V1.r > 0.6 && rbbbPk.V1.r > normPk.V1.r * 2, `V1 R ${rbbbPk.V1.r.toFixed(2)} (normal ${normPk.V1.r.toFixed(2)})`);
check('RBBB: wide S in I and V6', rbbbPk.I.s > 0.15 && rbbbPk.V6.s > 0.15, `S I ${rbbbPk.I.s.toFixed(2)} · V6 ${rbbbPk.V6.s.toFixed(2)}`);
check('RBBB: model carries block tag', rbbb.block === 'RBBB', `${rbbb.block}`);
check('RBBB: axis stays roughly normal (< +85)', E.measure(rbbb).frontalAxisDeg < 85, `${E.measure(rbbb).frontalAxisDeg} deg`);

// LBBB: wide QRS, QS in V1, dominant R in V6 with no q, discordant T
const lbbb = E.buildNormalSinus({ conductionBlock: 'LBBB' });
const lbbbPk = E.qrsPeakAmplitudes(lbbb);
check('LBBB: QRS wide (>=140 ms)', E.measure(lbbb).qrsMs >= 140, `${E.measure(lbbb).qrsMs} ms`);
check('LBBB: V1 net negative (QS)', lbbbPk.V1.s > lbbbPk.V1.r && lbbbPk.V1.s > 0.7, `V1 R ${lbbbPk.V1.r.toFixed(2)} vs S ${lbbbPk.V1.s.toFixed(2)}`);
check('LBBB: dominant R in V6, little S (no q)', lbbbPk.V6.r > 0.7 && lbbbPk.V6.r > lbbbPk.V6.s * 2, `V6 R ${lbbbPk.V6.r.toFixed(2)} S ${lbbbPk.V6.s.toFixed(2)}`);
check('LBBB: discordant (inverted) T in V6', tPeakV6(lbbb) < 0, `${tPeakV6(lbbb).toFixed(2)} mV`);

// Fascicular blocks: axis deviation
check('LAFB: left axis deviation (<= -45)', E.measure(E.buildNormalSinus({ conductionBlock: 'LAFB' })).frontalAxisDeg <= -45, `${E.measure(E.buildNormalSinus({ conductionBlock: 'LAFB' })).frontalAxisDeg} deg`);
check('LPFB: right axis deviation (>= 100)', E.measure(E.buildNormalSinus({ conductionBlock: 'LPFB' })).frontalAxisDeg >= 100, `${E.measure(E.buildNormalSinus({ conductionBlock: 'LPFB' })).frontalAxisDeg} deg`);

// Bifascicular: RBBB morphology + LAD
const bif = E.buildNormalSinus({ conductionBlock: 'RBBB+LAFB' });
check('RBBB+LAFB: wide QRS and left axis', E.measure(bif).qrsMs >= 120 && E.measure(bif).frontalAxisDeg <= -45, `${E.measure(bif).qrsMs} ms · ${E.measure(bif).frontalAxisDeg} deg`);

// WPW pre-excitation: short PR, wide QRS with a delta wave
const wpw = E.buildNormalSinus({ preExcitation: 0.85 });
const wpwM = E.measure(wpw);
check('WPW: short PR (< 120 ms)', wpwM.prMs < 120, `${wpwM.prMs} ms`);
check('WPW: QRS widened by delta (> 110 ms)', wpwM.qrsMs > 110, `${wpwM.qrsMs} ms`);
check('WPW: delta event present + preExcited tag', wpw.events.some((e) => e.id === 'delta') && wpw.preExcited === true, `${wpw.preExcited}`);

// STEMI: ST elevation in facing leads, reciprocal depression opposite
const stT = model.landmarks.qrsEnd + 0.35 * (model.landmarks.tEnd - model.landmarks.qrsEnd);
const stLead = (mdl, lead) => E.leadsAt(mdl, stT)[lead];
const dST = (mdl, lead) => stLead(mdl, lead) - stLead(model, lead);
const inf = E.buildNormalSinus({ stemi: 'inferior' });
check('Inferior STEMI: ST elevation in II/III/aVF', dST(inf, 'II') > 0.1 && dST(inf, 'III') > 0.1 && dST(inf, 'aVF') > 0.1, `II +${dST(inf, 'II').toFixed(2)}`);
check('Inferior STEMI: reciprocal ST depression in aVL', dST(inf, 'aVL') < -0.03, `aVL ${dST(inf, 'aVL').toFixed(2)}`);
const ant = E.buildNormalSinus({ stemi: 'anterior' });
check('Anterior STEMI: ST elevation V2–V4', dST(ant, 'V2') > 0.1 && dST(ant, 'V3') > 0.1 && dST(ant, 'V4') > 0.1, `V3 +${dST(ant, 'V3').toFixed(2)}`);
const lat = E.buildNormalSinus({ stemi: 'lateral' });
check('Lateral STEMI: ST elevation I/aVL/V6', dST(lat, 'I') > 0.08 && dST(lat, 'V6') > 0.08, `I +${dST(lat, 'I').toFixed(2)}`);
check('STEMI: territory tag carried', inf.stemi === 'inferior', `${inf.stemi}`);
check('STEMI: injury vector does not shift the QRS axis', E.measure(inf).frontalAxisDeg === m.frontalAxisDeg, `${E.measure(inf).frontalAxisDeg} vs ${m.frontalAxisDeg}`);

// Wide-complex tachycardia: VT (AV dissociation) vs SVT-aberrancy (1:1)
const vtR = E.makeRhythm({ mode: 'complete', atrialRateBpm: 78, basePrMs: 160, wenckebachStepMs: 0, dropRatio: 4, escapeRateBpm: 160, escapeWide: true, conductedWide: false });
const svtR = E.makeRhythm({ mode: 'normal', atrialRateBpm: 160, basePrMs: 140, wenckebachStepMs: 0, dropRatio: 4, escapeRateBpm: 40, escapeWide: false, conductedWide: true });
check('VT: fast ventricular focus (160 bpm)', E.ventricularRate(vtR.params) === 160, `${E.ventricularRate(vtR.params)} bpm`);
check('VT: AV dissociation (no P conducts)', E.pMarkers(vtR, 0, 4000).every((p) => !p.conducts));
check('SVT: 1:1 conduction (every P conducts)', E.pMarkers(svtR, 0, 4000).every((p) => p.conducts));
check('SVT: ventricular rate = atrial rate', E.ventricularRate(svtR.params) === 160, `${E.ventricularRate(svtR.params)} bpm`);

// Regression: normal unchanged
check('Regression: default still axis 54, QRS 92, QTc 400', m.frontalAxisDeg === 54 && m.qrsMs === 92 && m.qtcMs === 400);

console.log('\n--- Phase 2 (rhythm): AV conduction / dropped beats ---');
// Wenckebach 4:3 — over a group of 4 P's, 3 conduct (increasing PR) and 1 drops.
const wb = E.makeRhythm({ ...E.DEFAULT_RHYTHM, mode: 'wenckebach', atrialRateBpm: 75, dropRatio: 4 });
const wbMarks = E.pMarkers(wb, 0, wb.ppMs * 7 - 1); // first 8 P's (indices 0..7)
const wbConducted = wbMarks.filter((mk) => mk.conducts).length;
const wbDropped = wbMarks.filter((mk) => !mk.conducts).length;
check('Wenckebach 4:3 — 6 conduct / 2 drop over 8 P', wbConducted === 6 && wbDropped === 2, `conduct ${wbConducted} drop ${wbDropped}`);
check('Wenckebach ventricular rate < atrial', E.ventricularRate(wb.params) < 75, `${E.ventricularRate(wb.params)} bpm`);
// The dropped beat shows a blocked AV node in the conduction view.
const dropIdx = 3; // 4th P (index 3) is dropped
const dropT = dropIdx * wb.ppMs + wb.templates.pDur + 30; // just after that P, where QRS would be
check('Wenckebach: blocked AV node at the dropped beat', E.conductionAtAbs(wb, dropT).active.includes('avBlock'), E.conductionAtAbs(wb, dropT).phase);

// Mobitz II 3:2 — constant PR, every 3rd P dropped.
const m2 = E.makeRhythm({ ...E.DEFAULT_RHYTHM, mode: 'mobitz2', atrialRateBpm: 80, dropRatio: 3 });
const m2Marks = E.pMarkers(m2, 0, m2.ppMs * 5 - 1); // 6 P's (indices 0..5)
check('Mobitz II 3:2 — 4 conduct / 2 drop over 6 P', m2Marks.filter((x) => x.conducts).length === 4, `${m2Marks.filter((x) => x.conducts).length} conduct`);

// Complete block — no P conducts; ventricular = escape rate; rates independent.
const cb = E.makeRhythm({ ...E.DEFAULT_RHYTHM, mode: 'complete', atrialRateBpm: 90, escapeRateBpm: 38 });
check('Complete block: no P conducts (dissociation)', E.pMarkers(cb, 0, cb.ppMs * 5).every((x) => !x.conducts));
check('Complete block: ventricular rate = escape rate', E.ventricularRate(cb.params) === 38, `${E.ventricularRate(cb.params)} bpm`);
// Over a scan, the AV node is shown blocked (in gaps) while the ventricles
// fire independently (escape QRS present) — i.e. dissociation.
let cbBlock = false, cbVent = false;
for (let t = 0; t < cb.ppMs * 8; t += 8) {
  const c = E.conductionAtAbs(cb, t);
  if (c.active.includes('avBlock')) cbBlock = true;
  if (c.phase === 'ventricular') cbVent = true;
}
check('Complete block: AV blocked + independent ventricular escape', cbBlock && cbVent, `block ${cbBlock} vent ${cbVent}`);

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
