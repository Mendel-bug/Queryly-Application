import React, { useEffect, useMemo, useState } from "react";
import { useSelectedDataset } from "@/hooks/useSelectedDataset";
import DatasetPicker from "@/components/analytics/DatasetPicker";
import EmptyDataset from "@/components/analytics/EmptyDataset";
import { detectColumnType, toNumber, fmt } from "@/lib/analytics";
import { groupBy } from "@/lib/analytics";
import { histogram, percentile, numericVector, descriptiveStats } from "@/lib/stats";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, LineChart, Line, ScatterChart, Scatter, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Save, Trash2, Bookmark } from "lucide-react";

const PALETTE = ["#0f172a", "#475569", "#94a3b8", "#cbd5e1", "#64748b", "#334155", "#1e293b", "#5b6b7c"];
const TYPES = ["bar", "line", "scatter", "histogram", "box", "pie", "area"];

export default function Visualizations() {
  const { datasets, loading, dataset, select, selectedId } = useSelectedDataset();
  const [chartType, setChartType] = useState("bar");
  const [xCol, setXCol] = useState("");
  const [yCol, setYCol] = useState("");
  const [agg, setAgg] = useState("sum");
  const [bins, setBins] = useState(10);
  const [saved, setSaved] = useState([]);
  const [saving, setSaving] = useState("");

  const cols = dataset ? dataset.columns.map((c) => c.name) : [];
  const numericCols = useMemo(
    () => (dataset ? dataset.columns.filter((c) => c.type === "number" || detectColumnType(dataset.rows.map((r) => r[c.name])) === "number").map((c) => c.name) : []),
    [dataset]
  );

  useEffect(() => { if (!xCol) setXCol(cols[0] || ""); if (!yCol) setYCol(numericCols[0] || ""); }, [dataset, cols, numericCols]);
  useEffect(() => { loadSaved(); }, [selectedId]);

  async function loadSaved() {
    if (!selectedId) return setSaved([]);
    try {
      const list = await base44.entities.SavedChart.filter({ dataset_id: selectedId }, "-created_date", 50);
      setSaved(list);
    } catch { setSaved([]); }
  }

  async function saveChart() {
    if (!dataset || !saving.trim()) return;
    await base44.entities.SavedChart.create({ name: saving.trim(), dataset_id: selectedId, dataset_name: dataset.name, chart_type: chartType, config: { chartType, xCol, yCol, agg, bins } });
    setSaving("");
    loadSaved();
  }
  async function deleteSaved(id) { await base44.entities.SavedChart.delete(id); loadSaved(); }
  function applySaved(s) { setChartType(s.chart_type); setXCol(s.config.xCol || ""); setYCol(s.config.yCol || ""); setAgg(s.config.agg || "sum"); setBins(s.config.bins || 10); }

  if (!dataset) return <EmptyDataset datasets={datasets} loading={loading} value={selectedId} onChange={select} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Visualizations</h1>
          <p className="text-sm text-muted-foreground">Build charts from your actual dataset and save them.</p>
        </div>
        <DatasetPicker datasets={datasets} value={selectedId} onChange={select} loading={loading} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Chart type">
            <select value={chartType} onChange={(e) => setChartType(e.target.value)} className="select">
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          {chartType !== "histogram" && (
            <Field label={chartType === "scatter" ? "X axis (numeric)" : "Category (X)"}>
              <select value={xCol} onChange={(e) => setXCol(e.target.value)} className="select">
                {cols.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          )}
          <Field label={chartType === "histogram" ? "Numeric column" : "Value (Y, numeric)"}>
            <select value={yCol} onChange={(e) => setYCol(e.target.value)} className="select">
              {numericCols.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          {(chartType === "bar" || chartType === "line" || chartType === "pie" || chartType === "area") && (
            <Field label="Aggregation">
              <select value={agg} onChange={(e) => setAgg(e.target.value)} className="select">
                <option value="sum">Sum</option><option value="mean">Mean</option><option value="count">Count</option><option value="min">Min</option><option value="max">Max</option>
              </select>
            </Field>
          )}
          {chartType === "histogram" && (
            <Field label="Bins">
              <select value={bins} onChange={(e) => setBins(Number(e.target.value))} className="select">
                {[5, 10, 15, 20, 25].map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <ChartRenderer dataset={dataset} chartType={chartType} xCol={xCol} yCol={yCol} agg={agg} bins={bins} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-heading text-base font-semibold">Save this chart</h2>
        <div className="mt-3 flex gap-2">
          <input value={saving} onChange={(e) => setSaving(e.target.value)} placeholder="Chart name…" className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={saveChart} disabled={!saving.trim()} className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-40"><Save className="h-4 w-4" /> Save</button>
        </div>
        {saved.length > 0 && (
          <div className="mt-4 space-y-2">
            {saved.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                <Bookmark className="h-4 w-4 text-muted-foreground" />
                <button onClick={() => applySaved(s)} className="flex-1 text-left text-sm hover:underline">{s.name}</button>
                <span className="text-[10px] uppercase text-muted-foreground">{s.chart_type}</span>
                <button onClick={() => deleteSaved(s.id)} className="rounded p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (<label className="flex flex-col gap-1"><span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>{children}</label>);
}

function ChartRenderer({ dataset, chartType, xCol, yCol, agg, bins }) {
  if (!yCol && chartType !== "histogram") return <p className="py-20 text-center text-sm text-muted-foreground">Select columns to plot.</p>;
  if (chartType === "histogram") {
    const data = histogram(dataset.rows, yCol, bins);
    return <ResponsiveContainer width="100%" height={380}><BarChart data={data} margin={{ top: 10, right: 20, bottom: 40 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} /><XAxis dataKey="label" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" fill="#0f172a" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>;
  }
  if (chartType === "scatter") {
    const data = dataset.rows.map((r) => ({ x: toNumber(r[xCol]), y: toNumber(r[yCol]) })).filter((p) => p.x !== null && p.y !== null);
    return <ResponsiveContainer width="100%" height={380}><ScatterChart margin={{ top: 10, right: 20, bottom: 20 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="x" type="number" name={xCol} tick={{ fontSize: 11 }} /><YAxis dataKey="y" type="number" name={yCol} tick={{ fontSize: 11 }} /><Tooltip cursor={{ strokeDasharray: "3 3" }} /><Scatter data={data} fill="#0f172a" /></ScatterChart></ResponsiveContainer>;
  }
  if (chartType === "box") {
    const groups = groupBy(dataset.rows, xCol, yCol, agg);
    const boxes = groups.slice(0, 12).map((g) => { const n = numericVector(dataset.rows.filter((r) => String(r[xCol] ?? "") === g.key), yCol).slice().sort((a, b) => a - b); return { name: String(g.key).slice(0, 16), min: n[0], q1: percentile(n, 0.25), med: percentile(n, 0.5), q3: percentile(n, 0.75), max: n[n.length - 1] }; }).filter((b) => b.min != null);
    return <BoxPlot boxes={boxes} />;
  }
  const groups = groupBy(dataset.rows, xCol, yCol, agg).slice(0, 20).map((d) => ({ name: String(d.key).slice(0, 24), value: d.value }));
  const common = { data: groups, margin: { top: 10, right: 20, bottom: 60 } };
  if (chartType === "bar") return <ResponsiveContainer width="100%" height={380}><BarChart {...common}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} /><XAxis dataKey="name" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#0f172a" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>;
  if (chartType === "line") return <ResponsiveContainer width="100%" height={380}><LineChart {...common}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} /><XAxis dataKey="name" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>;
  if (chartType === "area") return <ResponsiveContainer width="100%" height={380}><AreaChart {...common}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} /><XAxis dataKey="name" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Area type="monotone" dataKey="value" stroke="#0f172a" fill="#0f172a33" strokeWidth={2} /></AreaChart></ResponsiveContainer>;
  if (chartType === "pie") return <ResponsiveContainer width="100%" height={380}><PieChart><Pie data={groups} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={140} label={{ fontSize: 11 }}>{groups.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}</Pie><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer>;
  return null;
}

function BoxPlot({ boxes }) {
  if (!boxes.length) return <p className="py-20 text-center text-sm text-muted-foreground">No data to plot.</p>;
  const W = 700, H = 360, pad = 40;
  const allVals = boxes.flatMap((b) => [b.min, b.max]);
  const yMin = Math.min(...allVals), yMax = Math.max(...allVals);
  const yScale = (v) => H - pad - ((v - yMin) / (yMax - yMin || 1)) * (H - 2 * pad);
  const bw = (W - 2 * pad) / boxes.length;
  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H} className="min-w-full">
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="#cbd5e1" />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => { const v = yMin + t * (yMax - yMin); return <g key={t}><line x1={pad - 5} y1={yScale(v)} x2={pad} y2={yScale(v)} stroke="#94a3b8" /><text x={pad - 8} y={yScale(v) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{fmt(v)}</text></g>; })}
        {boxes.map((b, i) => {
          const cx = pad + bw * i + bw / 2;
          const w = bw * 0.5;
          return (
            <g key={i}>
              <line x1={cx} y1={yScale(b.max)} x2={cx} y2={yScale(b.min)} stroke="#475569" />
              <line x1={cx - w / 3} y1={yScale(b.max)} x2={cx + w / 3} y2={yScale(b.max)} stroke="#475569" />
              <line x1={cx - w / 3} y1={yScale(b.min)} x2={cx + w / 3} y2={yScale(b.min)} stroke="#475569" />
              <rect x={cx - w / 2} y={yScale(b.q3)} width={w} height={Math.max(0, yScale(b.q1) - yScale(b.q3))} fill="#cbd5e1" stroke="#0f172a" />
              <line x1={cx - w / 2} y1={yScale(b.med)} x2={cx + w / 2} y2={yScale(b.med)} stroke="#0f172a" strokeWidth={2} />
              <text x={cx} y={H - pad + 14} textAnchor="middle" fontSize="10" fill="#64748b">{b.name}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}