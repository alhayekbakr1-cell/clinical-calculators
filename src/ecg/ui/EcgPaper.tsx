import { Fragment } from "react";

/**
 * Classic pink ECG graph paper, drawn in millimetre units so it is exactly to
 * scale: 1 small box = 1 mm = 0.04 s (at 25 mm/s) / 0.1 mV (at 10 mm/mV), and
 * 1 large box = 5 mm = 0.2 s / 0.5 mV. Use inside an SVG whose viewBox is in mm.
 */
export function EcgPaper({
  widthMm,
  heightMm,
  idPrefix,
}: {
  widthMm: number;
  heightMm: number;
  idPrefix: string;
}) {
  const minorId = `${idPrefix}-minor`;
  const majorId = `${idPrefix}-major`;
  return (
    <Fragment>
      <defs>
        <pattern id={minorId} width={1} height={1} patternUnits="userSpaceOnUse">
          <path
            d={`M 1 0 L 0 0 0 1`}
            fill="none"
            stroke="#f4c9d2"
            strokeWidth={0.07}
          />
        </pattern>
        <pattern id={majorId} width={5} height={5} patternUnits="userSpaceOnUse">
          <rect width={5} height={5} fill={`url(#${minorId})`} />
          <path
            d={`M 5 0 L 0 0 0 5`}
            fill="none"
            stroke="#e79aa7"
            strokeWidth={0.18}
          />
        </pattern>
      </defs>
      <rect x={0} y={0} width={widthMm} height={heightMm} fill="#fff6f8" />
      <rect
        x={0}
        y={0}
        width={widthMm}
        height={heightMm}
        fill={`url(#${majorId})`}
      />
    </Fragment>
  );
}
