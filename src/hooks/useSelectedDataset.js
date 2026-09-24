import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";

export function useDatasets() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await base44.entities.Dataset.list("-created_date", 100);
      setDatasets(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { datasets, loading, error, setDatasets, reload: load };
}

export function useSelectedDataset() {
  const { datasets, loading, setDatasets, reload } = useDatasets();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("ds");
  const dataset = datasets.find((d) => d.id === selectedId) || null;

  const select = useCallback((id) => {
    const next = new URLSearchParams(params);
    if (id) next.set("ds", id); else next.delete("ds");
    setParams(next, { replace: true });
  }, [params, setParams]);

  return { datasets, loading, dataset, select, selectedId, setDatasets, reload };
}