import React, { useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { groupBy } from "@/lib/analytics";

const PALETTE = ["#0f172a", "#475569", "#94a3b8", "#cbd5e1", "#64748b", "#334155", "#1e293b", "#5b6b7c"];

export default function DataCharts({ dataset }) {
  const numericCols = dataset.columns.filter((c) => c.type === "number").map((c) => c.name);
  const allCols = dataset.columns.map((c) => c.name);
  const [xCol, setXCol] = useState(allCols[0] || "");
  const [yCol, setYCol] = useState(numericCols[0] || "");
  const [agg, setAgg] = useState("sum");
  const [chartType, setChartType] = useState("bar");

  const data = useMemo(() => {
    if (!xCol || !yCol) return [];
    if (chartType === "scatter") {
      return dataset.rows.map((r) => ({ x: Number(r[xCol]), y: Number(r[yCol]) })).filter((p) => isFinite(p.x) && isFinite(p.y));
    }
    const g = groupBy(dataset.rows, xCol, yCol, agg);
    return g.slice(0, 20).map((d) => ({ name: String(d.key).slice(0, 24), value: d.value }));
  }, [dataset, xCol, yCol, agg, chartType]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <Field label="Chart type">
          <select value={chartType} onChange={(e) => setChartType(e.target.value)} className="select">
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="scatter">Scatter</option>
            <option value="pie">Pie</option>
          </select>
        </Field>
        <Field label={chartType === "scatter" ? "X axis (numeric)" : "Group by"}>
          <select value={xCol} onChange={(e) => setXCol(e.target.value)} className="select">
            {allCols.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Y axis (numeric)">
          <select value={yCol} onChange={(e) => setYCol(e.target.value)} className="select">
            {numericCols.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        {chartType !== "scatter" && chartType !== "pie" && (
          <Field label="Aggregation">
            <select value={agg} onChange={(e) => setAgg(e.target.value)} className="select">
              <option value="sum">Sum</option>
              <option value="mean">Mean</option>
              <option value="count">Count</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
            </select>
          </Field>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        {data.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted-foreground">Select numeric columns to plot.</p>
        ) : (
          <ResponsiveContainer width="100%" height={380}>
            {chartType === "bar" ? (
              <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#0f172a" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : chartType === "line" ? (
              <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            ) : chartType === "scatter" ? (
              <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="x" name={xCol} tick={{ fontSize: 11 }} type="number" />
                <YAxis dataKey="y" name={yCol} tick={{ fontSize: 11 }} type="number" />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={data} fill="#0f172a" />
              </ScatterChart>
            ) : (
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={140} label={{ fontSize: 11 }}>
                  {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}