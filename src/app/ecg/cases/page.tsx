"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  buildNormalSinus,
  leadsAt,
  measure,
  sokolowLyonMv,
} from "@/ecg/engine";
import { CASES } from "@/ecg/cases";
import { countMastered, useProgress } from "@/ecg/progress";
import { TracingView } from "@/ecg/ui/TracingView";
import { CaliperStrip } from "@/ecg/ui/CaliperStrip";

function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function CasesPage() {
  const { progress, recordResult } = useProgress();
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const c = CASES[idx];
  const model = useMemo(() => buildNormalSinus(c.params), [c]);
  const meas = useMemo(() => measure(model), [model]);
  const sl = useMemo(() => sokolowLyonMv(model), [model]);
  const options = useMemo(
    () => shuffle(c.options, c.id.length * 7 + idx),
    [c, idx],
  );
  const frozenLeads = useMemo(() => leadsAt(model, 0), [model]);

  const answered = picked != null;
  const correct = picked === c.diagnosis;
  const mastered = countMastered(progress);

  const choose = (opt: string) => {
    if (answered) return;
    setPicked(opt);
    recordResult(c.id, opt === c.diagnosis);
  };
  const goTo = (i: number) => {
    setPicked(null);
    setIdx(i);
  };
  const next = () => goTo((idx + 1) % CASES.length);

  return (
    <div className="max-w-[1100px] mx-auto px-3 sm:px-5 py-4">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/ecg" className="text-sky-400 text-sm font-bold hover:text-sky-300">
              ← Engine
            </Link>
            <h1 className="text-xl font-black text-white">Case review</h1>
          </div>
          <p className="text-xs text-slate-400">
            Read the tracing, measure with the calipers, then commit to a diagnosis.
          </p>
        </div>
        <div className="bg-slate-900/60 ring-1 ring-slate-800 rounded-xl px-4 py-2 text-center">
          <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold">Mastered</span>
          <span className="text-lg font-black text-emerald-400 tabular-nums">
            {mastered}
            <span className="text-slate-500 text-sm">/{CASES.length}</span>
          </span>
        </div>
      </header>

      {/* case navigator */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {CASES.map((cc, i) => {
          const done = progress[cc.id]?.correct;
          const active = i === idx;
          return (
            <button
              key={cc.id}
              onClick={() => goTo(i)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                active
                  ? "bg-sky-500 text-white ring-2 ring-sky-300"
                  : done
                    ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-600"
                    : "bg-slate-800 text-slate-400 ring-1 ring-slate-700 hover:bg-slate-700"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* tracing + calipers */}
      <div className="bg-slate-900/60 ring-1 ring-slate-800 rounded-xl p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200">
            Case {idx + 1} · 12-lead
          </h2>
          <span className="text-[10px] text-slate-500">25 mm/s · 10 mm/mV · synthesised</span>
        </div>
        <TracingView model={model} tMs={0} elapsedMs={0} leads={frozenLeads} frozen />
        <CaliperStrip model={model} lead="II" durationSec={5} />
        <p className="text-[11px] text-slate-500">
          Drag the two blue calipers on the rhythm strip to measure any interval
          (ms · small boxes · rate).
        </p>
      </div>

      {/* question */}
      <div className="bg-slate-900/60 ring-1 ring-slate-800 rounded-xl p-4 mt-3">
        <h3 className="text-sm font-bold text-slate-200 mb-3">
          What is the diagnosis?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {options.map((opt) => {
            const isCorrect = opt === c.diagnosis;
            const isPicked = opt === picked;
            let tone =
              "bg-slate-800 text-slate-200 ring-slate-700 hover:bg-slate-700";
            if (answered && isCorrect)
              tone = "bg-emerald-500/20 text-emerald-200 ring-emerald-500";
            else if (answered && isPicked)
              tone = "bg-rose-500/20 text-rose-200 ring-rose-500";
            else if (answered) tone = "bg-slate-800/50 text-slate-500 ring-slate-800";
            return (
              <button
                key={opt}
                onClick={() => choose(opt)}
                disabled={answered}
                className={`text-left text-sm font-semibold px-3 py-2.5 rounded-lg ring-1 transition-colors ${tone}`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="mt-4">
            <p className={`text-sm font-black ${correct ? "text-emerald-400" : "text-rose-400"}`}>
              {correct ? "Correct" : `Not quite — it's ${c.diagnosis}.`}
            </p>

            {/* measured read-outs */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
              <Read k="Rate" v={`${meas.rateBpm} bpm`} />
              <Read k="PR" v={`${meas.prMs} ms`} />
              <Read k="QRS" v={`${meas.qrsMs} ms`} />
              <Read k="QTc" v={`${meas.qtcMs} ms`} />
              <Read k="Axis" v={`${meas.frontalAxisDeg >= 0 ? "+" : ""}${meas.frontalAxisDeg}°`} />
              <Read k="Sokolow-Lyon" v={`${sl.toFixed(1)} mV`} />
            </div>

            <ul className="mt-3 flex flex-wrap gap-2">
              {c.keyFindings.map((f) => (
                <li key={f} className="text-[11px] font-semibold text-slate-200 bg-slate-800 ring-1 ring-slate-700 rounded px-2 py-1">
                  {f}
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-slate-300 leading-relaxed mt-3 max-w-3xl">{c.teaching}</p>

            <button
              onClick={next}
              className="mt-4 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold"
            >
              Next case →
            </button>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-500 mt-4 leading-relaxed max-w-3xl">
        These are physiologically synthesised teaching cases generated by the same
        vector engine, presented without their labels. Real PhysioNet records
        (PTB-XL / MIT-BIH) can be added through the same case interface once their
        signal data is bundled.
      </p>
    </div>
  );
}

function Read({ k, v }: { k: string; v: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{k}</span>
      <span className="font-mono text-slate-200">{v}</span>
    </span>
  );
}
