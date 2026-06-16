"use client";

import { useMemo } from "react";
import {
  LIMB_LEAD_ANGLES_DEG,
  heartVectorAt,
  type CardiacModel,
  type LeadVoltages,
  type LimbLeadName,
  type Measurements,
  type Vec3,
} from "@/ecg/engine";

const DEG = Math.PI / 180;
const SCALE = 55; // px per mV
const AXIS_LEN = 92;
const VIEW = 110;

// Frontal unit direction for a hexaxial angle (x:left, y:inferior/down).
function dir(lead: LimbLeadName): { dx: number; dy: number } {
  const a = LIMB_LEAD_ANGLES_DEG[lead] * DEG;
  return { dx: Math.cos(a), dy: Math.sin(a) };
}

function loopPoints(
  model: CardiacModel,
  from: number,
  to: number,
  n = 60,
): string {
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const t = from + ((to - from) * i) / n;
    const v = heartVectorAt(model, t);
    pts.push(`${(v.x * SCALE).toFixed(1)},${(v.y * SCALE).toFixed(1)}`);
  }
  return pts.join(" ");
}

export function VectorView({
  model,
  m,
  leads,
  measurements,
}: {
  model: CardiacModel;
  m: Vec3;
  leads: LeadVoltages;
  measurements: Measurements;
}) {
  const L = model.landmarks;
  const loops = useMemo(
    () => ({
      p: loopPoints(model, L.pOnset, L.pEnd),
      qrs: loopPoints(model, L.qrsOnset, L.qrsEnd),
      t: loopPoints(model, L.tOnset, L.tEnd),
    }),
    [model, L.pOnset, L.pEnd, L.qrsOnset, L.qrsEnd, L.tOnset, L.tEnd],
  );

  const tipX = m.x * SCALE;
  const tipY = m.y * SCALE;
  const axisRad = measurements.frontalAxisDeg * DEG;

  const leadNames = Object.keys(LIMB_LEAD_ANGLES_DEG) as LimbLeadName[];

  return (
    <svg
      viewBox={`${-VIEW} ${-VIEW} ${VIEW * 2} ${VIEW * 2}`}
      className="w-full h-full"
    >
      <defs>
        <marker
          id="varrow"
          markerWidth={6}
          markerHeight={6}
          refX={4.5}
          refY={3}
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="#fde047" />
        </marker>
      </defs>

      {/* reference circle */}
      <circle cx={0} cy={0} r={AXIS_LEN} fill="none" stroke="#1e293b" strokeWidth={1} />

      {/* hexaxial axes + projection shadows */}
      {leadNames.map((lead) => {
        const { dx, dy } = dir(lead);
        const s = leads[lead]; // mV projection
        const sx = dx * s * SCALE;
        const sy = dy * s * SCALE;
        const positive = s >= 0;
        return (
          <g key={lead}>
            <line
              x1={-dx * AXIS_LEN}
              y1={-dy * AXIS_LEN}
              x2={dx * AXIS_LEN}
              y2={dy * AXIS_LEN}
              stroke="#334155"
              strokeWidth={0.8}
            />
            {/* projection shadow = this lead's instantaneous voltage on its axis */}
            <line
              x1={0}
              y1={0}
              x2={sx}
              y2={sy}
              stroke={positive ? "#34d399" : "#fb7185"}
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.9}
            />
            <text
              x={dx * (AXIS_LEN + 9)}
              y={dy * (AXIS_LEN + 9)}
              fill="#64748b"
              fontSize={9}
              fontWeight={700}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {lead}
            </text>
          </g>
        );
      })}

      {/* VCG loops */}
      <polyline points={loops.t} fill="none" stroke="#a855f7" strokeWidth={0.8} opacity={0.5} />
      <polyline points={loops.p} fill="none" stroke="#38bdf8" strokeWidth={0.8} opacity={0.6} />
      <polyline points={loops.qrs} fill="none" stroke="#f1f5f9" strokeWidth={1} opacity={0.55} />

      {/* mean QRS axis */}
      <line
        x1={0}
        y1={0}
        x2={Math.cos(axisRad) * AXIS_LEN}
        y2={Math.sin(axisRad) * AXIS_LEN}
        stroke="#f59e0b"
        strokeWidth={1}
        strokeDasharray="3 3"
        opacity={0.8}
      />

      {/* instantaneous heart vector */}
      <line
        x1={0}
        y1={0}
        x2={tipX}
        y2={tipY}
        stroke="#fde047"
        strokeWidth={3}
        markerEnd="url(#varrow)"
      />
      <circle cx={0} cy={0} r={2.5} fill="#fde047" />
    </svg>
  );
}
