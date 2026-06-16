"use client";

import { useMemo, useState } from "react";
import {
  buildNormalSinus,
  conductionAt,
  heartVectorAt,
  LEAD_ORDER,
  measure,
  NORMAL_RANGES,
  projectToLeads,
} from "@/ecg/engine";
import { useCardiacClock } from "@/ecg/useCardiacClock";
import { ConductionView } from "@/ecg/ui/ConductionView";
import { VectorView } from "@/ecg/ui/VectorView";
import { TracingView } from "@/ecg/ui/TracingView";

const SPEEDS = [0.25, 0.5, 1] as const;

function inRange(v: number, [lo, hi]: readonly [number, number]) {
  return v >= lo && v <= hi;
}

function Readout({
  label,
  value,
  unit,
  ok = true,
  note,
}: {
  label: string;
  value: string | number;
  unit?: string;
  ok?: boolean;
  note?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
        {label}
      </span>
      <span
        className={`text-lg font-black tabular-nums ${ok ? "text-slate-100" : "text-amber-400"}`}
      >
        {value}
        {unit && <span className="text-xs font-semibold text-slate-400 ml-0.5">{unit}</span>}
      </span>
      {note && <span className="text-[10px] font-semibold text-amber-400">{note}</span>}
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900/60 ring-1 ring-slate-800 rounded-xl p-3 flex flex-col">
      <div className="mb-2">
        <h2 className="text-sm font-bold text-slate-200">{title}</h2>
        {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default function EcgConsole() {
  const [rateBpm, setRateBpm] = useState(72);
  const [prMs, setPrMs] = useState(160);

  const model = useMemo(
    () => buildNormalSinus({ rateBpm, prMs }),
    [rateBpm, prMs],
  );
  const rrMs = model.landmarks.rrMs;

  const clock = useCardiacClock(rrMs);
  const { tMs, elapsedMs } = clock;

  // One vector -> everything.
  const m = heartVectorAt(model, tMs);
  const leads = projectToLeads(m);
  const conduction = conductionAt(model, tMs);
  const measurements = useMemo(() => measure(model), [model]);

  const prAbnormal = prMs > NORMAL_RANGES.prMs[1];

  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-5 py-4">
      {/* ---- Header / transport ---- */}
      <header className="mb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">
              Cardiac Vector Engine
            </h1>
            <p className="text-xs text-slate-400">
              One clock · one dipole vector{" "}
              <span className="font-mono text-slate-300">m(t)</span> · three
              synchronized views. Normal sinus rhythm.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-slate-900/60 ring-1 ring-slate-800 rounded-xl px-4 py-2">
            <Readout label="Rate" value={measurements.rateBpm} unit="bpm" ok={inRange(measurements.rateBpm, NORMAL_RANGES.rateBpm)} />
            <Readout label="PR" value={measurements.prMs} unit="ms" ok={inRange(measurements.prMs, NORMAL_RANGES.prMs)} note={prAbnormal ? "1° AV block" : undefined} />
            <Readout label="QRS" value={measurements.qrsMs} unit="ms" ok={measurements.qrsMs < 120} />
            <Readout label="QTc" value={measurements.qtcMs} unit="ms" ok={inRange(measurements.qtcMs, NORMAL_RANGES.qtcMs)} />
            <Readout label="Axis" value={`${measurements.frontalAxisDeg >= 0 ? "+" : ""}${measurements.frontalAxisDeg}°`} ok={inRange(measurements.frontalAxisDeg, NORMAL_RANGES.axisDeg)} />
          </div>
        </div>

        {/* controls */}
        <div className="mt-3 flex flex-wrap items-center gap-4 bg-slate-900/40 ring-1 ring-slate-800 rounded-xl px-4 py-2.5">
          <button
            onClick={clock.toggle}
            className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold w-20 transition-colors"
          >
            {clock.playing ? "Pause" : "Play"}
          </button>

          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mr-1">Speed</span>
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => clock.setSpeed(s)}
                className={`px-2 py-1 rounded-md text-xs font-bold transition-colors ${
                  clock.speed === s ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {s}×
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Scrub</span>
            <input
              type="range"
              min={0}
              max={Math.round(rrMs)}
              value={Math.round(tMs)}
              onChange={(e) => clock.scrubToPhase(Number(e.target.value))}
              className="flex-1 accent-sky-500"
            />
            <span className="text-xs font-mono text-slate-400 w-16 text-right">
              {Math.round(tMs)} ms
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">HR</span>
              <input type="range" min={40} max={160} value={rateBpm} onChange={(e) => setRateBpm(Number(e.target.value))} className="w-28 accent-emerald-500" />
              <span className="text-xs font-mono text-slate-300 w-12">{rateBpm}</span>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">PR</span>
              <input type="range" min={120} max={300} value={prMs} onChange={(e) => setPrMs(Number(e.target.value))} className="w-28 accent-emerald-500" />
              <span className="text-xs font-mono text-slate-300 w-12">{prMs}</span>
            </label>
          </div>
        </div>
      </header>

      {/* ---- Three synchronized views ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-3">
        <div className="lg:col-span-4">
          <Card title="Conduction" subtitle={conduction.label}>
            <div className="aspect-[5/6] max-h-[360px] mx-auto">
              <ConductionView state={conduction} />
            </div>
            <PhaseStrip activePhase={conduction.label} />
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card title="Axis vector" subtitle="Hexaxial · live projection onto each lead">
            <div className="aspect-square max-h-[360px] mx-auto w-full">
              <VectorView model={model} m={m} leads={leads} measurements={measurements} />
            </div>
            <div className="flex justify-center gap-3 text-[10px] mt-1">
              <Legend color="#f1f5f9" label="QRS loop" />
              <Legend color="#38bdf8" label="P loop" />
              <Legend color="#a855f7" label="T loop" />
              <Legend color="#f59e0b" label="mean axis" />
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card title="Instantaneous leads" subtitle="Each lead = m(t) projected onto its axis, right now">
            <InstantBars leads={leads} />
          </Card>
        </div>
      </div>

      {/* ---- 12-lead tracing ---- */}
      <Card title="12-lead tracing" subtitle="The blue cursor marks the same instant shown in the views above">
        <TracingView model={model} tMs={tMs} elapsedMs={elapsedMs} leads={leads} />
      </Card>

      <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
        Phase 0–1 prototype. Limb leads are the exact Einthoven–Goldberger
        projection of the frontal vector (Einthoven&apos;s law II = I + III holds
        identically); precordials V1–V6 use the published Dower transform of the
        full 3-D vector. Calibration is 25 mm/s and 10 mm/mV; intervals are read
        from the same landmarks that drive the animation, so the clock and the
        numbers agree to the millisecond.
      </p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1 text-slate-400">
      <span className="inline-block w-3 h-[2px]" style={{ background: color }} />
      {label}
    </span>
  );
}

function PhaseStrip({ activePhase }: { activePhase: string }) {
  return (
    <div className="mt-2 text-center">
      <span className="text-xs font-bold text-amber-400">{activePhase}</span>
    </div>
  );
}

function InstantBars({ leads }: { leads: Record<string, number> }) {
  const maxMv = 1.6;
  return (
    <div className="flex flex-col gap-1.5 py-1">
      {LEAD_ORDER.map((lead) => {
        const v = leads[lead];
        const pct = Math.min(100, (Math.abs(v) / maxMv) * 50);
        const positive = v >= 0;
        return (
          <div key={lead} className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 w-7 text-right">{lead}</span>
            <div className="relative flex-1 h-3 bg-slate-800/70 rounded">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-600" />
              <div
                className="absolute top-0 bottom-0 rounded"
                style={{
                  left: positive ? "50%" : `${50 - pct}%`,
                  width: `${pct}%`,
                  background: positive ? "#34d399" : "#fb7185",
                }}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-500 w-12 text-right">
              {v >= 0 ? "+" : ""}
              {v.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
