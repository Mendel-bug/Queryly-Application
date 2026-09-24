// Lightweight in-browser analytics helpers — the JS equivalent of numpy/pandas basics.

export function detectColumnType(values) {
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== "");
  if (nonNull.length === 0) return "string";
  let numeric = 0, bool = 0, date = 0;
  for (const v of nonNull) {
    if (typeof v === "number" || (!isNaN(Number(v)) && v !== "" && typeof v !== "boolean")) numeric++;
    else if (v === true || v === false || v === "true" || v === "false" || v === "TRUE" || v === "FALSE") bool++;
    else if (!isNaN(Date.parse(v)) && typeof v === "string" && /[-/:]/.test(v) && v.length >= 6) date++;
  }
  if (numeric / nonNull.length > 0.8) return "number";
  if (bool / nonNull.length > 0.8) return "boolean";
  if (date / nonNull.length > 0.6) return "date";
  return "string";
}

export function toNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return isNaN(n) ? null : n;
}

export function numericStats(values) {
  const nums = values.map(toNumber).filter((v) => v !== null).sort((a, b) => a - b);
  const n = nums.length;
  if (n === 0) return { count: 0 };
  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const q = (p) => {
    const idx = (n - 1) * p;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return nums[lo] + (nums[hi] - nums[lo]) * (idx - lo);
  };
  return {
    count: n,
    sum: round(sum),
    mean: round(mean),
    median: round(q(0.5)),
    stdDev: round(stdDev),
    min: nums[0],
    max: nums[n - 1],
    q1: round(q(0.25)),
    q3: round(q(0.75)),
    range: round(nums[n - 1] - nums[0]),
  };
}

export function categoricalStats(values) {
  const counts = {};
  let missing = 0;
  for (const v of values) {
    if (v === null || v === undefined || v === "") { missing++; continue; }
    const key = String(v);
    counts[key] = (counts[key] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return {
    count: values.length,
    unique: sorted.length,
    missing,
    top: sorted.slice(0, 8).map(([value, count]) => ({ value, count })),
  };
}

export function groupBy(rows, groupCol, aggCol, agg = "sum") {
  const groups = {};
  for (const r of rows) {
    const key = r[groupCol];
    const k = key === null || key === undefined ? "(empty)" : String(key);
    if (!groups[k]) groups[k] = [];
    groups[k].push(r);
  }
  const out = [];
  for (const [key, items] of Object.entries(groups)) {
    const vals = items.map((r) => toNumber(r[aggCol])).filter((v) => v !== null);
    let value = 0;
    if (agg === "sum") value = vals.reduce((a, b) => a + b, 0);
    else if (agg === "mean") value = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    else if (agg === "count") value = items.length;
    else if (agg === "min") value = vals.length ? Math.min(...vals) : 0;
    else if (agg === "max") value = vals.length ? Math.max(...vals) : 0;
    out.push({ key, value: round(value), count: items.length });
  }
  return out.sort((a, b) => b.value - a.value);
}

export function filterRows(rows, predicate) {
  return rows.filter(predicate);
}

function round(n) {
  if (!isFinite(n)) return n;
  return Math.round(n * 1000) / 1000;
}

export function fmt(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") {
    if (Math.abs(v) >= 1000 || (v !== 0 && Math.abs(v) < 0.01)) return v.toLocaleString(undefined, { maximumFractionDigits: 3 });
    return round(v).toString();
  }
  return String(v);
}