"use client";

import { useMemo } from "react";
import {
  CALIBRATION,
  leadsAtAbs,
  pMarkers,
  type RhythmEngine,
} from "@/ecg/engine";
import { EcgPaper } from "./EcgPaper";

const GAIN = CALIBRATION.gainMmPerMv; // 10 mm/mV
const SPEED = CALIBRATION.paperSpeedMmPerSec; // 25 mm/s
const PANEL_H = 24; // mm
const BASE_Y = 15; // baseline (leaves room for P markers on top)
const STEP_MS = 6;

export function RhythmStrip({
  engine,
  elapsedMs,
  loopMs,
  widthMm = 200,
}: {
  engine: RhythmEngine;
  elapsedMs: number;
  loopMs: number;
  widthMm?: number;
}) {
  const loopWidthMm = (loopMs / 1000) * SPEED;

  // Build one loop of Lead II + the P markers (memoized per rhythm).
  const { path, markers } = useMemo(() => {
    const n = Math.floor(loopMs / STEP_MS);
    let d = "";
    for (let i = 0; i <= n; i++) {
      const t = i * STEP_MS;
      const x = (t / 1000) * SPEED;
      const y = BASE_Y - leadsAtAbs(engine, t).II * GAIN;
      d += (i === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2) + " ";
    }
    const markers = pMarkers(engine, 0, loopMs).map((mk) => ({
      x: (mk.onset / 1000) * SPEED,
      conducts: mk.conducts,
    }));
    return { path: d, markers };
  }, [engine, loopMs]);

  const xNow = ((elapsedMs / 1000) * SPEED) % loopWidthMm;
  const tx = widthMm - xNow;
  const tiles = [-2, -1, 0];

  return (
    <svg
      viewBox={`0 0 ${widthMm} ${PANEL_H}`}
      className="w-full h-auto block rounded-sm ring-1 ring-rose-200/60"
      preserveAspectRatio="none"
    >
      <EcgPaper widthMm={widthMm} heightMm={PANEL_H} idPrefix="rhythm" />
      <clipPath id="rhythmClip">
        <rect x={0} y={0} width={widthMm} height={PANEL_H} />
      </clipPath>
      <g clipPath="url(#rhythmClip)">
        <g transform={`translate(${tx.toFixed(2)},0)`}>
          {tiles.map((k) => (
            <g key={k} transform={`translate(${k * loopWidthMm},0)`}>
              <path d={path} fill="none" stroke="#101418" strokeWidth={0.35} />
              {markers.map((mk, idx) => (
                <g key={idx} transform={`translate(${mk.x},0)`}>
                  {/* P marker arrow */}
                  <path
                    d={`M -1 1.5 L 1 1.5 L 0 3.2 Z`}
                    fill={mk.conducts ? "#2563eb" : "#ef4444"}
                  />
                  {!mk.conducts && (
                    <text
                      x={0}
                      y={1}
                      fill="#ef4444"
                      fontSize={2.4}
                      fontWeight={700}
                      textAnchor="middle"
                    >
                      ✗
                    </text>
                  )}
                </g>
              ))}
            </g>
          ))}
        </g>
      </g>
      {/* "now" edge */}
      <line x1={widthMm} y1={0} x2={widthMm} y2={PANEL_H} stroke="#0ea5e9" strokeWidth={0.25} />
    </svg>
  );
}
