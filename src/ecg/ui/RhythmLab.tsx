"use client";

import { useMemo, useState } from "react";
import {
  type AvMode,
  conductionAtAbs,
  DEFAULT_RHYTHM,
  makeRhythm,
  type RhythmParams,
  ventricularRate,
} from "@/ecg/engine";
import { useCardiacClock } from "@/ecg/useCardiacClock";
import { ConductionView } from "./ConductionView";
import { RhythmStrip } from "./RhythmStrip";

const LOOP_MS = 20000;

const MODES: { id: AvMode; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "firstDegree", label: "1°" },
  { id: "wenckebach", label: "Mobitz I" },
  { id: "mobitz2", label: "Mobitz II" },
  { id: "complete", label: "Complete" },
];

const DESC: Record<AvMode, string> = {
  normal: "Every P conducts 1:1 with a constant, normal PR.",
  firstDegree: "Every P conducts, but PR is prolonged (> 200 ms). No dropped beats.",
  wenckebach:
    "PR lengthens beat-to-beat until a P fails to conduct — a dropped QRS, then it resets (group beating).",
  mobitz2:
    "PR is constant; a P intermittently fails to conduct with no warning. Higher risk of progression.",
  complete:
    "No P conducts. Atria and ventricles are dissociated; the ventricles run on an independent escape pacemaker.",
};

export function RhythmLab() {
  const [rp, setRp] = useState<RhythmParams>(DEFAULT_RHYTHM);
  const set = (patch: Partial<RhythmParams>) => setRp((p) => ({ ...p, ...patch }));

  const engine = useMemo(() => makeRhythm(rp), [rp]);
  const clock = useCardiacClock(LOOP_MS);
  const cond = conductionAtAbs(engine, clock.tMs);

  const vRate = ventricularRate(rp);
  const showRatio = rp.mode === "wenckebach" || rp.mode === "mobitz2";
  const showEscape = rp.mode === "complete";

  return (
    <div className="flex flex-col gap-3">
      {/* mode + transport */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {MODES.map((mo) => (
            <button
              key={mo.id}
              onClick={() => set({ mode: mo.id })}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                rp.mode === mo.id
                  ? "bg-rose-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {mo.label}
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
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Atrial</span>
          <input
            type="range"
            min={50}
            max={120}
            value={rp.atrialRateBpm}
            onChange={(e) => set({ atrialRateBpm: Number(e.target.value) })}
            className="w-24 accent-emerald-500"
          />
          <span className="text-xs font-mono text-slate-300 w-10">{rp.atrialRateBpm}</span>
        </div>
        {showRatio && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Ratio</span>
            <input
              type="range"
              min={2}
              max={5}
              value={rp.dropRatio}
              onChange={(e) => set({ dropRatio: Number(e.target.value) })}
              className="w-20 accent-amber-500"
            />
            <span className="text-xs font-mono text-slate-300 w-12">{rp.dropRatio}:{rp.dropRatio - 1}</span>
          </div>
        )}
        {showEscape && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Escape</span>
            <input
              type="range"
              min={25}
              max={55}
              value={rp.escapeRateBpm}
              onChange={(e) => set({ escapeRateBpm: Number(e.target.value) })}
              className="w-20 accent-violet-500"
            />
            <span className="text-xs font-mono text-slate-300 w-10">{rp.escapeRateBpm}</span>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={rp.escapeWide}
                onChange={(e) => set({ escapeWide: e.target.checked })}
                className="accent-violet-500"
              />
              <span className="text-[11px] font-semibold text-slate-400">wide</span>
            </label>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* conduction + read-outs */}
        <div className="lg:col-span-1 flex flex-col">
          <div className="aspect-[5/6] max-h-[260px] mx-auto">
            <ConductionView state={cond} />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <Stat label="Atrial" value={`${rp.atrialRateBpm}`} unit="bpm" />
            <Stat label="Ventricular" value={`${vRate}`} unit="bpm" warn={vRate < 50} />
          </div>
          <p className="text-[11px] font-bold text-amber-400 text-center mt-1">{cond.label}</p>
        </div>

        {/* rhythm strip */}
        <div className="lg:col-span-3 flex flex-col gap-2">
          <RhythmStrip engine={engine} elapsedMs={clock.elapsedMs} loopMs={LOOP_MS} />
          <div className="flex items-center gap-4 text-[11px]">
            <Marker color="#2563eb" label="conducted P" />
            <Marker color="#ef4444" label="non-conducted (dropped) P" />
            <span className="text-slate-400">II · 25 mm/s · 10 mm/mV</span>
          </div>
          <p className="text-[13px] text-slate-300 leading-relaxed">{DESC[rp.mode]}</p>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  warn,
}: {
  label: string;
  value: string;
  unit: string;
  warn?: boolean;
}) {
  return (
    <div className="bg-slate-800/40 rounded-lg px-2 py-1.5">
      <span className="block text-[9px] uppercase tracking-widest text-slate-500 font-bold">{label}</span>
      <span className={`text-base font-black tabular-nums ${warn ? "text-amber-400" : "text-slate-100"}`}>
        {value}
        <span className="text-[10px] font-semibold text-slate-400 ml-0.5">{unit}</span>
      </span>
    </div>
  );
}

function Marker({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1 text-slate-400">
      <span className="inline-block w-2 h-2" style={{ background: color, clipPath: "polygon(50% 100%, 0 0, 100% 0)" }} />
      {label}
    </span>
  );
}
