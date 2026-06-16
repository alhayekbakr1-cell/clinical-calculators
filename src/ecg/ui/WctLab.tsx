"use client";

import { useMemo, useState } from "react";
import {
  conductionAtAbs,
  makeRhythm,
  type RhythmParams,
  ventricularRate,
} from "@/ecg/engine";
import { useCardiacClock } from "@/ecg/useCardiacClock";
import { ConductionView } from "./ConductionView";
import { RhythmStrip } from "./RhythmStrip";

const LOOP_MS = 20000;
type Dx = "VT" | "SVT";

/** Map the clinical scenario onto the rhythm engine. */
function paramsFor(dx: Dx, rate: number): RhythmParams {
  if (dx === "VT") {
    // Independent fast wide ventricular focus; sinus P waves dissociated beneath.
    return {
      mode: "complete",
      atrialRateBpm: 78,
      basePrMs: 160,
      wenckebachStepMs: 0,
      dropRatio: 4,
      escapeRateBpm: rate,
      escapeWide: true,
      conductedWide: false,
    };
  }
  // SVT with aberrancy: 1:1 conduction, fixed wide (BBB) complexes.
  return {
    mode: "normal",
    atrialRateBpm: rate,
    basePrMs: 140,
    wenckebachStepMs: 0,
    dropRatio: 4,
    escapeRateBpm: 40,
    escapeWide: false,
    conductedWide: true,
  };
}

const VT_FEATURES = [
  "AV dissociation — independent P waves",
  "Capture / fusion beats",
  "QRS > 140 ms (RBBB-type) or > 160 ms (LBBB-type)",
  "Extreme axis / precordial concordance",
  "Initial R wave in aVR (Vereckei)",
];

export function WctLab() {
  const [dx, setDx] = useState<Dx>("VT");
  const [rate, setRate] = useState(160);

  const rp = useMemo(() => paramsFor(dx, rate), [dx, rate]);
  const engine = useMemo(() => makeRhythm(rp), [rp]);
  const clock = useCardiacClock(LOOP_MS);
  const cond = conductionAtAbs(engine, clock.tMs);
  const vRate = ventricularRate(rp);
  const isVT = dx === "VT";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {(["VT", "SVT"] as Dx[]).map((d) => (
            <button
              key={d}
              onClick={() => setDx(d)}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                dx === d
                  ? d === "VT"
                    ? "bg-rose-500 text-white"
                    : "bg-sky-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {d === "VT" ? "Ventricular tachycardia" : "SVT with aberrancy"}
            </button>
          ))}
        </div>
        <button
          onClick={clock.toggle}
          className="px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold w-16"
        >
          {clock.playing ? "Pause" : "Play"}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Rate</span>
          <input
            type="range"
            min={140}
            max={200}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-28 accent-rose-500"
          />
          <span className="text-xs font-mono text-slate-300 w-16">{vRate} bpm</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <div className="lg:col-span-1 flex flex-col">
          <div className="aspect-[5/6] max-h-[260px] mx-auto">
            <ConductionView state={cond} />
          </div>
          <p className="text-[11px] font-bold text-amber-400 text-center mt-1">
            {isVT ? "AV dissociation" : "1:1 atrioventricular"}
          </p>
        </div>

        <div className="lg:col-span-3 flex flex-col gap-2">
          <RhythmStrip engine={engine} elapsedMs={clock.elapsedMs} loopMs={LOOP_MS} />
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-slate-300">
              {isVT
                ? "This tracing: P waves (red) march at their own rate, dissociated from the fast wide QRS."
                : "This tracing: a P (blue) precedes every QRS — 1:1, with a fixed bundle-branch-block shape."}
            </span>
            <span className="text-slate-500 ml-auto whitespace-nowrap">II · 25 mm/s · 10 mm/mV</span>
          </div>

          <div className="bg-slate-800/40 rounded-lg p-3">
            <p className="text-xs font-bold text-slate-200 mb-1">
              Features that favour VT{" "}
              <span className="font-normal text-slate-500">(Brugada 1991 · Vereckei aVR 2008)</span>
            </p>
            <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[12px] text-slate-300">
              {VT_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-rose-400 font-black leading-5">•</span>
                  {f}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-slate-400 mt-2">
              {isVT
                ? "AV dissociation (and capture/fusion beats) is highly specific for VT. When a regular wide-complex tachycardia is undifferentiated, treat it as VT."
                : "SVT with aberrancy is supraventricular with a fixed BBB pattern and a 1:1 P–QRS relationship — it lacks the dissociation/capture beats above."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
