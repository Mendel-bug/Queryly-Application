import React, { useMemo, useState } from "react";
import { useSelectedDataset } from "@/hooks/useSelectedDataset";
import DatasetPicker from "@/components/analytics/DatasetPicker";
import EmptyDataset from "@/components/analytics/EmptyDataset";
import { fmt, detectColumnType, categoricalStats } from "@/lib/analytics";
import { descriptiveStats, missingCount, uniqueCount, duplicateRowCount } from "@/lib/stats";
import { Search, ArrowUp, ArrowDown, ArrowUpDown, X } from "lucide-react";

export default function DataExplorer() {
  const { datasets, loading, dataset, select, selectedId } = useSelectedDataset();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ col: null, dir: "asc" });
  const [page, setPage] = useState(0);
  const pageSize = 12;
  const [hidden, setHidden] = useState(() => new Set());
  const [profileCol, setProfileCol] = useState(null);

  const cols = dataset ? dataset.columns.map((c) => c.name) : [];
  const visibleCols = cols.filter((c) => !hidden.has(c));

  const rows = useMemo(() => {
    if (!dataset) return [];
    let r = [...dataset.rows];
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter((row) => cols.some((c) => String(row[c] ?? "").toLowerCase().includes(q)));
    }
    if (sort.col) {
      r.sort((a, b) => {
        const av = a[sort.col], bv = b[sort.col];
        if (av == null) return 1; if (bv == null) return -1;
        if (typeof av === "number" && typeof bv === "number") return sort.dir === "asc" ? av - bv : bv - av;
        return sort.dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return r;
  }, [dataset, query, sort, cols]);

  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const view = rows.slice(page * pageSize, page * pageSize + pageSize);

  if (!dataset) return <EmptyDataset datasets={datasets} loading={loading} value={selectedId} onChange={select} />;

  function toggleSort(c) { setSort((s) => (s.col === c ? { col: c, dir: s.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "asc" })); setPage(0); }
  function toggleVisible(c) { setHidden((prev) => { const s = new Set(prev); if (s.has(c)) s.delete(c); else s.add(c); return s; }); }

  const dups = duplicateRowCount(dataset.rows);
  const profile = profileCol ? buildProfile(dataset, profileCol) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">{dataset.name}</h1>
          <p className="text-sm text-muted-foreground">{dataset.file_name} · {dataset.row_count} rows · {cols.length} columns · {dups} duplicate rows</p>
        </div>
        <DatasetPicker datasets={datasets} value={selectedId} onChange={select} loading={loading} />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} placeholder="Search all columns…" className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent">Columns ({visibleCols.length}/{cols.length})</summary>
          <div className="absolute z-10 mt-1 max-h-64 w-56 overflow-y-auto rounded-lg border border-border bg-card p-2 shadow-lg">
            {cols.map((c) => (
              <label key={c} className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-accent/50">
                <input type="checkbox" checked={!hidden.has(c)} onChange={() => toggleVisible(c)} />
                <span className="truncate">{c}</span>
              </label>
            ))}
            <button onClick={() => setHidden(new Set())} className="mt-1 w-full rounded-md border border-border px-2 py-1 text-xs hover:bg-accent">Show all</button>
          </div>
        </details>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <p className="text-sm text-muted-foreground">{rows.length.toLocaleString()} rows · page {page + 1}/{pages}</p>
          <div className="flex gap-2 text-xs">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-border px-2 py-1 disabled:opacity-40 hover:bg-accent">Prev</button>
            <button disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-border px-2 py-1 disabled:opacity-40 hover:bg-accent">Next</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {visibleCols.map((c) => {
                  const t = dataset.columns.find((x) => x.name === c)?.type;
                  return (
                    <th key={c} onClick={() => toggleSort(c)} className="cursor-pointer select-none px-4 py-3 text-left font-medium whitespace-nowrap hover:bg-accent/60">
                      <span className="flex items-center gap-1.5">
                        {sort.col === c ? (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                        {c}
                        <button onClick={(e) => { e.stopPropagation(); setProfileCol(c); }} className="rounded bg-foreground/5 px-1.5 py-0.5 text-[10px] uppercase hover:bg-foreground/10">{t}</button>
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {view.map((r, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-accent/30">
                  {visibleCols.map((c) => <td key={c} className="px-4 py-2.5 whitespace-nowrap text-foreground/80">{fmt(r[c])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {profile && <ColumnProfile name={profileCol} profile={profile} onClose={() => setProfileCol(null)} />}
    </div>
  );
}

function buildProfile(dataset, col) {
  const values = dataset.rows.map((r) => r[col]);
  const declared = dataset.columns.find((c) => c.name === col)?.type;
  const detected = detectColumnType(values);
  const missing = missingCount(values);
  const unique = uniqueCount(values);
  if (detected === "number") return { type: detected, declared, missing, unique, numeric: descriptiveStats(dataset.rows, col) };
  return { type: detected, declared, missing, unique, categorical: categoricalStats(values) };
}

function ColumnProfile({ name, profile, onClose }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="font-heading text-base font-semibold">{name}</h3>
        <button onClick={onClose} className="rounded-lg border border-border p-1.5"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span>type: <b className="text-foreground">{profile.type}</b></span>
        <span>missing: <b className="text-foreground">{profile.missing}</b></span>
        <span>unique: <b className="text-foreground">{profile.unique}</b></span>
      </div>
      {profile.numeric ? (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {Object.entries(profile.numeric).map(([k, v]) => (
            <div key={k} className="rounded-lg bg-muted/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</p>
              <p className="font-mono text-sm">{fmt(v)}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {(profile.categorical?.top || []).map((t) => {
            const pct = profile.categorical.count ? (t.count / profile.categorical.count) * 100 : 0;
            return (
              <div key={t.value}>
                <div className="flex justify-between text-xs"><span className="truncate pr-2">{t.value}</span><span className="text-muted-foreground">{t.count}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground/70" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}