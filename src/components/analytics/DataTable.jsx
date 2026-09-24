import React, { useState } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { fmt } from "@/lib/analytics";

export default function DataTable({ dataset }) {
  const [sort, setSort] = useState({ col: null, dir: "asc" });
  const [page, setPage] = useState(0);
  const pageSize = 12;

  let rows = [...dataset.rows];
  if (sort.col) {
    rows.sort((a, b) => {
      const av = a[sort.col], bv = b[sort.col];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "number" && typeof bv === "number") return sort.dir === "asc" ? av - bv : bv - av;
      return sort.dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const view = rows.slice(page * pageSize, page * pageSize + pageSize);

  function toggle(col) {
    setSort((s) => (s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }));
    setPage(0);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <p className="font-heading text-sm text-foreground">{dataset.row_count.toLocaleString()} rows · {dataset.columns.length} columns</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-md border border-border px-2 py-1 disabled:opacity-40 hover:bg-accent">Prev</button>
          <span>Page {page + 1} / {pages}</span>
          <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="rounded-md border border-border px-2 py-1 disabled:opacity-40 hover:bg-accent">Next</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {dataset.columns.map((c) => (
                <th
                  key={c.name}
                  onClick={() => toggle(c.name)}
                  className="cursor-pointer select-none px-4 py-3 text-left font-medium text-foreground whitespace-nowrap hover:bg-accent/60"
                >
                  <span className="flex items-center gap-1.5">
                    {c.name}
                    <span className="text-muted-foreground">
                      {sort.col === c.name ? (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </span>
                    <span className="rounded bg-foreground/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{c.type}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((r, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-accent/30">
                {dataset.columns.map((c) => (
                  <td key={c.name} className="px-4 py-2.5 text-foreground/80 whitespace-nowrap">{fmt(r[c.name])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}