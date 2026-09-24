import React from "react";
import { useSelectedDataset } from "@/hooks/useSelectedDataset";
import DatasetPicker from "@/components/analytics/DatasetPicker";
import EmptyDataset from "@/components/analytics/EmptyDataset";
import QueryPanel from "@/components/analytics/QueryPanel";
import { Sparkles } from "lucide-react";

export default function AskAi() {
  const { datasets, loading, dataset, select, selectedId } = useSelectedDataset();
  if (!dataset) return <EmptyDataset datasets={datasets} loading={loading} value={selectedId} onChange={select} />;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-heading text-2xl font-semibold flex items-center gap-2"><Sparkles className="h-5 w-5" /> Ask AI</h1><p className="text-sm text-muted-foreground">Natural-language questions about {dataset.name}. 10 free prompts, then $5/mo.</p></div>
        <DatasetPicker datasets={datasets} value={selectedId} onChange={select} loading={loading} />
      </div>
      <QueryPanel dataset={dataset} />
    </div>
  );
}