import React, { useState, useEffect } from "react";
import { Sparkles, Loader2, Send, Lock, Crown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { fmt, numericStats, categoricalStats } from "@/lib/analytics";

const FREE_LIMIT = 10;

export default function QueryPanel({ dataset }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState(null);
  const [paywall, setPaywall] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    loadUsage();
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      window.history.replaceState({}, "", window.location.pathname);
      pollForActivation();
    }
  }, []);

  async function loadUsage() {
    try {
      const records = await base44.entities.UserUsage.filter({});
      const u = records[0];
      if (u) {
        const subActive =
          u.subscription_status === "active" &&
          (!u.subscription_end || new Date(u.subscription_end) > new Date());
        setUsage({
          remaining: subActive ? -1 : FREE_LIMIT - (u.prompt_count || 0),
          subscription_status: subActive ? "active" : "free",
        });
      } else {
        setUsage({ remaining: FREE_LIMIT, subscription_status: "free" });
      }
    } catch {
      setUsage({ remaining: FREE_LIMIT, subscription_status: "free" });
    }
  }

  async function pollForActivation() {
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      const records = await base44.entities.UserUsage.filter({});
      const u = records[0];
      if (u && u.subscription_status === "active") {
        setUsage({ remaining: -1, subscription_status: "active" });
        setPaywall(false);
        return;
      }
    }
  }

  async function ask() {
    if (!question.trim() || loading) return;
    setLoading(true);
    setAnswer(null);
    setPaywall(false);
    try {
      const gate = await base44.functions.invoke("trackPrompt", {});
      const gateData = gate.data;
      if (!gateData || gateData.allowed === false) {
        setPaywall(true);
        setUsage({ remaining: 0, subscription_status: gateData?.subscription_status || "free" });
        setLoading(false);
        return;
      }
      setUsage({ remaining: gateData.remaining, subscription_status: gateData.subscription_status });

      const sample = dataset.rows.slice(0, 25);
      const schema = dataset.columns.map((c) => `${c.name} (${c.type})`).join(", ");
      const stats = {};
      for (const c of dataset.columns) {
        const vals = dataset.rows.map((r) => r[c.name]);
        stats[c.name] = c.type === "number" ? numericStats(vals) : categoricalStats(vals);
      }
      const res = await base44.functions.invoke("askAI", {
        datasetName: dataset.name,
        schema,
        sample,
        rowCount: dataset.row_count,
        stats,
        question,
      });
      if (res.data?.error) throw new Error(res.data.error);
      setAnswer(res.data.answer);
    } catch (e) {
      setAnswer({ summary: "Could not reach the analysis engine. " + (e.message || "") });
    } finally {
      setLoading(false);
    }
  }

  async function subscribe() {
    if (subscribing) return;
    if (window.self !== window.top) {
      alert("Checkout works only from the published app. Open the app in a new tab to subscribe.");
      return;
    }
    setSubscribing(true);
    try {
      const res = await base44.functions.invoke("createCheckout", { origin: window.location.origin });
      if (res.data?.url) window.location.href = res.data.url;
      else throw new Error(res.data?.error || "No checkout URL returned");
    } catch (e) {
      alert("Could not start checkout. " + (e.message || ""));
    } finally {
      setSubscribing(false);
    }
  }

  const suggestions = [
    "Summarize this dataset",
    "Which category has the highest total?",
    "What is the correlation between the numeric columns?",
    "Find outliers in the data",
  ];

  const isPro = usage?.subscription_status === "active";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-foreground" />
            <h3 className="font-heading text-sm text-foreground">Ask a question about your data</h3>
          </div>
          {usage && (
            isPro ? (
              <span className="flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-medium text-background">
                <Crown className="h-3 w-3" /> Pro
              </span>
            ) : (
              <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
                {usage.remaining} / {FREE_LIMIT} free prompts left
              </span>
            )
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="e.g. What is the average revenue per region?"
            className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={ask}
            disabled={loading || !question.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:opacity-40 hover:opacity-90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? "Analyzing" : "Ask"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setQuestion(s)}
              className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground hover:bg-accent"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {paywall && (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background">
            <Lock className="h-5 w-5" />
          </div>
          <h3 className="mt-3 font-heading text-lg font-semibold text-foreground">You've used all {FREE_LIMIT} free prompts</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Subscribe for <span className="font-medium text-foreground">$5/month</span> to get unlimited AI-powered queries on every dataset.
          </p>
          <button
            onClick={subscribe}
            disabled={subscribing}
            className="mx-auto mt-4 flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-50 hover:opacity-90"
          >
            {subscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
            {subscribing ? "Redirecting to checkout…" : "Subscribe for $5/month"}
          </button>
          <p className="mt-2 text-[11px] text-muted-foreground">Cancel anytime. Secure payment via Stripe.</p>
        </div>
      )}

      {answer && !paywall && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <p className="text-sm leading-relaxed text-foreground">{answer.summary}</p>
          {answer.table && Array.isArray(answer.table) && answer.table.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <tbody>
                  {answer.table.map((row, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      {Object.entries(row).map(([k, v]) => (
                        <td key={k} className="px-4 py-2.5">
                          <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">{k}</span>
                          <span className="text-foreground">{fmt(v)}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {answer.chart && answer.chart.data && answer.chart.type !== "none" && (
            <ChartResult chart={answer.chart} />
          )}
        </div>
      )}
    </div>
  );
}

function ChartResult({ chart }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="mb-3 text-xs text-muted-foreground">{chart.x} vs {chart.y}</p>
      <div className="flex h-40 items-end gap-1.5">
        {chart.data.slice(0, 15).map((d, i) => {
          const max = Math.max(...chart.data.map((x) => Number(x.value) || 0), 1);
          const h = (Math.abs(Number(d.value) || 0) / max) * 100;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t bg-foreground/80" style={{ height: `${h}%`, minHeight: 2 }} title={`${d.name}: ${d.value}`} />
              <span className="truncate text-[9px] text-muted-foreground" style={{ maxWidth: 40 }}>{String(d.name).slice(0, 6)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}