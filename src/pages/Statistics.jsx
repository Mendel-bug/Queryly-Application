import React, { useMemo, useState } from "react";
import { useSelectedDataset } from "@/hooks/useSelectedDataset";
import DatasetPicker from "@/components/analytics/DatasetPicker";
import EmptyDataset from "@/components/analytics/EmptyDataset";
import { detectColumnType, toNumber, fmt } from "@/lib/analytics";
import { descriptiveStats, correlation, covariance, percentile, zScores, linearRegression, numericVector } from "@/lib/stats";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import StatVisuals from "@/components/analytics/StatVisuals";
import ShareGitHub from "@/components/ShareGitHub";

export default function Statistics() {
  const { datasets, loading, dataset, select, selectedId } = useSelectedDataset();
  const [pctCol, setPctCol] = useState("");
  const [zCol, setZCol] = useState("");
  const [regX, setRegX] = useState("");
  const [regY, setRegY] = useState("");

  const numericCols = useMemo(
    () => (dataset ? dataset.columns.filter((c) => c.type === "number" || detectColumnType(dataset.rows.map((r) => r[c.name])) === "number").map((c) => c.name) : []),
    [dataset]
  );

  if (!dataset) return <EmptyDataset datasets={datasets} loading={loading} value={selectedId} onChange={select} />;

  const descRows = numericCols.map((c) => ({ name: c, ...descriptiveStats(dataset.rows, c) }));
  const reg = regX && regY && regX !== regY ? linearRegression(dataset.rows, regX, regY) : null;
  const regPoints = reg ? dataset.rows.map((r) => ({ x: toNumber(r[regX]), y: toNumber(r[regY]) })).filter((p) => p.x !== null && p.y !== null) : [];
  const regLine = reg ? [{ x: regPoints[0]?.x || 0, y: reg.slope * (regPoints[0]?.x || 0) + reg.intercept }, { x: regPoints[regPoints.length - 1]?.x || 0, y: reg.slope * (regPoints[regPoints.length - 1]?.x || 0) + reg.intercept }] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Statistics</h1>
          <p className="text-sm text-muted-foreground">Real descriptive & inferential analysis of {dataset.name}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DatasetPicker datasets={datasets} value={selectedId} onChange={select} loading={loading} />
          <ShareGitHub />
        </div>
      </div>

      {numericCols.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No numeric columns detected in this dataset.</p>
      ) : (
        <>
          <Section title="Descriptive Statistics">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/30">{["Column", "Count", "Mean", "Median", "Min", "Max", "Range", "Variance", "Std Dev", "Q1", "Q3", "IQR"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody>
                  {descRows.map((r) => (
                    <tr key={r.name} className="border-b border-border/50 last:border-0">
                      <td className="px-3 py-2 font-medium whitespace-nowrap">{r.name}</td>
                      <td className="px-3 py-2">{r.count}</td>
                      <td className="px-3 py-2 font-mono">{fmt(r.mean)}</td>
                      <td className="px-3 py-2 font-mono">{fmt(r.median)}</td>
                      <td className="px-3 py-2 font-mono">{fmt(r.min)}</td>
                      <td className="px-3 py-2 font-mono">{fmt(r.max)}</td>
                      <td className="px-3 py-2 font-mono">{fmt(r.range)}</td>
                      <td className="px-3 py-2 font-mono">{fmt(r.variance)}</td>
                      <td className="px-3 py-2 font-mono">{fmt(r.stdDev)}</td>
                      <td className="px-3 py-2 font-mono">{fmt(r.q1)}</td>
                      <td className="px-3 py-2 font-mono">{fmt(r.q3)}</td>
                      <td className="px-3 py-2 font-mono">{fmt(r.iqr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <StatVisuals dataset={dataset} numericCols={numericCols} />

          <Section title="Correlation Matrix (Pearson)">
            <Matrix cols={numericCols} cell={(x, y) => correlation(dataset.rows, x, y)} />
          </Section>

          <Section title="Covariance Matrix">
            <Matrix cols={numericCols} cell={(x, y) => covariance(dataset.rows, x, y)} />
          </Section>

          <Section title="Percentiles">
            <Picker label="Column" value={pctCol} onChange={setPctCol} options={numericCols} />
            {pctCol && <PercentileTable rows={dataset.rows} col={pctCol} />}
          </Section>

          <Section title="Z-Scores (standardized values)">
            <Picker label="Column" value={zCol} onChange={setZCol} options={numericCols} />
            {zCol && <ZTable rows={dataset.rows} col={zCol} />}
          </Section>

          <Section title="Linear Regression">
            <div className="flex flex-wrap gap-3">
              <Picker label="X (independent)" value={regX} onChange={setRegX} options={numericCols} />
              <Picker label="Y (dependent)" value={regY} onChange={setRegY} options={numericCols} />
            </div>
            {reg ? (
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <KV label="Slope" value={fmt(reg.slope)} />
                  <KV label="Intercept" value={fmt(reg.intercept)} />
                  <KV label="Correlation (r)" value={fmt(reg.r)} />
                  <KV label="R²" value={fmt(reg.r2)} />
                  <KV label="Equation" value={`y = ${fmt(reg.slope)}x + ${fmt(reg.intercept)}`} />
                  <KV label="n" value={reg.n} />
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="x" type="number" name={regX} tick={{ fontSize: 11 }} />
                      <YAxis dataKey="y" type="number" name={regY} tick={{ fontSize: 11 }} />
                      <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                      <Scatter data={regPoints} fill="#0f172a" />
                      <Scatter data={regLine} line stroke="#dc2626" strokeWidth={2} shape="none" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : <p className="mt-3 text-sm text-muted-foreground">Select two different numeric columns.</p>}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 font-heading text-base font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Picker({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="select">
        <option value="">Select…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function Matrix({ cols, cell }) {
  return (
    <div className="overflow-x-auto">
      <table className="text-sm">
        <thead><tr><th className="px-3 py-2" />{cols.map((c) => <th key={c} className="px-3 py-2 text-left font-medium whitespace-nowrap">{c}</th>)}</tr></thead>
        <tbody>
          {cols.map((r) => (
            <tr key={r} className="border-b border-border/40">
              <td className="px-3 py-2 font-medium whitespace-nowrap">{r}</td>
              {cols.map((c) => {
                const v = cell(r, c);
                const bg = v === null ? "transparent" : `hsl(${(1 - Math.abs(v)) * 220} 70% ${Math.abs(v) * 92 + 45}%)`;
                return <td key={c} className="px-3 py-2 font-mono text-center" style={{ background: c === r ? "hsl(var(--muted))" : bg }}>{v === null ? "—" : fmt(v)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PercentileTable({ rows, col }) {
  const nums = numericVector(rows, col).slice().sort((a, b) => a - b);
  const ps = [0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95];
  return (
    <div className="mt-3 flex flex-wrap gap-3">
      {ps.map((p) => (
        <div key={p} className="rounded-lg bg-muted/40 px-4 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">P{p * 100}</p>
          <p className="font-mono text-base">{fmt(percentile(nums, p))}</p>
        </div>
      ))}
    </div>
  );
}

function ZTable({ rows, col }) {
  const zs = zScores(rows, col);
  const nums = numericVector(rows, col);
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="text-sm">
        <thead><tr className="border-b border-border bg-muted/30"><th className="px-3 py-2 text-left">#</th><th className="px-3 py-2 text-left">Value</th><th className="px-3 py-2 text-left">Z-score</th></tr></thead>
        <tbody>
          {zs.slice(0, 12).map((z, i) => (
            <tr key={i} className="border-b border-border/40"><td className="px-3 py-1.5">{i + 1}</td><td className="px-3 py-1.5 font-mono">{fmt(nums[i])}</td><td className="px-3 py-1.5 font-mono">{fmt(z)}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">Showing first 12 of {zs.length} standardized values.</p>
    </div>
  );
}

function KV({ label, value }) {
  return <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2"><span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span><span className="font-mono text-sm">{value}</span></div>;
}