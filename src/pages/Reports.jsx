import React, { useEffect, useMemo, useState } from "react";
import { useSelectedDataset } from "@/hooks/useSelectedDataset";
import DatasetPicker from "@/components/analytics/DatasetPicker";
import EmptyDataset from "@/components/analytics/EmptyDataset";
import { detectColumnType, toNumber, fmt, categoricalStats } from "@/lib/analytics";
import { descriptiveStats, correlation, missingCount, uniqueCount, duplicateRowCount } from "@/lib/stats";
import { toCsv } from "@/lib/sql";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { groupBy } from "@/lib/analytics";
import { FileText, Download, FileDown } from "lucide-react";
import { jsPDF } from "jspdf";

export default function Reports() {
  const { datasets, loading, dataset, select, selectedId } = useSelectedDataset();

  const report = useMemo(() => (dataset ? buildReport(dataset) : null), [dataset]);
  const [chartData, setChartData] = useState(null);
  useEffect(() => { setChartData(null); }, [selectedId]);

  if (!dataset) return <EmptyDataset datasets={datasets} loading={loading} value={selectedId} onChange={select} />;

  const numericCols = dataset.columns.filter((c) => c.type === "number" || detectColumnType(dataset.rows.map((r) => r[c.name])) === "number").map((c) => c.name);
  const catCols = dataset.columns.map((c) => c.name).filter((c) => !numericCols.includes(c));

  function buildChart() {
    if (!numericCols.length || !catCols.length) return null;
    const data = groupBy(dataset.rows, catCols[0], numericCols[0], "sum").slice(0, 10).map((d) => ({ name: String(d.key).slice(0, 16), value: d.value }));
    setChartData(data);
  }

  function exportPdf() {
    const doc = new jsPDF();
    let y = 16;
    doc.setFontSize(18); doc.text(`Queryly Analysis Report`, 14, y); y += 8;
    doc.setFontSize(10); doc.setTextColor(120); doc.text(`Generated ${new Date().toLocaleString()}`, 14, y); y += 10;
    doc.setTextColor(0); doc.setFontSize(13); doc.text("Dataset Information", 14, y); y += 7;
    doc.setFontSize(10);
    [`Name: ${dataset.name}`, `File: ${dataset.file_name}`, `Rows: ${dataset.row_count}`, `Columns: ${dataset.columns.length}`].forEach((l) => { doc.text(l, 14, y); y += 6; });
    y += 4;
    doc.setFontSize(13); doc.text("Data Quality", 14, y); y += 7;
    doc.setFontSize(10);
    [`Duplicate rows: ${report.dups}`, `Total cells: ${dataset.row_count * dataset.columns.length}`, `Missing cells: ${report.totalMissing}`].forEach((l) => { doc.text(l, 14, y); y += 6; });
    y += 4;
    doc.setFontSize(13); doc.text("Statistical Summary (numeric)", 14, y); y += 7;
    doc.setFontSize(9);
    ["Column", "Mean", "Median", "StdDev", "Min", "Max"].forEach((h, i) => doc.text(h, 14 + i * 30, y));
    y += 6;
    report.numeric.forEach((r) => {
      [r.name.slice(0, 12), fmt(r.mean), fmt(r.median), fmt(r.stdDev), fmt(r.min), fmt(r.max)].forEach((v, i) => doc.text(String(v), 14 + i * 30, y));
      y += 6;
      if (y > 270) { doc.addPage(); y = 16; }
    });
    y += 4;
    doc.setFontSize(13); doc.text("Findings", 14, y); y += 7;
    doc.setFontSize(10);
    report.findings.forEach((f) => { const lines = doc.splitTextToSize(`• ${f}`, 180); doc.text(lines, 14, y); y += lines.length * 6; if (y > 270) { doc.addPage(); y = 16; } });
    doc.save(`${dataset.name}_report.pdf`);
  }
  function exportCsv() {
    const lines = [`Queryly Report,${dataset.name}`, `Generated,${new Date().toISOString()}`, `Rows,${dataset.row_count}`, `Columns,${dataset.columns.length}`, `Duplicate rows,${report.dups}`, `Missing cells,${report.totalMissing}`, "", "Column,Mean,Median,StdDev,Min,Max"];
    report.numeric.forEach((r) => lines.push([r.name, fmt(r.mean), fmt(r.median), fmt(r.stdDev), fmt(r.min), fmt(r.max)].join(",")));
    download(lines.join("\n"), `${dataset.name}_report.csv`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-heading text-2xl font-semibold">Reports</h1><p className="text-sm text-muted-foreground">Auto-generated analysis report for {dataset.name}.</p></div>
        <DatasetPicker datasets={datasets} value={selectedId} onChange={select} loading={loading} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={buildChart} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"><FileText className="h-4 w-4" /> Render chart</button>
        <button onClick={exportPdf} className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"><FileDown className="h-4 w-4" /> Export PDF</button>
        <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"><Download className="h-4 w-4" /> Export CSV</button>
      </div>

      <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
        <div>
          <h2 className="font-heading text-lg font-semibold">Dataset Information</h2>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Info label="Name" value={dataset.name} />
            <Info label="File" value={dataset.file_name} />
            <Info label="Rows" value={dataset.row_count} />
            <Info label="Columns" value={dataset.columns.length} />
          </div>
        </div>

        <div>
          <h2 className="font-heading text-lg font-semibold">Data Quality Summary</h2>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <Info label="Duplicate rows" value={report.dups} />
            <Info label="Missing cells" value={report.totalMissing} />
            <Info label="Total cells" value={dataset.row_count * dataset.columns.length} />
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="text-sm">
              <thead><tr className="border-b border-border bg-muted/30">{["Column", "Type", "Missing", "Unique"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {dataset.columns.map((c) => {
                  const vals = dataset.rows.map((r) => r[c.name]);
                  return <tr key={c.name} className="border-b border-border/40"><td className="px-3 py-1.5 font-medium">{c.name}</td><td className="px-3 py-1.5">{c.type}</td><td className="px-3 py-1.5">{missingCount(vals)}</td><td className="px-3 py-1.5">{uniqueCount(vals)}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>

        {report.numeric.length > 0 && (
          <div>
            <h2 className="font-heading text-lg font-semibold">Statistical Results</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="text-sm">
                <thead><tr className="border-b border-border bg-muted/30">{["Column", "Count", "Mean", "Median", "StdDev", "Min", "Max", "Range", "IQR"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {report.numeric.map((r) => <tr key={r.name} className="border-b border-border/40"><td className="px-3 py-1.5 font-medium">{r.name}</td><td className="px-3 py-1.5">{r.count}</td><td className="px-3 py-1.5 font-mono">{fmt(r.mean)}</td><td className="px-3 py-1.5 font-mono">{fmt(r.median)}</td><td className="px-3 py-1.5 font-mono">{fmt(r.stdDev)}</td><td className="px-3 py-1.5 font-mono">{fmt(r.min)}</td><td className="px-3 py-1.5 font-mono">{fmt(r.max)}</td><td className="px-3 py-1.5 font-mono">{fmt(r.range)}</td><td className="px-3 py-1.5 font-mono">{fmt(r.iqr)}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {chartData && (
          <div>
            <h2 className="font-heading text-lg font-semibold">Chart — {numericCols[0]} by {catCols[0]}</h2>
            <div className="mt-3 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 50 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} /><XAxis dataKey="name" angle={-30} textAnchor="end" height={60} tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="value" fill="#0f172a" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
          </div>
        )}

        <div>
          <h2 className="font-heading text-lg font-semibold">Findings & Observations</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            {report.findings.map((f, i) => <li key={i}>• {f}</li>)}
          </ul>
        </div>

        <p className="border-t border-border pt-3 text-xs text-muted-foreground">Report generated {new Date().toLocaleString()} · Queryly Data Analytics</p>
      </div>
    </div>
  );
}

function buildReport(dataset) {
  const numericCols = dataset.columns.filter((c) => c.type === "number" || detectColumnType(dataset.rows.map((r) => r[c.name])) === "number").map((c) => c.name);
  const numeric = numericCols.map((c) => ({ name: c, ...descriptiveStats(dataset.rows, c) }));
  const totalMissing = dataset.columns.reduce((s, c) => s + missingCount(dataset.rows.map((r) => r[c.name])), 0);
  const dups = duplicateRowCount(dataset.rows);
  const findings = [];
  findings.push(`Dataset contains ${dataset.row_count} rows across ${dataset.columns.length} columns.`);
  if (dups > 0) findings.push(`${dups} duplicate row${dups > 1 ? "s" : ""} detected — consider removing them in Data Cleaning.`);
  if (totalMissing > 0) findings.push(`${totalMissing} missing cell${totalMissing > 1 ? "s" : ""} found across the dataset.`);
  if (numeric.length) {
    const highestVar = [...numeric].sort((a, b) => (b.stdDev || 0) - (a.stdDev || 0))[0];
    findings.push(`"${highestVar.name}" shows the highest variability (std dev ${fmt(highestVar.stdDev)}).`);
    if (numeric.length >= 2) {
      let best = { r: 0, a: "", b: "" };
      for (let i = 0; i < numeric.length; i++) for (let j = i + 1; j < numeric.length; j++) { const r = Math.abs(correlation(dataset.rows, numeric[i].name, numeric[j].name) || 0); if (r > Math.abs(best.r)) best = { r, a: numeric[i].name, b: numeric[j].name }; }
      if (best.a) findings.push(`Strongest correlation is between "${best.a}" and "${best.b}" (r=${fmt(best.r)}).`);
    }
    const maxCol = [...numeric].sort((a, b) => (b.max || 0) - (a.max || 0))[0];
    findings.push(`Largest maximum value is ${fmt(maxCol.max)} in "${maxCol.name}".`);
  }
  return { numeric, totalMissing, dups, findings };
}

function Info({ label, value }) {
  return <div className="rounded-lg bg-muted/40 px-3 py-2"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="truncate text-sm font-medium">{String(value)}</p></div>;
}
function download(content, filename) { const blob = new Blob([content], { type: "text/csv" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }