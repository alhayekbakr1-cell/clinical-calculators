"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildNormalSinus,
  conductionAt,
  heartVectorAt,
  LEAD_ORDER,
  measure,
  NORMAL_RANGES,
  projectToLeads,
  sokolowLyonMv,
} from "@/ecg/engine";
import {
  type LabParams,
  type Module,
  NORMAL_PARAMS,
  TIER1,
  TIER2,
} from "@/ecg/curriculum";
import { useCardiacClock } from "@/ecg/useCardiacClock";
import { ConductionView } from "@/ecg/ui/ConductionView";
import { VectorView } from "@/ecg/ui/VectorView";
import { TracingView } from "@/ecg/ui/TracingView";
import { ParameterLab } from "@/ecg/ui/ParameterLab";
import { WctLab } from "@/ecg/ui/WctLab";
import { RhythmLab } from "@/ecg/ui/RhythmLab";

const SPEEDS = [0.25, 0.5, 1] as const;

function inRange(v: number, [lo, hi]: readonly [number, number]) {
  return v >= lo && v <= hi;
}

export default function EcgConsole() {
  const [params, setParams] = useState<LabParams>(NORMAL_PARAMS);
  const [activeModule, setActiveModule] = useState<string>(TIER1[0].id);
  const [note, setNote] = useState<string>(TIER1[0].note);

  const update = (patch: Partial<LabParams>) =>
    setParams((p) => ({ ...p, ...patch }));

  const applyModule = (mod: Module) => {
    setParams({ ...NORMAL_PARAMS, ...mod.preset });
    setActiveModule(mod.id);
    setNote(mod.note);
  };

  // Deep-link a teaching scenario: /ecg?focus=<module-id>
  useEffect(() => {
    const focus = new URLSearchParams(window.location.search).get("focus");
    const mod = focus && [...TIER1, ...TIER2].find((x) => x.id === focus);
    if (mod) applyModule(mod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const model = useMemo(
    () =>
      buildNormalSinus({
        rateBpm: params.rateBpm,
        prMs: params.prMs,
        qrsAxisDeg: params.qrsAxisDeg ?? undefined,
        potassiumMmol: params.potassiumMmol,
        lvh: params.lvh,
        lvStrain: params.lvStrain,
        atrial: params.atrial,
        conductionBlock: params.conductionBlock,
        preExcitation: params.preExcitation,
        stemi: params.stemi,
      }),
    [params],
  );
  const rrMs = model.landmarks.rrMs;

  const clock = useCardiacClock(rrMs);
  const { tMs, elapsedMs } = clock;

  // One vector -> everything.
  const m = heartVectorAt(model, tMs);
  const leads = projectToLeads(m);
  const conduction = conductionAt(model, tMs);
  const measurements = useMemo(() => measure(model), [model]);
  const sl = useMemo(() => sokolowLyonMv(model), [model]);

  return (
    <div className="max-w-[1500px] mx-auto px-3 sm:px-5 py-4">
      {/* ---- Header / read-outs ---- */}
      <header className="mb-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">
              Cardiac Vector Engine
            </h1>
            <p className="text-xs text-slate-400">
              One clock · one dipole vector{" "}
              <span className="font-mono text-slate-300">m(t)</span> · three
              synchronized views. Move a parameter — everything reacts.
            </p>
          </div>
          <div className="flex flex-nowrap sm:flex-wrap overflow-x-auto sm:overflow-visible items-center gap-x-4 gap-y-2 bg-slate-900/60 ring-1 ring-slate-800 rounded-xl px-4 py-2 w-full sm:w-auto">
            <Readout label="Rate" value={measurements.rateBpm} unit="bpm" ok={inRange(measurements.rateBpm, NORMAL_RANGES.rateBpm)} />
            <Readout label="PR" value={measurements.prMs} unit="ms" ok={inRange(measurements.prMs, NORMAL_RANGES.prMs)} note={measurements.prMs > NORMAL_RANGES.prMs[1] ? "1° block" : undefined} />
            <Readout label="QRS" value={measurements.qrsMs} unit="ms" ok={measurements.qrsMs < 120} note={measurements.qrsMs >= 120 ? "wide" : undefined} />
            <Readout label="QTc" value={measurements.qtcMs} unit="ms" ok={inRange(measurements.qtcMs, NORMAL_RANGES.qtcMs)} />
            <Readout label="Axis" value={`${measurements.frontalAxisDeg >= 0 ? "+" : ""}${measurements.frontalAxisDeg}°`} ok={inRange(measurements.frontalAxisDeg, NORMAL_RANGES.axisDeg)} />
            <Readout label="Sokolow-Lyon" value={sl.toFixed(1)} unit="mV" ok={sl < 3.5} note={sl >= 3.5 ? "LVH" : undefined} />
          </div>
        </div>

        {/* transport */}
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
                className={`px-2 py-1 rounded-md text-xs font-bold transition-colors ${clock.speed === s ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
              >
                {s}×
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 w-full sm:flex-1 sm:w-auto sm:min-w-[220px] order-last sm:order-none">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Scrub</span>
            <input
              type="range"
              min={0}
              max={Math.round(rrMs)}
              value={Math.round(tMs)}
              onChange={(e) => clock.scrubToPhase(Number(e.target.value))}
              className="flex-1 accent-sky-500"
            />
            <span className="text-xs font-mono text-slate-400 w-16 text-right">{Math.round(tMs)} ms</span>
          </div>
          <span className="text-xs font-bold text-amber-400 w-full sm:w-auto sm:min-w-[180px] sm:text-right">
            {conduction.label}
          </span>
        </div>
      </header>

      {/* ---- Lab + views ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="order-2 lg:order-1 lg:col-span-3">
          <Card>
            <ParameterLab params={params} onChange={update} onReset={() => setParams(NORMAL_PARAMS)} />
          </Card>
        </div>

        <div className="order-1 lg:order-2 lg:col-span-9 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <Card title="Conduction" subtitle={conduction.label}>
              <div className="aspect-[5/6] max-h-[320px] mx-auto">
                <ConductionView state={conduction} block={model.block} preExcited={model.preExcited} />
              </div>
            </Card>
            <Card title="Axis vector" subtitle="Hexaxial · live projection per lead">
              <div className="aspect-square max-h-[320px] mx-auto w-full">
                <VectorView model={model} m={m} leads={leads} measurements={measurements} />
              </div>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] mt-1">
                <Legend color="#f1f5f9" label="QRS loop" />
                <Legend color="#38bdf8" label="P loop" />
                <Legend color="#a855f7" label="T loop" />
                <Legend color="#f59e0b" label="mean axis" />
              </div>
            </Card>
            <Card title="Instantaneous leads" subtitle="Each lead = m(t) on its axis, now">
              <InstantBars leads={leads} />
            </Card>
          </div>

          <Card title="12-lead tracing" subtitle="The blue cursor marks the instant shown in the views above">
            <TracingView model={model} tMs={tMs} elapsedMs={elapsedMs} leads={leads} />
          </Card>
        </div>
      </div>

      {/* ---- Tier-1 curriculum ---- */}
      <div className="mt-3">
        <Card title="Tier 1 — Foundational" subtitle="Pick a focus; the lab and the views load its scenario">
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {TIER1.map((mod) => (
              <button
                key={mod.id}
                onClick={() => applyModule(mod)}
                className={`shrink-0 text-left rounded-lg px-3 py-2 w-44 ring-1 transition-colors ${
                  activeModule === mod.id
                    ? "bg-sky-500/15 ring-sky-500"
                    : "bg-slate-800/40 ring-slate-800 hover:bg-slate-800"
                }`}
              >
                <span className="block text-xs font-bold text-slate-200 leading-tight">{mod.title}</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">{mod.short}</span>
              </button>
            ))}
          </div>
          <p className="text-[13px] text-slate-300 leading-relaxed mt-2 max-w-4xl">{note}</p>
        </Card>
      </div>

      {/* ---- Tier-2: bundle & fascicular blocks (single beat) ---- */}
      <div className="mt-3">
        <Card title="Tier 2 — Bundle & fascicular blocks" subtitle="Wide-QRS and fascicular patterns; the blocked bundle lights red in the conduction view">
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {TIER2.map((mod) => (
              <button
                key={mod.id}
                onClick={() => applyModule(mod)}
                className={`shrink-0 text-left rounded-lg px-3 py-2 w-44 ring-1 transition-colors ${
                  activeModule === mod.id
                    ? "bg-sky-500/15 ring-sky-500"
                    : "bg-slate-800/40 ring-slate-800 hover:bg-slate-800"
                }`}
              >
                <span className="block text-xs font-bold text-slate-200 leading-tight">{mod.title}</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">{mod.short}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* ---- Tier-2: AV conduction / dropped beats ---- */}
      <div className="mt-3 scroll-mt-4" id="rhythm">
        <Card title="Tier 2 — Rhythm lab · AV conduction" subtitle="Decoupled atria and ventricles: watch the dropped beat">
          <RhythmLab />
        </Card>
      </div>

      {/* ---- Tier-2: wide-complex tachycardia (VT vs SVT) ---- */}
      <div className="mt-3 scroll-mt-4" id="wct">
        <Card title="Tier 2 — Wide-complex tachycardia · VT vs SVT" subtitle="Same fast wide-QRS rhythm; the atrioventricular relationship tells them apart">
          <WctLab />
        </Card>
      </div>

      <p className="text-[11px] text-slate-500 mt-4 leading-relaxed max-w-4xl">
        Limb leads are the exact Einthoven–Goldberger projection of the frontal
        vector (II = I + III holds identically); precordials V1–V6 use the
        published Dower transform of the full 3-D vector. Calibration is 25 mm/s
        and 10 mm/mV; intervals are read from the same landmarks that drive the
        animation. Morphology transforms (axis, hyperkalaemia, LVH, atrial
        enlargement) are illustrative teaching models built on standard
        mechanisms and criteria.
      </p>
    </div>
  );
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
    <div className="flex flex-col shrink-0">
      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</span>
      <span className={`text-lg font-black tabular-nums leading-none ${ok ? "text-slate-100" : "text-amber-400"}`}>
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
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900/60 ring-1 ring-slate-800 rounded-xl p-3 flex flex-col">
      {title && (
        <div className="mb-2">
          <h2 className="text-sm font-bold text-slate-200">{title}</h2>
          {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
        </div>
      )}
      {children}
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
