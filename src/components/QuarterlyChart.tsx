"use client";

import { useMemo, useRef, useState } from "react";

export type ChartSeries = { name: string; color: string; values: number[] }; // dollars
export type ChartProps = { labels: string[]; series: ChartSeries[] };

const W = 640;
const H = 220;
const PAD = { top: 12, right: 88, bottom: 24, left: 44 };

function fmt(v: number): string {
  if (Math.abs(v) >= 1000) return "$" + (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + "k";
  return "$" + Math.round(v).toLocaleString();
}

export default function QuarterlyChart({ labels, series }: ChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { max, min, xs, ys, ticks } = useMemo(() => {
    const all = series.flatMap((s) => s.values);
    const max = Math.max(1, ...all);
    const min = Math.min(0, ...all);
    const iw = W - PAD.left - PAD.right;
    const ih = H - PAD.top - PAD.bottom;
    const n = Math.max(1, labels.length - 1);
    const xs = labels.map((_, i) => PAD.left + (i / n) * iw);
    const y = (v: number) => PAD.top + ih - ((v - min) / (max - min)) * ih;
    const ys = series.map((s) => s.values.map(y));
    const tickVals = [min, min + (max - min) / 2, max];
    const ticks = tickVals.map((v) => ({ v, y: y(v) }));
    return { max, min, xs, ys, ticks };
  }, [labels, series]);

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestD = Infinity;
    xs.forEach((x, i) => {
      const d = Math.abs(x - px);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setHover(best);
  }

  if (labels.length === 0) return null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full select-none"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Quarterly wallet balances"
      >
        {/* grid */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} stroke="#E9E8E3" strokeWidth={1} />
            <text x={PAD.left - 8} y={t.y + 3} textAnchor="end" fontSize={10} fill="#AEAEB2">
              {fmt(t.v)}
            </text>
          </g>
        ))}
        {/* x labels: first, middle, last */}
        {[0, Math.floor((labels.length - 1) / 2), labels.length - 1]
          .filter((v, i, a) => a.indexOf(v) === i)
          .map((i) => (
            <text key={i} x={xs[i]} y={H - 6} textAnchor="middle" fontSize={10} fill="#AEAEB2">
              {labels[i]}
            </text>
          ))}
        {/* crosshair */}
        {hover !== null && (
          <line
            x1={xs[hover]}
            x2={xs[hover]}
            y1={PAD.top}
            y2={H - PAD.bottom}
            stroke="#AEAEB2"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}
        {/* lines */}
        {series.map((s, si) => (
          <g key={s.name}>
            <path
              d={xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[si][i]}`).join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* direct label at line end */}
            <text
              x={W - PAD.right + 8}
              y={ys[si][labels.length - 1] + 3 + (si === 1 ? 4 : si === 2 ? -4 : 0)}
              fontSize={11}
              fontWeight={600}
              fill="#1D1D1F"
            >
              <tspan fill={s.color}>●</tspan> {s.name}
            </text>
            {hover !== null && (
              <circle cx={xs[hover]} cy={ys[si][hover]} r={4} fill={s.color} stroke="#FFFFFF" strokeWidth={2} />
            )}
          </g>
        ))}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-1 rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-card"
          style={{
            left: `${(xs[hover] / W) * 100}%`,
            transform: xs[hover] > W / 2 ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
          }}
        >
          <p className="mb-1 font-semibold text-ink">{labels[hover]}</p>
          {series.map((s) => (
            <p key={s.name} className="flex items-center gap-2 text-ink">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
              <span className="text-sub">{s.name}</span>
              <span className="tnum ml-auto pl-3 font-medium">{fmt(s.values[hover])}</span>
            </p>
          ))}
        </div>
      )}

      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-faint">View as table</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-sub">
                <th className="py-1 pr-3 font-medium">Week</th>
                {series.map((s) => (
                  <th key={s.name} className="py-1 pr-3 font-medium">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((l, i) => (
                <tr key={l} className="border-t border-line">
                  <td className="py-1 pr-3 text-sub">{l}</td>
                  {series.map((s) => (
                    <td key={s.name} className="tnum py-1 pr-3">
                      {fmt(s.values[i])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
