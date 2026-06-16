"use client";

import { useMemo } from "react";
import {
  CALIBRATION,
  LEAD_GRID,
  LEAD_ORDER,
  leadsAt,
  type CardiacModel,
  type LeadName,
  type LeadVoltages,
} from "@/ecg/engine";
import { EcgPaper } from "./EcgPaper";

const GAIN = CALIBRATION.gainMmPerMv; // 10 mm/mV
const SPEED = CALIBRATION.paperSpeedMmPerSec; // 25 mm/s
const PANEL_H = 26; // mm  (+/- 1.3 mV)
const BASE_Y = PANEL_H / 2;
const SAMPLES = 320;

function buildPath(values: number[], beatWidthMm: number): string {
  let d = "";
  for (let i = 0; i < values.length; i++) {
    const x = (i / (values.length - 1)) * beatWidthMm;
    const y = BASE_Y - values[i] * GAIN;
    d += (i === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2) + " ";
  }
  return d;
}

function LeadPanel({
  lead,
  path,
  beatWidthMm,
  tMs,
  rrMs,
  current,
}: {
  lead: LeadName;
  path: string;
  beatWidthMm: number;
  tMs: number;
  rrMs: number;
  current: number;
}) {
  const cursorX = (tMs / rrMs) * beatWidthMm;
  const cursorY = BASE_Y - current * GAIN;
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${beatWidthMm} ${PANEL_H}`}
        className="w-full h-auto block rounded-sm ring-1 ring-rose-200/60"
        preserveAspectRatio="none"
      >
        <EcgPaper widthMm={beatWidthMm} heightMm={PANEL_H} idPrefix={`p-${lead}`} />
        {/* baseline */}
        <line
          x1={0}
          y1={BASE_Y}
          x2={beatWidthMm}
          y2={BASE_Y}
          stroke="#c98b97"
          strokeWidth={0.06}
        />
        <path d={path} fill="none" stroke="#101418" strokeWidth={0.35} />
        {/* sweep cursor */}
        <line
          x1={cursorX}
          y1={0}
          x2={cursorX}
          y2={PANEL_H}
          stroke="#0ea5e9"
          strokeWidth={0.18}
          opacity={0.9}
        />
        <circle cx={cursorX} cy={cursorY} r={0.55} fill="#0284c7" />
      </svg>
      <span className="absolute top-1 left-1.5 text-[11px] font-bold text-slate-700 bg-white/70 px-1 rounded">
        {lead}
      </span>
    </div>
  );
}

export function TracingView({
  model,
  tMs,
  elapsedMs,
  leads,
}: {
  model: CardiacModel;
  tMs: number;
  elapsedMs: number;
  leads: LeadVoltages;
}) {
  const rrMs = model.landmarks.rrMs;
  const beatWidthMm = (rrMs / 1000) * SPEED;

  // Sample all 12 leads across one cycle, build paths. Memoized per model.
  const paths = useMemo(() => {
    const series: Record<string, number[]> = {};
    for (const lead of LEAD_ORDER) series[lead] = [];
    for (let i = 0; i < SAMPLES; i++) {
      const t = (i / (SAMPLES - 1)) * rrMs;
      const v = leadsAt(model, t);
      for (const lead of LEAD_ORDER) series[lead].push(v[lead]);
    }
    const out: Record<string, string> = {};
    for (const lead of LEAD_ORDER) out[lead] = buildPath(series[lead], beatWidthMm);
    return out;
  }, [model, rrMs, beatWidthMm]);

  // Rhythm strip (Lead II), scrolling. Tile one beat and translate by elapsed.
  const stripWidthMm = 220;
  const offsetMm = ((elapsedMs / 1000) * SPEED) % beatWidthMm;
  const tileCount = Math.ceil(stripWidthMm / beatWidthMm) + 2;
  const stripBeatPath = paths.II;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-x-2 gap-y-1.5">
        {LEAD_GRID.flatMap((row) =>
          row.map((lead) => (
            <LeadPanel
              key={lead}
              lead={lead}
              path={paths[lead]}
              beatWidthMm={beatWidthMm}
              tMs={tMs}
              rrMs={rrMs}
              current={leads[lead]}
            />
          )),
        )}
      </div>

      {/* Lead II rhythm strip */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${stripWidthMm} ${PANEL_H}`}
          className="w-full h-auto block rounded-sm ring-1 ring-rose-200/60"
          preserveAspectRatio="none"
        >
          <EcgPaper widthMm={stripWidthMm} heightMm={PANEL_H} idPrefix="strip" />
          <clipPath id="stripClip">
            <rect x={0} y={0} width={stripWidthMm} height={PANEL_H} />
          </clipPath>
          <g clipPath="url(#stripClip)">
            <g transform={`translate(${-offsetMm},0)`}>
              {Array.from({ length: tileCount }).map((_, i) => (
                <path
                  key={i}
                  d={stripBeatPath}
                  transform={`translate(${i * beatWidthMm},0)`}
                  fill="none"
                  stroke="#101418"
                  strokeWidth={0.35}
                />
              ))}
            </g>
          </g>
          {/* 1 mV calibration pulse at the far left */}
          <path
            d={`M 1 ${BASE_Y} L 1 ${BASE_Y} L 1 ${BASE_Y - 10} L 4 ${BASE_Y - 10} L 4 ${BASE_Y}`}
            fill="none"
            stroke="#475569"
            strokeWidth={0.2}
          />
        </svg>
        <span className="absolute top-1 left-1.5 text-[11px] font-bold text-slate-700 bg-white/70 px-1 rounded">
          II · rhythm
        </span>
        <span className="absolute top-1 right-2 text-[10px] font-semibold text-slate-500 bg-white/70 px-1 rounded">
          25 mm/s · 10 mm/mV
        </span>
      </div>
    </div>
  );
}
