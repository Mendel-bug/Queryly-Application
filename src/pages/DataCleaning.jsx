import React, { useEffect, useState } from "react";
import { useSelectedDataset } from "@/hooks/useSelectedDataset";
import DatasetPicker from "@/components/analytics/DatasetPicker";
import EmptyDataset from "@/components/analytics/EmptyDataset";
import { base44 } from "@/api/base44Client";
import { toCsv } from "@/lib/sql";
import { toNumber, detectColumnType } from "@/lib/analytics";
import { duplicateRowCount, missingCount } from "@/lib/stats";
import { RotateCcw, Save, Download, Plus, Trash2, Wand2 } from "lucide-react";

export default function DataCleaning() {
  const { datasets, loading, dataset, select, selectedId, setDatasets } = useSelectedDataset();
  const [work, setWork] = useState(null);
  const [removeCols, setRemoveCols] = useState([]);
  const [renameCol, setRenameCol] = useState("");
  const [renameTo, setRenameTo] = useState("");
  const [typeCol, setTypeCol] = useState("");
  const [typeTo, setTypeTo] = useState("number");
  const [missCol, setMissCol] = useState("");
  const [filterCol, setFilterCol] = useState("");
  const [filterOp, setFilterOp] = useState("=");
  const [filterVal, setFilterVal] = useState("");
  const [sortCol, setSortCol] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [replaceCol, setReplaceCol] = useState("");
  const [replaceFind, setReplaceFind] = useState("");
  const [replaceWith, setReplaceWith] = useState("");
  const [trimCol, setTrimCol] = useState("");
  const [msg, setMsg] = useState("");

  // reset working copy when dataset changes
  useEffect(() => {
    if (dataset) setWork({ rows: dataset.rows, columns: dataset.columns.map((c) => ({ ...c })) });
    else setWork(null);
    setMsg("");
  }, [selectedId]); // eslint-disable-line

  if (!dataset) return <EmptyDataset datasets={datasets} loading={loading} value={selectedId} onChange={select} />;

  const w = work || { rows: dataset.rows, columns: dataset.columns };
  const cols = w.columns.map((c) => c.name);

  function apply(label, fn) {
    setWork((prev) => {
      const next = fn(structuredCloneSafe(prev));
      setMsg(`Applied: ${label} → ${next.rows.length} rows × ${next.columns.length} columns`);
      return next;
    });
  }

  function reset() { setWork({ rows: dataset.rows, columns: dataset.columns.map((c) => ({ ...c })) }); setMsg("Reset to original."); }
  async function saveCleaned() {
    const created = await base44.entities.Dataset.create({
      name: `${dataset.name} (cleaned)`, file_name: dataset.file_name, columns: w.columns, rows: w.rows, row_count: w.rows.length,
    });
    setDatasets((list) => [created, ...list]);
    setMsg(`Saved as "${created.name}".`);
  }
  function downloadCleaned() {
    const csv = toCsv(w.columns.map((c) => c.name), w.rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${dataset.name}_cleaned.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const dups = duplicateRowCount(w.rows);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-heading text-2xl font-semibold">Data Cleaning</h1><p className="text-sm text-muted-foreground">Transform {dataset.name}. Changes preview live; save creates a new cleaned dataset.</p></div>
        <DatasetPicker datasets={datasets} value={selectedId} onChange={select} loading={loading} />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <span className="text-sm font-medium">{w.rows.length} rows × {w.columns.length} columns</span>
        <span className="text-xs text-muted-foreground">· {dups} duplicate rows</span>
        <div className="ml-auto flex gap-2">
          <button onClick={reset} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent"><RotateCcw className="h-3.5 w-3.5" /> Reset</button>
          <button onClick={downloadCleaned} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent"><Download className="h-3.5 w-3.5" /> Export</button>
          <button onClick={saveCleaned} className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background"><Save className="h-3.5 w-3.5" /> Save as new</button>
        </div>
      </div>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <OpCard title="Remove duplicate rows" icon={Wand2} onApply={() => apply("Remove duplicates", (w) => { const seen = new Set(); w.rows = w.rows.filter((r) => { const k = JSON.stringify(r); return seen.has(k) ? false : (seen.add(k), true); }); return w; })} />

        <OpCard title="Remove columns" icon={Trash2}>
          <div className="flex flex-wrap gap-2">
            {cols.map((c) => <label key={c} className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs"><input type="checkbox" checked={removeCols.includes(c)} onChange={(e) => setRemoveCols((p) => e.target.checked ? [...p, c] : p.filter((x) => x !== c))} />{c}</label>)}
          </div>
          <ApplyBtn onClick={() => { const rc = removeCols; apply("Remove columns", (w) => { w.columns = w.columns.filter((c) => !rc.includes(c.name)); w.rows = w.rows.map((r) => { const o = { ...r }; rc.forEach((c) => delete o[c]); return o; }); return w; }); setRemoveCols([]); }} disabled={!removeCols.length} />
        </OpCard>

        <OpCard title="Rename column">
          <div className="flex flex-wrap gap-2">
            <select value={renameCol} onChange={(e) => setRenameCol(e.target.value)} className="select"><option value="">Column…</option>{cols.map((c) => <option key={c}>{c}</option>)}</select>
            <input value={renameTo} onChange={(e) => setRenameTo(e.target.value)} placeholder="New name" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <ApplyBtn onClick={() => { const rc = renameCol, to = renameTo; apply("Rename column", (w) => { w.columns = w.columns.map((c) => c.name === rc ? { ...c, name: to } : c); w.rows = w.rows.map((r) => { const o = {}; for (const k in r) o[k === rc ? to : k] = r[k]; return o; }); return w; }); setRenameCol(""); setRenameTo(""); }} disabled={!renameCol || !renameTo} />
        </OpCard>

        <OpCard title="Change data type">
          <div className="flex flex-wrap gap-2">
            <select value={typeCol} onChange={(e) => setTypeCol(e.target.value)} className="select"><option value="">Column…</option>{cols.map((c) => <option key={c}>{c}</option>)}</select>
            <select value={typeTo} onChange={(e) => setTypeTo(e.target.value)} className="select">{["number", "string", "boolean", "date"].map((t) => <option key={t}>{t}</option>)}</select>
          </div>
          <ApplyBtn onClick={() => { const c = typeCol, t = typeTo; apply("Change type", (w) => { w.columns = w.columns.map((col) => col.name === c ? { ...col, type: t } : col); w.rows = w.rows.map((r) => ({ ...r, [c]: convertType(r[c], t) })); return w; }); }} disabled={!typeCol} />
        </OpCard>

        <OpCard title="Drop rows with missing values">
          <div className="flex flex-wrap gap-2">
            <select value={missCol} onChange={(e) => setMissCol(e.target.value)} className="select"><option value="">All columns</option>{cols.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <ApplyBtn onClick={() => { const c = missCol; apply("Drop missing", (w) => { w.rows = w.rows.filter((r) => c ? (r[c] !== null && r[c] !== undefined && r[c] !== "") : w.columns.every((col) => r[col.name] !== null && r[col.name] !== undefined && r[col.name] !== "")); return w; }); }} />
        </OpCard>

        <OpCard title="Filter rows">
          <div className="flex flex-wrap gap-2">
            <select value={filterCol} onChange={(e) => setFilterCol(e.target.value)} className="select"><option value="">Column…</option>{cols.map((c) => <option key={c}>{c}</option>)}</select>
            <select value={filterOp} onChange={(e) => setFilterOp(e.target.value)} className="select">{["=", "!=", ">", "<", ">=", "<="].map((o) => <option key={o}>{o}</option>)}</select>
            <input value={filterVal} onChange={(e) => setFilterVal(e.target.value)} placeholder="value" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <ApplyBtn onClick={() => { const c = filterCol, op = filterOp, v = filterVal; apply("Filter rows", (w) => { w.rows = w.rows.filter((r) => cmp(r[c], op, v)); return w; }); }} disabled={!filterCol} />
        </OpCard>

        <OpCard title="Sort rows">
          <div className="flex flex-wrap gap-2">
            <select value={sortCol} onChange={(e) => setSortCol(e.target.value)} className="select"><option value="">Column…</option>{cols.map((c) => <option key={c}>{c}</option>)}</select>
            <select value={sortDir} onChange={(e) => setSortDir(e.target.value)} className="select"><option value="asc">Ascending</option><option value="desc">Descending</option></select>
          </div>
          <ApplyBtn onClick={() => { const c = sortCol, d = sortDir; apply("Sort", (w) => { w.rows.sort((a, b) => { const av = a[c], bv = b[c]; if (av == null) return 1; if (bv == null) return -1; if (typeof av === "number" && typeof bv === "number") return d === "asc" ? av - bv : bv - av; return d === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av)); }); return w; }); }} disabled={!sortCol} />
        </OpCard>

        <OpCard title="Replace values">
          <div className="flex flex-wrap gap-2">
            <select value={replaceCol} onChange={(e) => setReplaceCol(e.target.value)} className="select"><option value="">Column…</option>{cols.map((c) => <option key={c}>{c}</option>)}</select>
            <input value={replaceFind} onChange={(e) => setReplaceFind(e.target.value)} placeholder="find" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <input value={replaceWith} onChange={(e) => setReplaceWith(e.target.value)} placeholder="replace with" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <ApplyBtn onClick={() => { const c = replaceCol, f = replaceFind, t = replaceWith; apply("Replace", (w) => { w.rows = w.rows.map((r) => ({ ...r, [c]: String(r[c]) === f ? t : r[c] })); return w; }); }} disabled={!replaceCol} />
        </OpCard>

        <OpCard title="Trim whitespace">
          <div className="flex flex-wrap gap-2">
            <select value={trimCol} onChange={(e) => setTrimCol(e.target.value)} className="select"><option value="">Column…</option>{cols.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <ApplyBtn onClick={() => { const c = trimCol; apply("Trim", (w) => { w.rows = w.rows.map((r) => ({ ...r, [c]: typeof r[c] === "string" ? r[c].trim() : r[c] })); return w; }); }} disabled={!trimCol} />
        </OpCard>
      </div>
    </div>
  );
}

function structuredCloneSafe(obj) { return JSON.parse(JSON.stringify(obj)); }
function convertType(v, t) {
  if (v === null || v === undefined || v === "") return null;
  if (t === "number") { const n = toNumber(v); return n; }
  if (t === "string") return String(v);
  if (t === "boolean") { const s = String(v).toLowerCase(); return s === "true" || s === "1" ? true : s === "false" || s === "0" ? false : null; }
  return v;
}
function cmp(a, op, bRaw) {
  const an = toNumber(a), bn = toNumber(bRaw);
  const useNum = an !== null && bn !== null;
  const x = useNum ? an : a, y = useNum ? bn : bRaw;
  switch (op) { case "=": return x === y; case "!=": return x !== y; case ">": return x > y; case "<": return x < y; case ">=": return x >= y; case "<=": return x <= y; default: return false; }
}

function OpCard({ title, icon: Icon, children, onApply }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="flex items-center gap-2 font-heading text-sm font-semibold">{Icon && <Icon className="h-4 w-4 text-muted-foreground" />}{title}</h3>
      <div className="mt-3">{children}</div>
      {onApply && <div className="mt-3"><ApplyBtn onClick={onApply} /></div>}
    </div>
  );
}
function ApplyBtn({ onClick, disabled }) {
  return <button onClick={onClick} disabled={disabled} className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-40"><Plus className="h-3.5 w-3.5" /> Apply</button>;
}