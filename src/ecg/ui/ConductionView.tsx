"use client";

import type { ConductionState } from "@/ecg/engine";

// Schematic anchor points (viewBox 0 0 200 240).
const PT = {
  sa: { x: 64, y: 56 },
  av: { x: 100, y: 122 },
  hisTop: { x: 100, y: 132 },
  bifurc: { x: 100, y: 152 },
  rbb: { x: 72, y: 200 },
  lbb: { x: 128, y: 200 },
  apex: { x: 100, y: 216 },
};

const DEPOL = "#f59e0b";
const DEPOL_DIM = "#b45309";
const REPOL = "#2dd4bf";
const SPARK = "#fde047";

function lerp(a: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Where the activation wavefront is right now, for the traveling spark. */
function wavefront(state: ConductionState): { x: number; y: number } | null {
  const p = state.progress;
  switch (state.phase) {
    case "saFire":
      return PT.sa;
    case "atrial":
      return lerp(PT.sa, PT.av, p);
    case "avDelay":
      return PT.av;
    case "hisPurkinje":
      return lerp(PT.hisTop, PT.bifurc, p);
    case "ventricular":
      return lerp(PT.bifurc, PT.apex, Math.min(1, p * 1.2));
    default:
      return null;
  }
}

const BLOCK = "#ef4444";

export function ConductionView({
  state,
  block,
}: {
  state: ConductionState;
  block?: string;
}) {
  const on = (id: string) => state.active.includes(id);
  const repol = state.phase === "repolarization";
  const plateau = state.phase === "plateau";
  const avBlocked = on("avBlock");

  // Persistent conduction-block highlight (independent of the wavefront phase).
  const rbbBlocked = !!block && block.startsWith("RBBB");
  const lbbBlocked = block === "LBBB";
  const lafb = !!block && block.includes("LAFB");
  const lpfb = !!block && block.includes("LPFB");
  const rbbStroke = rbbBlocked ? BLOCK : on("rbb") ? SPARK : "#64748b";
  const lbbStroke = lbbBlocked ? BLOCK : on("lbb") ? SPARK : "#64748b";

  const atriaFill = on("ra") || on("la") ? DEPOL : "#1f2937";
  const ventFill = repol ? REPOL : on("lv") || on("rv") ? DEPOL : plateau ? DEPOL_DIM : "#1f2937";
  const septFill = on("septum") ? DEPOL : repol ? REPOL : "#27303f";

  const spark = wavefront(state);

  return (
    <svg viewBox="0 0 200 240" className="w-full h-full">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ---- Atria ---- */}
      <ellipse
        cx={64}
        cy={78}
        rx={36}
        ry={28}
        fill={on("ra") ? DEPOL : "#1f2937"}
        stroke="#475569"
        strokeWidth={1.5}
        opacity={0.92}
      />
      <ellipse
        cx={136}
        cy={76}
        rx={36}
        ry={28}
        fill={on("la") ? DEPOL : "#1f2937"}
        stroke="#475569"
        strokeWidth={1.5}
        opacity={0.92}
      />
      <text x={48} y={80} fill="#94a3b8" fontSize={9} fontWeight={700}>RA</text>
      <text x={140} y={78} fill="#94a3b8" fontSize={9} fontWeight={700}>LA</text>

      {/* ---- Ventricles (two halves + septum) ---- */}
      {/* RV (screen left) */}
      <path
        d="M 100 120 C 60 120 38 140 40 170 C 42 200 70 224 100 224 Z"
        fill={repol ? REPOL : on("rv") ? DEPOL : plateau ? DEPOL_DIM : "#1f2937"}
        stroke="#475569"
        strokeWidth={1.5}
        opacity={0.92}
      />
      {/* LV (screen right, larger) */}
      <path
        d="M 100 120 C 144 120 168 142 166 174 C 164 204 132 226 100 224 Z"
        fill={repol ? REPOL : on("lv") ? DEPOL : plateau ? DEPOL_DIM : "#1f2937"}
        stroke="#475569"
        strokeWidth={1.5}
        opacity={0.92}
      />
      {/* septum */}
      <path d="M 100 122 L 100 220" stroke={septFill} strokeWidth={5} strokeLinecap="round" />
      <text x={56} y={186} fill="#94a3b8" fontSize={9} fontWeight={700}>RV</text>
      <text x={132} y={186} fill="#94a3b8" fontSize={9} fontWeight={700}>LV</text>

      {/* ---- Conduction system ---- */}
      {/* SA node */}
      <circle
        cx={PT.sa.x}
        cy={PT.sa.y}
        r={6}
        fill={on("sa") ? SPARK : "#64748b"}
        filter={on("sa") ? "url(#glow)" : undefined}
      />
      <text x={PT.sa.x - 22} y={PT.sa.y - 6} fill="#94a3b8" fontSize={8} fontWeight={700}>SA</text>

      {/* internodal path SA -> AV */}
      <path
        d={`M ${PT.sa.x} ${PT.sa.y} Q 92 92 ${PT.av.x} ${PT.av.y}`}
        fill="none"
        stroke="#475569"
        strokeWidth={1.4}
        strokeDasharray="3 3"
      />

      {/* AV node */}
      <ellipse
        cx={PT.av.x}
        cy={PT.av.y}
        rx={8}
        ry={5}
        fill={avBlocked ? BLOCK : on("av") ? SPARK : "#64748b"}
        filter={on("av") || avBlocked ? "url(#glow)" : undefined}
      />
      {avBlocked && (
        <line
          x1={PT.av.x - 9}
          y1={PT.av.y + 5}
          x2={PT.av.x + 9}
          y2={PT.av.y - 5}
          stroke="#fee2e2"
          strokeWidth={2}
        />
      )}
      <text x={PT.av.x + 11} y={PT.av.y + 2} fill="#94a3b8" fontSize={8} fontWeight={700}>AV</text>

      {/* His bundle */}
      <line
        x1={PT.hisTop.x}
        y1={PT.hisTop.y}
        x2={PT.bifurc.x}
        y2={PT.bifurc.y}
        stroke={on("his") ? SPARK : "#64748b"}
        strokeWidth={3}
        filter={on("his") ? "url(#glow)" : undefined}
      />

      {/* bundle branches */}
      <path
        d={`M ${PT.bifurc.x} ${PT.bifurc.y} L ${PT.rbb.x} ${PT.rbb.y}`}
        fill="none"
        stroke={rbbStroke}
        strokeWidth={2.4}
        filter={on("rbb") || rbbBlocked ? "url(#glow)" : undefined}
      />
      <path
        d={`M ${PT.bifurc.x} ${PT.bifurc.y} L ${PT.lbb.x} ${PT.lbb.y}`}
        fill="none"
        stroke={lbbStroke}
        strokeWidth={2.4}
        filter={on("lbb") || lbbBlocked ? "url(#glow)" : undefined}
      />

      {/* left anterior / posterior fascicles (off the LBB) */}
      <line x1={120} y1={185} x2={142} y2={173} stroke={lafb ? BLOCK : "#475569"} strokeWidth={lafb ? 2.2 : 1.4} filter={lafb ? "url(#glow)" : undefined} />
      <line x1={120} y1={185} x2={126} y2={209} stroke={lpfb ? BLOCK : "#475569"} strokeWidth={lpfb ? 2.2 : 1.4} filter={lpfb ? "url(#glow)" : undefined} />

      {/* block "X" markers */}
      {rbbBlocked && <BlockX x={86} y={176} />}
      {lbbBlocked && <BlockX x={114} y={176} />}

      {/* Purkinje fans */}
      {on("purkinje") &&
        [-16, -8, 0, 8, 16].map((dx, i) => (
          <line
            key={i}
            x1={PT.rbb.x}
            y1={PT.rbb.y}
            x2={PT.rbb.x + dx}
            y2={PT.rbb.y + 12}
            stroke={SPARK}
            strokeWidth={1}
            opacity={0.8}
          />
        ))}

      {/* ---- traveling wavefront spark ---- */}
      {spark && (
        <circle cx={spark.x} cy={spark.y} r={4.5} fill={SPARK} filter="url(#glow)" />
      )}
    </svg>
  );
}

function BlockX({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="#fecaca" strokeWidth={2} strokeLinecap="round">
      <line x1={x - 5} y1={y - 5} x2={x + 5} y2={y + 5} />
      <line x1={x - 5} y1={y + 5} x2={x + 5} y2={y - 5} />
    </g>
  );
}
