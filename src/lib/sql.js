// A small, safe, client-side SQL engine. SELECT-only, runs against dataset rows.
import { toNumber } from "@/lib/analytics";

function r0(n) { return !isFinite(n) ? n : Math.round(n * 1000) / 1000; }
function toNum(v) { return toNumber(v); }

// Split a string by a delimiter, ignoring quoted strings and parentheses.
export function splitOn(str, delim, caseInsensitive = false) {
  const parts = [];
  let depth = 0, inQ = false, qch = "", cur = "", i = 0;
  const dlen = delim.length;
  const d = caseInsensitive ? delim.toLowerCase() : delim;
  while (i < str.length) {
    const ch = str[i];
    if (inQ) { cur += ch; if (ch === qch) inQ = false; i++; continue; }
    if (ch === "'" || ch === '"') { inQ = true; qch = ch; cur += ch; i++; continue; }
    if (ch === "(") { depth++; cur += ch; i++; continue; }
    if (ch === ")") { depth--; cur += ch; i++; continue; }
    if (depth === 0) {
      const seg = str.slice(i, i + dlen);
      const cmp = caseInsensitive ? seg.toLowerCase() : seg;
      if (seg.length === dlen && cmp === d) { parts.push(cur); cur = ""; i += dlen; continue; }
    }
    cur += ch; i++;
  }
  parts.push(cur);
  return parts;
}

const AGG_NAMES = ["COUNT", "SUM", "AVG", "MIN", "MAX"];

export function runSql(sql, dataset) {
  try {
    if (!dataset) return { error: "Select a dataset first." };
    const q = String(sql).trim().replace(/;$/, "").replace(/\s+/g, " ");
    if (!/^select /i.test(q)) return { error: "Only SELECT statements are supported." };
    const parsed = parseQuery(q);
    return execute(parsed, dataset);
  } catch (e) {
    return { error: e.message || "Query failed." };
  }
}

function parseQuery(q) {
  const lower = q.toLowerCase();
  const fromIdx = lower.indexOf(" from ");
  if (fromIdx === -1) throw new Error("Missing FROM clause. Use: SELECT ... FROM <dataset>.");
  const selectPart = q.slice(7, fromIdx).trim();
  const afterFrom = q.slice(fromIdx + 6);
  const afterLower = afterFrom.toLowerCase();
  const positions = {
    where: afterLower.indexOf(" where "),
    group: afterLower.indexOf(" group by "),
    order: afterLower.indexOf(" order by "),
    limit: afterLower.indexOf(" limit "),
  };
  const tableEnd = Math.min(...Object.values(positions).filter((i) => i >= 0).concat([afterFrom.length]));
  const tableName = afterFrom.slice(0, tableEnd).trim();
  const wherePart = extractPart(afterFrom, afterLower, " where ", positions.where, positions);
  const groupPart = extractPart(afterFrom, afterLower, " group by ", positions.group, positions);
  const orderPart = extractPart(afterFrom, afterLower, " order by ", positions.order, positions);
  const limitPart = extractPart(afterFrom, afterLower, " limit ", positions.limit, positions);
  const selectItems = splitOn(selectPart, ",").map((s) => parseSelectItem(s.trim()));
  const groupCols = groupPart ? splitOn(groupPart, ",").map((s) => s.trim()) : [];
  const order = orderPart ? parseOrder(orderPart.trim()) : null;
  const limit = limitPart ? parseInt(limitPart, 10) : null;
  const hasAgg = selectItems.some((si) => si.agg);
  return { selectItems, wherePart, groupCols, order, limit, hasAgg, tableName };
}

function extractPart(s, lower, kw, idx, positions) {
  if (idx === -1) return null;
  const start = idx + kw.length;
  const nextStarts = Object.values(positions).filter((i) => i > idx).concat([s.length]);
  const end = Math.min(...nextStarts);
  return s.slice(start, end).trim();
}

function parseSelectItem(item) {
  const aggM = item.match(/^([A-Za-z]+)\s*\(([\s\S]*)\)\s*(?:as\s+(\w+))?$/i);
  if (aggM && AGG_NAMES.includes(aggM[1].toUpperCase())) {
    const arg = aggM[2].trim();
    return { agg: aggM[1].toUpperCase(), arg: arg === "*" ? "*" : arg, alias: aggM[3] || `${aggM[1].toUpperCase()}(${arg})` };
  }
  const asM = item.match(/^([\w.]+)\s+as\s+(\w+)$/i);
  if (asM) return { col: asM[1].trim(), alias: asM[2] };
  if (item === "*") return { col: "*" };
  return { col: item };
}

function parseOrder(part) {
  const m = part.match(/^([\w.]+)\s*(asc|desc)?$/i);
  if (!m) throw new Error("Invalid ORDER BY: " + part);
  return { col: m[1], dir: (m[2] || "asc").toLowerCase() };
}

function execute(parsed, dataset) {
  const cols = dataset.columns.map((c) => c.name);
  let filtered = dataset.rows;
  if (parsed.wherePart) filtered = filtered.filter((r) => evalWhere(parsed.wherePart, r));

  if (parsed.hasAgg || parsed.groupCols.length) return aggregate(parsed, filtered);

  const star = parsed.selectItems.some((si) => si.col === "*");
  const projCols = star ? cols : parsed.selectItems.map((si) => si.alias || si.col);
  let outRows = filtered.map((r) => {
    if (star) return Object.fromEntries(cols.map((c) => [c, r[c]]));
    const o = {};
    parsed.selectItems.forEach((si) => { if (si.col !== "*") o[si.alias || si.col] = r[si.col]; });
    return o;
  });
  if (parsed.order) outRows = sortRows(outRows, parsed.order.col, parsed.order.dir);
  if (parsed.limit != null) outRows = outRows.slice(0, parsed.limit);
  return { columns: projCols, rows: outRows };
}

function aggregate(parsed, rows) {
  if (parsed.groupCols.length) {
    const groups = {};
    for (const r of rows) {
      const key = parsed.groupCols.map((c) => String(r[c] === null || r[c] === undefined ? "" : r[c])).join(" | ");
      (groups[key] ||= []).push(r);
    }
    let outRows = Object.entries(groups).map(([, items]) => {
      const o = {};
      parsed.groupCols.forEach((c) => { o[c] = items[0][c]; });
      parsed.selectItems.forEach((si) => {
        if (si.agg) o[si.alias || si.arg] = computeAgg(si, items);
        else if (si.col && !parsed.groupCols.includes(si.col)) o[si.alias || si.col] = items[0][si.col];
      });
      return o;
    });
    if (parsed.order) outRows = sortRows(outRows, parsed.order.col, parsed.order.dir);
    if (parsed.limit != null) outRows = outRows.slice(0, parsed.limit);
    const outCols = outRows.length ? Object.keys(outRows[0]) : [];
    return { columns: outCols, rows: outRows };
  }
  const o = {};
  parsed.selectItems.forEach((si) => {
    if (si.agg) o[si.alias || si.arg] = computeAgg(si, rows);
    else o[si.alias || si.col] = rows.length ? rows[0][si.col] : null;
  });
  return { columns: Object.keys(o), rows: [o] };
}

function computeAgg(si, items) {
  if (si.agg === "COUNT") return si.arg === "*" ? items.length : items.filter((r) => r[si.arg] != null && r[si.arg] !== "").length;
  const nums = items.map((r) => toNum(r[si.arg])).filter((v) => v !== null);
  if (!nums.length) return null;
  if (si.agg === "SUM") return r0(nums.reduce((a, b) => a + b, 0));
  if (si.agg === "AVG") return r0(nums.reduce((a, b) => a + b, 0) / nums.length);
  if (si.agg === "MIN") return Math.min(...nums);
  if (si.agg === "MAX") return Math.max(...nums);
  return null;
}

function evalWhere(whereStr, r) {
  const ors = splitOn(whereStr, " or ", true).map((s) => s.trim());
  return ors.some((orPart) => {
    const ands = splitOn(orPart, " and ", true).map((s) => s.trim());
    return ands.every((cond) => evalCondition(cond, r));
  });
}

function evalCondition(cond, r) {
  cond = cond.trim();
  const inM = cond.match(/^(\w+)\s+IN\s*\(([\s\S]*)\)$/i);
  if (inM) {
    const vals = splitOn(inM[2], ",").map((v) => parseValue(v.trim()));
    return vals.includes(r[inM[1]]);
  }
  const likeM = cond.match(/^(\w+)\s+LIKE\s+(.*)$/i);
  if (likeM) {
    const pat = String(parseValue(likeM[2]));
    const re = new RegExp("^" + pat.replace(/%/g, ".*").replace(/_/g, ".") + "$");
    return re.test(String(r[likeM[1]] ?? ""));
  }
  const m = cond.match(/^(\w+)\s*(>=|<=|<>|!=|=|>|<)\s*(.*)$/);
  if (m) return compare(r[m[1]], m[2], parseValue(m[3].trim()));
  const m2 = cond.match(/^(\w+)$/);
  if (m2) return r[m2[1]] != null && r[m2[1]] !== "";
  throw new Error("Could not parse condition: " + cond);
}

function parseValue(raw) {
  raw = raw.trim();
  if (/^["'].*["']$/.test(raw)) return raw.slice(1, -1);
  if (raw.toLowerCase() === "null") return null;
  if (raw.toLowerCase() === "true") return true;
  if (raw.toLowerCase() === "false") return false;
  const n = toNum(raw);
  return n === null ? raw : n;
}

function compare(a, op, b) {
  const an = toNum(a), bn = toNum(b);
  const useNum = an !== null && bn !== null;
  const x = useNum ? an : a, y = useNum ? bn : b;
  switch (op) {
    case ">": return x > y;
    case "<": return x < y;
    case ">=": return x >= y;
    case "<=": return x <= y;
    case "=": return x === y;
    case "!=": case "<>": return x !== y;
    default: return false;
  }
}

function sortRows(rows, col, dir) {
  return rows.slice().sort((a, b) => {
    const av = a[col], bv = b[col];
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return dir === "asc" ? av - bv : bv - av;
    return dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });
}

export function toCsv(columns, rows) {
  const head = columns.join(",");
  const body = rows.map((r) => columns.map((c) => {
    const v = r[c];
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
  return head + "\n" + body;
}