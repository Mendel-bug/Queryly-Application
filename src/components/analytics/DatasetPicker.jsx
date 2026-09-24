import React from "react";

export default function DatasetPicker({ datasets, value, onChange, loading }) {
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={loading}
      className="select min-w-[180px]"
    >
      <option value="">{loading ? "Loading…" : "Select a dataset…"}</option>
      {datasets.map((d) => (
        <option key={d.id} value={d.id}>{d.name} · {d.row_count} rows</option>
      ))}
    </select>
  );
}