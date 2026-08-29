"use client";

import { useMemo, useRef, useState } from "react";
import {
  CALIBRATION,
  leadsAt,
  type CardiacModel,
  type LeadName,
} from "@/ecg/engine";
import { EcgPaper } from "./EcgPaper";

const GAIN = CALIBRATION.gainMmPerMv; // 10 mm/mV
const SPEED = CALIBRATION.paperSpeedMmPerSec; // 25 mm/s
const H = 24; // mm
const BASE_Y = H / 2;

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * A static rhythm strip with two draggable calipers. Distance is reported in
 * ms (1 mm = 40 ms at 25 mm/s), small boxes, and — since two beats apart — a
 * heart rate. Real ECG measurement, on the same to-scale paper.
 */
export function CaliperStrip({
  model,
  lead = "II",
  durationSec = 5,
}: {
  model: CardiacModel;
  lead?: LeadName;
  durationSec?: number;
}) {
  const widthMm = durationSec * SPEED;
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<null | "a" | "b">(null);
  const [xa, setXa] = useState(widthMm * 0.28);
  const [xb, setXb] = useState(widthMm * 0.44);

  const path = useMemo(() => {
    const n = Math.round(durationSec * 500); // 2 ms resolution
    let d = "";
    for (let i = 0; i <= n; i++) {
      const tMs = (i / n) * durationSec * 1000;
      const v = leadsAt(model, tMs)[lead];
      const x = (i / n) * widthMm;
      const y = BASE_Y - v * GAIN;
      d += (i === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2) + " ";
    }
    return d;
  }, [model, lead, durationSec, widthMm]);

  const toMm = (clientX: number) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return 0;
    return clamp(((clientX - r.left) / r.width) * widthMm, 0, widthMm);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const mm = toMm(e.clientX);
    if (drag.current === "a") setXa(mm);
    else setXb(mm);
  };
  const startDrag =
    (which: "a" | "b") => (e: React.PointerEvent) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      drag.current = which;
    };
  const endDrag = () => {
    drag.current = null;
  };

  const dMm = Math.abs(xb - xa);
  const ms = Math.round(dMm * 40);
  const smallBoxes = (dMm / 1).toFixed(1);
  const rate = ms > 0 ? Math.round(60000 / ms) : 0;
  const left = Math.min(xa, xb);
  const right = Math.max(xa, xb);

  const Handle = ({ x, which }: { x: number; which: "a" | "b" }) => (
    <g
      onPointerDown={startDrag(which)}
      onPointerMove={onMove}
      onPointerUp={endDrag}
      style={{ cursor: "ew-resize", touchAction: "none" }}
    >
      {/* wide invisible hit area for easy grabbing */}
      <rect x={x - 3} y={0} width={6} height={H} fill="transparent" />
      <line x1={x} y1={0} x2={x} y2={H} stroke="#0369a1" strokeWidth={0.3} />
      <circle cx={x} cy={2} r={1.4} fill="#0284c7" />
      <circle cx={x} cy={H - 2} r={1.4} fill="#0284c7" />
    </g>
  );

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${widthMm} ${H}`}
        className="w-full h-auto block rounded-sm ring-1 ring-rose-200/60 touch-none"
        preserveAspectRatio="none"
      >
        <EcgPaper widthMm={widthMm} heightMm={H} idPrefix="cal" />
        <line x1={0} y1={BASE_Y} x2={widthMm} y2={BASE_Y} stroke="#c98b97" strokeWidth={0.06} />
        <path d={path} fill="none" stroke="#101418" strokeWidth={0.35} />
        {/* measured span */}
        <rect x={left} y={0} width={right - left} height={H} fill="#0ea5e9" opacity={0.08} />
        <line x1={left} y1={3} x2={right} y2={3} stroke="#0369a1" strokeWidth={0.25} />
        <Handle x={xa} which="a" />
        <Handle x={xb} which="b" />
      </svg>

      <span className="absolute top-1 left-1.5 text-[11px] font-bold text-slate-700 bg-white/80 px-1 rounded">
        {lead} · calipers
      </span>
      <div className="absolute top-1 right-2 flex items-center gap-2 bg-white/85 px-2 py-0.5 rounded text-slate-800">
        <span className="text-sm font-black tabular-nums">{ms} ms</span>
        <span className="text-[10px] text-slate-500">{smallBoxes} sm · {rate} bpm</span>
      </div>
    </div>
  );
}
