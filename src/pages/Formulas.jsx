import React, { useState } from "react";
import { useSelectedDataset } from "@/hooks/useSelectedDataset";
import DatasetPicker from "@/components/analytics/DatasetPicker";
import EmptyDataset from "@/components/analytics/EmptyDataset";
import { evaluateFormula, SUPPORTED } from "@/lib/formulas";
import { fmt } from "@/lib/analytics";
import { Play, Calculator } from "lucide-react";

const EXAMPLES = [
  "SUM(revenue)", "AVERAGE(price)", "COUNT(region)", "COUNTA(region)",
  "MIN(price)", "MAX(price)", "MEDIAN(sales)",
  'COUNTIF(region, "=North")', 'SUMIF(region, "=North", revenue)', 'AVERAGEIF(score, ">80")',
  'IF(AVERAGE(revenue) > 1000, "High", "Low")', 'AND(SUM(revenue) > 0, COUNT(region) > 1)',
];
const AGG = ["SUM", "AVERAGE", "COUNT", "COUNTA", "MIN", "MAX", "MEDIAN", "COUNTIF", "SUMIF", "AVERAGEIF"];
const LOGIC = ["IF", "AND", "OR"];

export default function Formulas() {
  const { datasets, loading, dataset, select, selectedId } = useSelectedDataset();
  const [formula, setFormula] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  function run() {
    if (!dataset) { setError("Select a dataset first."); setResult(null); return; }
    try { setResult(evaluateFormula(formula, dataset.rows)); setError(null); }
    catch (e) { setError(e.message); setResult(null); }
  }

  const cols = dataset ? dataset.columns.map((c) => c.name) : [];
  if (!dataset) return <EmptyDataset datasets={datasets} loading={loading} value={selectedId} onChange={select} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-heading text-2xl font-semibold">Formulas</h1><p className="text-sm text-muted-foreground">Excel-style formulas evaluated against {dataset.name}.</p></div>
        <DatasetPicker datasets={datasets} value={selectedId} onChange={select} loading={loading} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">=</span>
          <input value={formula} onChange={(e) => setFormula(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} placeholder="SUM(revenue)" className="flex-1 rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={run} className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"><Play className="h-4 w-4" /> Run</button>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        {result !== null && !error && (
          <div className="mt-3 flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3">
            <Calculator className="h-5 w-5 text-muted-foreground" />
            <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Result</p><p className="font-mono text-xl font-semibold">{typeof result === "boolean" ? (result ? "TRUE" : "FALSE") : fmt(result)}</p></div>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => <button key={ex} onClick={() => setFormula(ex)} className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground hover:bg-accent">{ex}</button>)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-heading text-base font-semibold">Aggregate functions</h2>
          <p className="mt-1 text-xs text-muted-foreground">Operate on a dataset column.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {AGG.map((f) => <span key={f} className="rounded-lg bg-foreground/5 px-2.5 py-1 font-mono text-xs">{f}</span>)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-heading text-base font-semibold">Logical functions</h2>
          <p className="mt-1 text-xs text-muted-foreground">Combine values and comparisons.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {LOGIC.map((f) => <span key={f} className="rounded-lg bg-foreground/5 px-2.5 py-1 font-mono text-xs">{f}</span>)}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-heading text-base font-semibold">Available columns</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {cols.map((c) => <button key={c} onClick={() => setFormula((f) => f + (f.endsWith("(") ? "" : "") + c)} className="rounded-lg border border-border px-2.5 py-1 font-mono text-xs hover:bg-accent">{c}</button>)}
        </div>
      </div>
    </div>
  );
}