import React, { useState, useEffect } from "react";
import { useSelectedDataset } from "@/hooks/useSelectedDataset";
import DatasetPicker from "@/components/analytics/DatasetPicker";
import EmptyDataset from "@/components/analytics/EmptyDataset";
import { runSql, toCsv } from "@/lib/sql";
import { base44 } from "@/api/base44Client";
import { fmt } from "@/lib/analytics";
import { Play, Trash2, Save, Download, Bookmark } from "lucide-react";

const EXAMPLES = [
  "SELECT * FROM data LIMIT 10",
  "SELECT region, SUM(revenue) AS total FROM data GROUP BY region ORDER BY total DESC",
  "SELECT * FROM data WHERE revenue > 1000",
  "SELECT category, COUNT(*) AS n, AVG(price) AS avg_price FROM data GROUP BY category",
];

export default function SqlLab() {
  const { datasets, loading, dataset, select, selectedId } = useSelectedDataset();
  const [sql, setSql] = useState("");
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState([]);
  const [name, setName] = useState("");

  useEffect(() => { if (selectedId) loadSaved(); else setSaved([]); setResult(null); }, [selectedId]);

  async function loadSaved() { try { setSaved(await base44.entities.SavedQuery.filter({ dataset_id: selectedId }, "-created_date", 30)); } catch { setSaved([]); } }
  function run() { if (!dataset) return; setResult(runSql(sql, dataset)); }
  function clear() { setSql(""); setResult(null); }
  function exportCsv() { if (!result || !result.columns) return; download(toCsv(result.columns, result.rows), "query_result.csv"); }
  async function saveQuery() { if (!name.trim() || !selectedId) return; await base44.entities.SavedQuery.create({ name: name.trim(), dataset_id: selectedId, query: sql }); setName(""); loadSaved(); }
  async function deleteSaved(id) { await base44.entities.SavedQuery.delete(id); loadSaved(); }

  if (!dataset) return <EmptyDataset datasets={datasets} loading={loading} value={selectedId} onChange={select} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-heading text-2xl font-semibold">SQL Lab</h1><p className="text-sm text-muted-foreground">Run safe SELECT queries against {dataset.name}. Runs in-browser — no server execution.</p></div>
        <DatasetPicker datasets={datasets} value={selectedId} onChange={select} loading={loading} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <textarea value={sql} onChange={(e) => setSql(e.target.value)} rows={6} placeholder="SELECT … FROM data …" className="w-full rounded-lg border border-input bg-background p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={run} className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"><Play className="h-4 w-4" /> Run</button>
          <button onClick={clear} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"><Trash2 className="h-4 w-4" /> Clear</button>
          <button onClick={exportCsv} disabled={!result || !result.columns} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40 hover:bg-accent"><Download className="h-4 w-4" /> Export</button>
          <div className="ml-auto flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Query name…" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <button onClick={saveQuery} disabled={!name.trim() || !sql} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40 hover:bg-accent"><Save className="h-4 w-4" /> Save</button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => <button key={ex} onClick={() => setSql(ex)} className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground hover:bg-accent">{ex}</button>)}
        </div>
      </div>

      {result?.error && <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">Error: {result.error}</div>}
      {result?.columns && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-4 py-2.5 text-sm text-muted-foreground">{result.rows.length} rows</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/30">{result.columns.map((c) => <th key={c} className="px-4 py-2.5 text-left font-medium whitespace-nowrap">{c}</th>)}</tr></thead>
              <tbody>
                {result.rows.slice(0, 200).map((r, i) => <tr key={i} className="border-b border-border/40 last:border-0">{result.columns.map((c) => <td key={c} className="px-4 py-2 whitespace-nowrap">{fmt(r[c])}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {saved.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-heading text-base font-semibold">Saved Queries</h2>
          <div className="mt-3 space-y-2">
            {saved.map((s) => <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5"><Bookmark className="h-4 w-4 text-muted-foreground" /><button onClick={() => setSql(s.query)} className="flex-1 text-left text-sm hover:underline">{s.name}</button><button onClick={() => deleteSaved(s.id)} className="rounded p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></div>)}
          </div>
        </div>
      )}
    </div>
  );
}

function download(content, filename) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}