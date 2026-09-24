import React from "react";
import DatasetPicker from "@/components/analytics/DatasetPicker";
import { Database } from "lucide-react";

export default function EmptyDataset({ datasets, loading, value, onChange }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/5">
        <Database className="h-7 w-7 text-muted-foreground" />
      </div>
      <h2 className="font-heading text-lg font-semibold">Select a dataset</h2>
      <p className="mt-1 text-sm text-muted-foreground">Choose a dataset to begin this analysis.</p>
      <div className="mt-4 flex justify-center">
        <DatasetPicker datasets={datasets} value={value} onChange={onChange} loading={loading} />
      </div>
    </div>
  );
}