import React from "react";
import { Link } from "react-router-dom";
import { useDatasets } from "@/hooks/useSelectedDataset";
import DataUpload from "@/components/analytics/DataUpload";
import { Database, List, Layers, ArrowRight, Table2, Sigma, BarChart3, Terminal } from "lucide-react";

export default function Home() {
  const { datasets, setDatasets } = useDatasets();
  const totalRows = datasets.reduce((s, d) => s + (d.row_count || 0), 0);
  const totalCols = datasets.reduce((s, d) => s + (d.columns?.length || 0), 0);
  const recent = datasets.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Analytics Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your data analytics workspace at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Database} label="Datasets" value={datasets.length} />
        <StatCard icon={List} label="Total Rows" value={totalRows.toLocaleString()} />
        <StatCard icon={Layers} label="Total Columns" value={totalCols} />
        <StatCard icon={Table2} label="Avg Rows / Set" value={datasets.length ? Math.round(totalRows / datasets.length).toLocaleString() : 0} />
      </div>

      {datasets.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8">
          <h2 className="font-heading text-xl font-semibold">Upload your first dataset</h2>
          <p className="mt-1 text-sm text-muted-foreground">Drop a CSV or Excel file to start analyzing.</p>
          <div className="mt-4 max-w-xl"><DataUpload onUploaded={(ds) => setDatasets((d) => [ds, ...d])} /></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-base font-semibold">Recent Datasets</h2>
              <Link to="/datasets" className="text-sm text-muted-foreground hover:text-foreground">View all →</Link>
            </div>
            <div className="mt-4 space-y-2">
              {recent.map((d) => (
                <Link key={d.id} to={`/explorer?ds=${d.id}`} className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-accent/40">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground/5"><Database className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.file_name} · {d.row_count} rows · {d.columns.length} cols</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-heading text-base font-semibold">Quick Actions</h2>
            <div className="mt-4 space-y-2">
              <QuickLink to="/datasets" icon={Database} label="Manage datasets" />
              <QuickLink to="/explorer" icon={Table2} label="Explore data" />
              <QuickLink to="/stats" icon={Sigma} label="Run statistics" />
              <QuickLink to="/visualize" icon={BarChart3} label="Create charts" />
              <QuickLink to="/sql" icon={Terminal} label="Query with SQL" />
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <DataUpload onUploaded={(ds) => setDatasets((d) => [ds, ...d])} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <p className="mt-3 font-heading text-2xl font-semibold">{value}</p>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent/40">
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
      <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
    </Link>
  );
}