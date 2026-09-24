import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useDatasets } from "@/hooks/useSelectedDataset";
import { toNumber, fmt } from "@/lib/analytics";
import { groupBy } from "@/lib/analytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Save, Trash2, ArrowUp, ArrowDown, LayoutDashboard, Pencil } from "lucide-react";

export default function Dashboards() {
  const { datasets } = useDatasets();
  const [dashboards, setDashboards] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() { try { setDashboards(await base44.entities.Dashboard.list("-created_date", 50)); } catch { setDashboards([]); } }

  const active = dashboards.find((d) => d.id === activeId);
  const [items, setItems] = useState([]);
  const [dashName, setDashName] = useState("");
  useEffect(() => { setItems(active?.items || []); setDashName(active?.name || ""); }, [activeId]);

  async function createDashboard() {
    if (!name.trim()) return;
    const d = await base44.entities.Dashboard.create({ name: name.trim(), items: [] });
    setName(""); setDashboards((l) => [d, ...l]); setActiveId(d.id);
  }
  async function saveDashboard() {
    if (!active) return;
    await base44.entities.Dashboard.update(active.id, { name: dashName, items });
    load();
  }
  async function deleteDashboard(id) {
    if (!confirm("Delete this dashboard?")) return;
    await base44.entities.Dashboard.delete(id);
    if (activeId === id) setActiveId(null);
    load();
  }
  function move(i, dir) {
    setItems((arr) => { const j = i + dir; if (j < 0 || j >= arr.length) return arr; const c = [...arr]; [c[i], c[j]] = [c[j], c[i]]; return c; });
  }
  function add(item) { setItems((a) => [...a, { ...item, size: "md" }]); setAdding(null); }
  function removeItem(i) { setItems((arr) => arr.filter((_, k) => k !== i)); }
  function toggleSize(i) { setItems((arr) => arr.map((it, k) => k === i ? { ...it, size: it.size === "md" ? "sm" : "md" } : it)); }

  return (
    <div className="space-y-6">
      <div><h1 className="font-heading text-2xl font-semibold">Dashboards</h1><p className="text-sm text-muted-foreground">Combine KPIs and charts into a saved dashboard.</p></div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New dashboard name…" className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button onClick={createDashboard} disabled={!name.trim()} className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-40"><Plus className="h-4 w-4" /> Create</button>
      </div>

      {dashboards.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {dashboards.map((d) => (
            <button key={d.id} onClick={() => setActiveId(d.id)} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${activeId === d.id ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent"}`}>
              <LayoutDashboard className="h-3.5 w-3.5" /> {d.name}
              <span onClick={(e) => { e.stopPropagation(); deleteDashboard(d.id); }} className="opacity-60 hover:opacity-100"><Trash2 className="h-3 w-3" /></span>
            </button>
          ))}
        </div>
      )}

      {active && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input value={dashName} onChange={(e) => setDashName(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <button onClick={saveDashboard} className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"><Save className="h-4 w-4" /> Save</button>
            <div className="ml-auto flex gap-2">
              <button onClick={() => setAdding("kpi")} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Plus className="h-4 w-4" /> KPI</button>
              <button onClick={() => setAdding("chart")} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Plus className="h-4 w-4" /> Chart</button>
            </div>
          </div>

          {adding && <AddPanel type={adding} datasets={datasets} onAdd={add} onCancel={() => setAdding(null)} />}

          {items.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Add a KPI or chart to start building.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((it, i) => (
                <div key={i} className={`rounded-2xl border border-border bg-card p-4 ${it.size === "sm" ? "md:col-span-1" : "md:col-span-1 lg:col-span-2"}`}>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">{it.type === "kpi" ? `${it.agg} of ${it.col}` : it.label || "Chart"}</span>
                    <div className="flex gap-1">
                      <button onClick={() => move(i, -1)} className="rounded p-1 text-muted-foreground hover:bg-accent"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button onClick={() => move(i, 1)} className="rounded p-1 text-muted-foreground hover:bg-accent"><ArrowDown className="h-3.5 w-3.5" /></button>
                      <button onClick={() => toggleSize(i)} className="rounded p-1 text-muted-foreground hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => removeItem(i)} className="rounded p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <ItemRenderer item={it} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddPanel({ type, datasets, onAdd, onCancel }) {
  const [datasetId, setDatasetId] = useState(datasets[0]?.id || "");
  const ds = datasets.find((d) => d.id === datasetId);
  const cols = ds ? ds.columns.map((c) => c.name) : [];
  const numericCols = ds ? ds.columns.filter((c) => c.type === "number").map((c) => c.name) : [];
  const [agg, setAgg] = useState("sum");
  const [col, setCol] = useState("");
  const [xCol, setXCol] = useState("");
  const [yCol, setYCol] = useState("");
  const [label, setLabel] = useState("");

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="font-heading text-sm font-semibold">Add {type}</h3>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Field label="Dataset"><select value={datasetId} onChange={(e) => setDatasetId(e.target.value)} className="select">{datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        {type === "kpi" ? (
          <>
            <Field label="Aggregation"><select value={agg} onChange={(e) => setAgg(e.target.value)} className="select">{["count", "sum", "mean", "min", "max"].map((a) => <option key={a}>{a}</option>)}</select></Field>
            <Field label="Column"><select value={col} onChange={(e) => setCol(e.target.value)} className="select">{agg === "count" ? cols.map((c) => <option key={c}>{c}</option>) : numericCols.map((c) => <option key={c}>{c}</option>)}</select></Field>
          </>
        ) : (
          <>
            <Field label="Category (X)"><select value={xCol} onChange={(e) => setXCol(e.target.value)} className="select">{cols.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Value (Y)"><select value={yCol} onChange={(e) => setYCol(e.target.value)} className="select">{numericCols.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Label"><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="optional" className="rounded-lg border border-input bg-background px-3 py-2 text-sm" /></Field>
          </>
        )}
        <button onClick={() => onAdd(type === "kpi" ? { type, dataset_id: datasetId, agg, col } : { type, dataset_id: datasetId, xCol, yCol, label: label || `${yCol} by ${xCol}` })} className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background">Add</button>
        <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
      </div>
    </div>
  );
}

function ItemRenderer({ item }) {
  const [rows, setRows] = useState(null);
  useEffect(() => { let live = true; base44.entities.Dataset.get(item.dataset_id).then((d) => live && setRows(d.rows)).catch(() => live && setRows([])); return () => { live = false; }; }, [item.dataset_id]);
  if (!rows) return <div className="h-24 animate-pulse rounded-lg bg-muted/40" />;
  if (item.type === "kpi") {
    const vals = item.agg === "count" ? rows.map((r) => r[item.col]) : rows.map((r) => toNumber(r[item.col])).filter((v) => v !== null);
    let v = 0;
    if (item.agg === "count") v = vals.filter((x) => x !== null && x !== undefined && x !== "").length;
    else if (item.agg === "sum") v = vals.reduce((a, b) => a + b, 0);
    else if (item.agg === "mean") v = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    else if (item.agg === "min") v = vals.length ? Math.min(...vals) : 0;
    else if (item.agg === "max") v = vals.length ? Math.max(...vals) : 0;
    return <p className="font-heading text-4xl font-semibold">{fmt(Math.round(v * 1000) / 1000)}</p>;
  }
  const data = groupBy(rows, item.xCol, item.yCol, "sum").slice(0, 15).map((d) => ({ name: String(d.key).slice(0, 16), value: d.value }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" angle={-30} textAnchor="end" height={50} tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip />
        <Bar dataKey="value" fill="#0f172a" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Field({ label, children }) {
  return <label className="flex flex-col gap-1"><span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>{children}</label>;
}