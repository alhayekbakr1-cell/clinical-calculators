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

// Regression: normal unchanged
check('Regression: default still axis 54, QRS 92, QTc 400', m.frontalAxisDeg === 54 && m.qrsMs === 92 && m.qtcMs === 400);

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
