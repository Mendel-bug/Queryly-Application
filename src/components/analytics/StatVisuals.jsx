import React, { useEffect, useMemo, useState } from "react";
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { descriptiveStats, histogram, numericVector } from "@/lib/stats";
import { fmt } from "@/lib/analytics";
import { BarChart3 } from "lucide-react";

const STAT_CARDS = [
  { key: "mean", label: "Mean", symbol: "μ", from: "#6366f1", to: "#a855f7" },
  { key: "median", label: "Median", symbol: "M", from: "#0ea5e9", to: "#06b6d4" },
  { key: "q1", label: "Lower Quartile", symbol: "Q₁", from: "#10b981", to: "#14b8a6" },
  { key: "q3", label: "Upper Quartile", symbol: "Q₃", from: "#f59e0b", to: "#f97316" },
  { key: "stdDev", label: "Std Deviation", symbol: "σ", from: "#f43f5e", to: "#ec4899" },
  { key: "variance", label: "Variance", symbol: "σ²", from: "#d946ef", to: "#8b5cf6" },
  { key: "iqr", label: "IQR", symbol: "IQR", from: "#8b5cf6", to: "#6366f1" },
  { key: "range", label: "Range", symbol: "R", from: "#3b82f6", to: "#0ea5e9" },
];

const BAR_COLORS = ["#6366f1", "#a855f7", "#ec4899", "#f43f5e", "#f59e0b", "#10b981", "#14b8a6", "#0ea5e9", "#3b82f6", "#8b5cf6", "#d946ef", "#f97316"];

export default function StatVisuals({ dataset, numericCols }) {
  const [col, setCol] = useState(numericCols[0] || "");

  useEffect(() => {
    if (!numericCols.includes(col)) setCol(numericCols[0] || "");
  }, [numericCols, col]);

  const stats = useMemo(() => (col ? descriptiveStats(dataset.rows, col) : null), [dataset, col]);
  const hist = useMemo(() => (col ? histogram(dataset.rows, col, 12) : []), [dataset, col]);

  if (!numericCols.length || !stats) return null;

  const histData = hist.map((h) => ({ x: (h.x0 + h.x1) / 2, count: h.count, label: h.label }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-base font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-indigo-500" /> Statistical Visualizations
        </h2>
        <select value={col} onChange={(e) => setCol(e.target.value)} className="select max-w-[180px]">
          {numericCols.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Gradient stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {STAT_CARDS.map((s) => (
          <div
            key={s.key}
            className="relative overflow-hidden rounded-2xl p-4 text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }}
          >
            <div className="absolute -right-2 -top-2 text-5xl font-bold opacity-20">{s.symbol}</div>
            <p className="text-[11px] uppercase tracking-wide opacity-90">{s.label}</p>
            <p className="mt-3 font-mono text-2xl font-bold drop-shadow">{fmt(stats[s.key])}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Box Plot & Quartiles</h3>
          <BoxPlot stats={stats} />
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Distribution · Mean / Median / ±1 SD</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={histData} margin={{ top: 10, right: 12, bottom: 24, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="x" type="number" domain={[stats.min, stats.max]} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(v) => `≈ ${fmt(v)}`} />
                <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                  {histData.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
                <ReferenceLine x={stats.mean - stats.stdDev} stroke="#f97316" strokeDasharray="5 3" />
                <ReferenceLine x={stats.mean + stats.stdDev} stroke="#f97316" strokeDasharray="5 3" />
                <ReferenceLine x={stats.mean} stroke="#22c55e" strokeWidth={2} label={{ value: "Mean", fontSize: 10, fill: "#22c55e", position: "top" }} />
                <ReferenceLine x={stats.median} stroke="#0ea5e9" strokeWidth={2} label={{ value: "Median", fontSize: 10, fill: "#0ea5e9", position: "bottom" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function BoxPlot({ stats }) {
  const { min, max, q1, q3, median, mean, stdDev } = stats;
  const VB_W = 400, pad = 36, span = (max - min) || 1;
  const x = (v) => pad + ((v - min) / span) * (VB_W - 2 * pad);
  const lowSD = mean - stdDev, highSD = mean + stdDev;

  return (
    <div>
      <svg viewBox={`0 0 ${VB_W} 110`} className="w-full" style={{ height: 170 }}>
        <defs>
          <linearGradient id="boxgrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>

        {/* ±1 SD band */}
        <rect x={x(lowSD)} y={20} width={Math.max(0, x(highSD) - x(lowSD))} height={50} rx={6} fill="#f97316" opacity="0.18" />

        {/* Whisker line + caps */}
        <line x1={x(min)} y1={45} x2={x(max)} y2={45} stroke="#94a3b8" strokeWidth="1.5" />
        <line x1={x(min)} y1={36} x2={x(min)} y2={54} stroke="#94a3b8" strokeWidth="1.5" />
        <line x1={x(max)} y1={36} x2={x(max)} y2={54} stroke="#94a3b8" strokeWidth="1.5" />

        {/* IQR box */}
        <rect x={x(q1)} y={28} width={Math.max(0, x(q3) - x(q1))} height={34} rx={5} fill="url(#boxgrad)" opacity="0.92" />
        {/* Median line */}
        <line x1={x(median)} y1={24} x2={x(median)} y2={66} stroke="#fff" strokeWidth="2.5" />
        {/* Mean dot */}
        <circle cx={x(mean)} cy={45} r={5} fill="#fff" stroke="#22c55e" strokeWidth="2.5" />

        {/* Labels */}
        {[
          { v: min, label: "Min" },
          { v: q1, label: "Q1" },
          { v: median, label: "Median" },
          { v: mean, label: "Mean" },
          { v: q3, label: "Q3" },
          { v: max, label: "Max" },
        ].map((m) => (
          <g key={m.label}>
            <text x={x(m.v)} y={82} textAnchor="middle" fontSize="10" fill="#475569">{m.label}</text>
            <text x={x(m.v)} y={96} textAnchor="middle" fontSize="10" fontFamily="monospace" fill="#0f172a" fontWeight="600">{fmt(m.v)}</text>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <Legend color="#6366f1" label="IQR (Q1–Q3)" />
        <Legend color="#22c55e" label="Mean" dot />
        <Legend color="#0ea5e9" label="Median" line />
        <Legend color="#f97316" label="±1 Std Dev" band />
      </div>
    </div>
  );
}

function Legend({ color, label, dot, line, band }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {dot && <span className="h-3 w-3 rounded-full border-2" style={{ borderColor: color, background: "#fff" }} />}
      {line && <span className="h-3 w-1 rounded" style={{ background: color }} />}
      {band && <span className="h-2 w-4 rounded" style={{ background: color, opacity: 0.4 }} />}
      {!dot && !line && !band && <span className="h-3 w-3 rounded" style={{ background: color }} />}
      {label}
    </span>
  );
}