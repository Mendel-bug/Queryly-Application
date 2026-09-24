import React, { useMemo } from "react";
import { numericStats, categoricalStats, detectColumnType, fmt } from "@/lib/analytics";
import { Hash, Type, Calendar, ToggleLeft } from "lucide-react";

export default function SummaryStats({ dataset }) {
  const stats = useMemo(() => {
    return dataset.columns.map((c) => {
      const values = dataset.rows.map((r) => r[c.name]);
      const type = c.type === "number" ? "number" : detectColumnType(values);
      return { col: c, type, stats: type === "number" ? numericStats(values) : categoricalStats(values) };
    });
  }, [dataset]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {stats.map(({ col, type, stats: s }) => (
        <div key={col.name} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <TypeIcon type={type} />
            <h3 className="font-heading text-base text-foreground">{col.name}</h3>
            <span className="ml-auto rounded-full bg-foreground/5 px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">{type}</span>
          </div>
          {type === "number" ? (
            <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-3">
              <Stat label="Count" value={s.count} />
              <Stat label="Mean" value={fmt(s.mean)} />
              <Stat label="Median" value={fmt(s.median)} />
              <Stat label="Std Dev" value={fmt(s.stdDev)} />
              <Stat label="Min" value={fmt(s.min)} />
              <Stat label="Max" value={fmt(s.max)} />
              <Stat label="Q1" value={fmt(s.q1)} />
              <Stat label="Q3" value={fmt(s.q3)} />
              <Stat label="Sum" value={fmt(s.sum)} />
            </div>
          ) : (
            <div className="mt-3">
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>{s.unique} unique</span>
                <span>{s.missing} missing</span>
                <span>{s.count} total</span>
              </div>
              <div className="mt-3 space-y-2">
                {s.top.map((t) => {
                  const pct = (t.count / s.count) * 100;
                  return (
                    <div key={t.value}>
                      <div className="flex justify-between text-xs">
                        <span className="truncate pr-2 text-foreground/80">{t.value}</span>
                        <span className="text-muted-foreground">{t.count}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-foreground/70" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-sm text-foreground">{value}</p>
    </div>
  );
}

function TypeIcon({ type }) {
  const cls = "h-4 w-4 text-muted-foreground";
  if (type === "number") return <Hash className={cls} />;
  if (type === "date") return <Calendar className={cls} />;
  if (type === "boolean") return <ToggleLeft className={cls} />;
  return <Type className={cls} />;
}