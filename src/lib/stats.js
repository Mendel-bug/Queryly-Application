// Extended real statistical computations — pure browser JS, no external engines.
import { toNumber } from "@/lib/analytics";

function round(n) {
  if (!isFinite(n)) return n;
  return Math.round(n * 1000) / 1000;
}

export function percentile(sorted, p) {
  const n = sorted.length;
  if (n === 0) return null;
  if (n === 1) return sorted[0];
  const idx = (n - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function numericVector(rows, col) {
  return rows.map((r) => toNumber(r[col])).filter((v) => v !== null);
}

export function descriptiveStats(rows, col) {
  const nums = numericVector(rows, col).slice().sort((a, b) => a - b);
  const n = nums.length;
  if (n === 0) return { count: 0, sum: 0, mean: null, median: null, min: null, max: null, range: 0, variance: 0, stdDev: 0, q1: null, q3: null, iqr: 0 };
  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const q1 = percentile(nums, 0.25), q3 = percentile(nums, 0.75);
  return {
    count: n,
    sum: round(sum),
    mean: round(mean),
    median: round(percentile(nums, 0.5)),
    min: nums[0],
    max: nums[n - 1],
    range: round(nums[n - 1] - nums[0]),
    variance: round(variance),
    stdDev: round(stdDev),
    q1: round(q1),
    q3: round(q3),
    iqr: round(q3 - q1),
  };
}

export function correlation(rows, xCol, yCol) {
  const pairs = rows
    .map((r) => [toNumber(r[xCol]), toNumber(r[yCol])])
    .filter(([a, b]) => a !== null && b !== null);
  const n = pairs.length;
  if (n < 2) return null;
  const mx = pairs.reduce((s, [a]) => s + a, 0) / n;
  const my = pairs.reduce((s, [, b]) => s + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (const [a, b] of pairs) { const da = a - mx, db = b - my; num += da * db; dx += da * da; dy += db * db; }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? null : round(num / den);
}

export function covariance(rows, xCol, yCol) {
  const pairs = rows.map((r) => [toNumber(r[xCol]), toNumber(r[yCol])]).filter(([a, b]) => a !== null && b !== null);
  const n = pairs.length;
  if (n < 2) return null;
  const mx = pairs.reduce((s, [a]) => s + a, 0) / n;
  const my = pairs.reduce((s, [, b]) => s + b, 0) / n;
  let cov = 0;
  for (const [a, b] of pairs) cov += (a - mx) * (b - my);
  return round(cov / n);
}

export function zScores(rows, col) {
  const nums = numericVector(rows, col);
  const n = nums.length;
  if (n === 0) return [];
  const mean = nums.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / n) || 1;
  return nums.map((v) => round((v - mean) / sd));
}

export function linearRegression(rows, xCol, yCol) {
  const pairs = rows.map((r) => [toNumber(r[xCol]), toNumber(r[yCol])]).filter(([a, b]) => a !== null && b !== null);
  const n = pairs.length;
  if (n < 2) return null;
  const mx = pairs.reduce((s, [a]) => s + a, 0) / n;
  const my = pairs.reduce((s, [, b]) => s + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const [a, b] of pairs) { const da = a - mx, db = b - my; sxy += da * db; sxx += da * da; syy += db * db; }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = my - slope * mx;
  const r = sxx === 0 || syy === 0 ? null : sxy / Math.sqrt(sxx * syy);
  return { slope: round(slope), intercept: round(intercept), r: r === null ? null : round(r), r2: r === null ? null : round(r * r), n };
}

export function missingCount(values) {
  return values.filter((v) => v === null || v === undefined || v === "").length;
}

export function uniqueCount(values) {
  const s = new Set();
  for (const v of values) if (v !== null && v !== undefined && v !== "") s.add(String(v));
  return s.size;
}

export function duplicateRowCount(rows) {
  const seen = new Set();
  let dups = 0;
  for (const r of rows) { const k = JSON.stringify(r); if (seen.has(k)) dups++; else seen.add(k); }
  return dups;
}

export function histogram(rows, col, bins = 10) {
  const nums = numericVector(rows, col).slice().sort((a, b) => a - b);
  if (!nums.length) return [];
  const min = nums[0], max = nums[nums.length - 1];
  if (min === max) return [{ label: String(round(min)), count: nums.length, x0: min, x1: max }];
  const step = (max - min) / bins;
  const out = [];
  for (let i = 0; i < bins; i++) {
    const x0 = min + i * step, x1 = x0 + step;
    const count = nums.filter((v) => (i === bins - 1 ? v >= x0 && v <= x1 : v >= x0 && v < x1)).length;
    out.push({ label: `${round(x0)}–${round(x1)}`, count, x0, x1 });
  }
  return out;
}

export { round };