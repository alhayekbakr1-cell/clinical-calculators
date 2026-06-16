"use client";

import type { LabParams } from "@/ecg/curriculum";
import type { AtrialEnlargement, ConductionBlock } from "@/ecg/engine";

const BLOCK_OPTS: { id: ConductionBlock; label: string }[] = [
  { id: "none", label: "None" },
  { id: "RBBB", label: "RBBB" },
  { id: "LBBB", label: "LBBB" },
  { id: "LAFB", label: "LAFB (left anterior)" },
  { id: "LPFB", label: "LPFB (left posterior)" },
  { id: "RBBB+LAFB", label: "RBBB + LAFB" },
  { id: "RBBB+LPFB", label: "RBBB + LPFB" },
];

function Field({
  label,
  value,
  hint,
  hintTone = "muted",
  children,
}: {
  label: string;
  value?: string;
  hint?: string;
  hintTone?: "muted" | "warn";
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
          {label}
        </span>
        {value != null && (
          <span className="text-xs font-mono text-slate-300">{value}</span>
        )}
      </div>
      {children}
      {hint && (
        <span
          className={`text-[10px] font-semibold ${hintTone === "warn" ? "text-amber-400" : "text-slate-500"}`}
        >
          {hint}
        </span>
      )}
    </div>
  );
}

function potassiumHint(k: number): { text: string; warn: boolean } {
  if (k < 5.5) return { text: "Normal repolarisation", warn: false };
  if (k < 6.5) return { text: "Tall, peaked T waves", warn: true };
  if (k < 7.5) return { text: "P flattening · PR prolongation", warn: true };
  return { text: "QRS widening → sine-wave", warn: true };
}

const ATRIAL_OPTS: { id: AtrialEnlargement; label: string }[] = [
  { id: "none", label: "None" },
  { id: "LAE", label: "LAE" },
  { id: "RAE", label: "RAE" },
  { id: "biatrial", label: "Both" },
];

export function ParameterLab({
  params,
  onChange,
  onReset,
}: {
  params: LabParams;
  onChange: (patch: Partial<LabParams>) => void;
  onReset: () => void;
}) {
  const kHint = potassiumHint(params.potassiumMmol);
  const axisOn = params.qrsAxisDeg != null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-200">Parameter lab</h2>
        <button
          onClick={onReset}
          className="text-[11px] font-bold text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-800/70"
        >
          Reset to normal
        </button>
      </div>

      <Field label="Heart rate" value={`${params.rateBpm} bpm`}>
        <input
          type="range"
          min={40}
          max={180}
          value={params.rateBpm}
          onChange={(e) => onChange({ rateBpm: Number(e.target.value) })}
          className="w-full accent-emerald-500"
        />
      </Field>

      <Field
        label="PR interval"
        value={`${params.prMs} ms`}
        hint={params.prMs > 200 ? "First-degree AV block" : undefined}
        hintTone="warn"
      >
        <input
          type="range"
          min={120}
          max={320}
          value={params.prMs}
          onChange={(e) => onChange({ prMs: Number(e.target.value) })}
          className="w-full accent-emerald-500"
        />
      </Field>

      <Field
        label="Mean QRS axis"
        value={axisOn ? `${params.qrsAxisDeg}°` : "natural"}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onChange({ qrsAxisDeg: axisOn ? null : 60 })
            }
            className={`text-[11px] font-bold px-2 py-1 rounded ${axisOn ? "bg-amber-500 text-slate-900" : "bg-slate-800 text-slate-300"}`}
          >
            {axisOn ? "Override" : "Auto"}
          </button>
          <input
            type="range"
            min={-90}
            max={150}
            value={params.qrsAxisDeg ?? 60}
            disabled={!axisOn}
            onChange={(e) => onChange({ qrsAxisDeg: Number(e.target.value) })}
            className="w-full accent-amber-500 disabled:opacity-40"
          />
        </div>
      </Field>

      <Field
        label="Potassium"
        value={`${params.potassiumMmol.toFixed(1)} mmol/L`}
        hint={kHint.text}
        hintTone={kHint.warn ? "warn" : "muted"}
      >
        <input
          type="range"
          min={3}
          max={9}
          step={0.1}
          value={params.potassiumMmol}
          onChange={(e) => onChange({ potassiumMmol: Number(e.target.value) })}
          className="w-full accent-violet-500"
        />
      </Field>

      <Field label="LVH severity" value={`${Math.round(params.lvh * 100)}%`}>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={params.lvh}
          onChange={(e) => onChange({ lvh: Number(e.target.value) })}
          className="w-full accent-sky-500"
        />
        <label className="flex items-center gap-2 mt-1 cursor-pointer">
          <input
            type="checkbox"
            checked={params.lvStrain}
            onChange={(e) => onChange({ lvStrain: e.target.checked })}
            className="accent-sky-500"
          />
          <span className="text-[11px] font-semibold text-slate-400">
            Strain pattern (lateral T inversion)
          </span>
        </label>
      </Field>

      <Field label="Atrial enlargement">
        <div className="grid grid-cols-4 gap-1">
          {ATRIAL_OPTS.map((o) => (
            <button
              key={o.id}
              onClick={() => onChange({ atrial: o.id })}
              className={`text-[11px] font-bold py-1 rounded transition-colors ${
                params.atrial === o.id
                  ? "bg-slate-200 text-slate-900"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </Field>

      <Field
        label="Conduction block"
        hint={params.conductionBlock !== "none" ? "Wide-QRS / fascicular pattern" : undefined}
        hintTone="warn"
      >
        <select
          value={params.conductionBlock}
          onChange={(e) => onChange({ conductionBlock: e.target.value as ConductionBlock })}
          className="w-full bg-slate-800 text-slate-200 text-xs font-semibold rounded px-2 py-1.5 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
        >
          {BLOCK_OPTS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}
