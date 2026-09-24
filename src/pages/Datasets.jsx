import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useDatasets } from "@/hooks/useSelectedDataset";
import DataUpload from "@/components/analytics/DataUpload";
import { base44 } from "@/api/base44Client";
import { toCsv } from "@/lib/sql";
import { FileSpreadsheet, Pencil, Copy, Trash2, Download, ArrowRight } from "lucide-react";

export default function Datasets() {
  const { datasets, loading, setDatasets } = useDatasets();

  function download(d) {
    const cols = d.columns.map((c) => c.name);
    const csv = toCsv(cols, d.rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${d.name}.csv`; a.click();
    URL.revokeObjectURL(url);
  }
  async function rename(d) {
    const name = prompt("Rename dataset", d.name);
    if (!name || name === d.name) return;
    await base44.entities.Dataset.update(d.id, { name });
    setDatasets((list) => list.map((x) => (x.id === d.id ? { ...x, name } : x)));
  }
  async function duplicate(d) {
    const copy = await base44.entities.Dataset.create({
      name: d.name + " (copy)", file_name: d.file_name, columns: d.columns, rows: d.rows, row_count: d.row_count,
    });
    setDatasets((list) => [copy, ...list]);
  }
  async function remove(d) {
    if (!confirm(`Delete "${d.name}"? This cannot be undone.`)) return;
    await base44.entities.Dataset.delete(d.id);
    setDatasets((list) => list.filter((x) => x.id !== d.id));
  }

  function fileType(d) { return (d.file_name || "").split(".").pop()?.toUpperCase() || "CSV"; }
  function date(d) { return new Date(d.created_date).toLocaleDateString(); }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Datasets</h1>
        <p className="mt-1 text-sm text-muted-foreground">{datasets.length} dataset{datasets.length !== 1 ? "s" : ""} · upload, rename, duplicate, export.</p>
      </div>

      <div className="max-w-xl"><DataUpload onUploaded={(ds) => setDatasets((d) => [ds, ...d])} /></div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-t-foreground" /></div>
      ) : datasets.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No datasets yet. Upload one above to get started.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {datasets.map((d) => (
            <div key={d.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5"><FileSpreadsheet className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{date(d)}</p>
                </div>
                <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{fileType(d)}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-muted/40 py-2"><p className="text-lg font-semibold">{d.row_count}</p><p className="text-[10px] uppercase text-muted-foreground">Rows</p></div>
                <div className="rounded-lg bg-muted/40 py-2"><p className="text-lg font-semibold">{d.columns.length}</p><p className="text-[10px] uppercase text-muted-foreground">Columns</p></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={`/explorer?ds=${d.id}`} className="flex items-center gap-1 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background">Open <ArrowRight className="h-3 w-3" /></Link>
                <button onClick={() => rename(d)} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent"><Pencil className="h-3 w-3" /> Rename</button>
                <button onClick={() => duplicate(d)} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent"><Copy className="h-3 w-3" /> Duplicate</button>
                <button onClick={() => download(d)} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent"><Download className="h-3 w-3" /> Export</button>
                <button onClick={() => remove(d)} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-destructive hover:bg-accent"><Trash2 className="h-3 w-3" /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}