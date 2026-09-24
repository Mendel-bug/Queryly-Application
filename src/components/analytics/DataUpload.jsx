import React, { useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function DataUpload({ onUploaded }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleFiles(files) {
    const file = files[0];
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      const res = await base44.functions.invoke("extractDataset", { file_url, file_name: file.name });
      const rows = res.data.rows;
      if (!rows || !rows.length) throw new Error(res.data?.error || "No rows found in file");
      const cols = inferColumns(rows);
      const ds = await base44.entities.Dataset.create({
        name: file.name.replace(/\.[^.]+$/, ""),
        file_name: file.name,
        columns: cols,
        rows,
        row_count: rows.length,
      });
      onUploaded(ds);
    } catch (e) {
      setError(e.message || "Could not parse this file. Try a clean CSV or XLSX.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <label
        className="group flex flex-col items-center justify-center gap-4 cursor-pointer rounded-2xl border border-dashed border-border bg-card/50 px-8 py-16 text-center transition hover:border-foreground/40 hover:bg-accent/40"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!loading) handleFiles(Array.from(e.dataTransfer.files));
        }}
      >
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          disabled={loading}
          onChange={(e) => handleFiles(Array.from(e.target.files))}
        />
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background transition group-hover:scale-105">
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6" />}
        </div>
        <div>
          <p className="font-heading text-lg text-foreground">
            {loading ? "Parsing your data…" : "Drop a CSV or Excel file here"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            or click to browse — supports .csv, .xlsx, .xls
          </p>
        </div>
      </label>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}

function inferColumns(rows) {
  const sample = rows.slice(0, 100);
  const keys = Object.keys(rows[0] || {});
  return keys.map((name) => {
    const vals = sample.map((r) => r[name]);
    let type = "string";
    const nums = vals.filter((v) => v !== null && v !== "" && !isNaN(Number(v))).length;
    if (nums / vals.length > 0.8) type = "number";
    return { name, type };
  });
}