// Excel-style formula evaluator. Real browser-side computation over dataset rows.
import { toNumber } from "@/lib/analytics";

const FN_AGG = ["SUM", "AVERAGE", "COUNT", "COUNTA", "MIN", "MAX", "MEDIAN"];
const FN_ALL = [...FN_AGG, "COUNTIF", "SUMIF", "AVERAGEIF", "IF", "AND", "OR"];
export const SUPPORTED = FN_ALL;

function r0(n) { return !isFinite(n) ? n : Math.round(n * 1000) / 1000; }

export function evaluateFormula(expr, rows) {
  const tokens = tokenize(String(expr).trim());
  let pos = 0;
  const peek = (k = 0) => tokens[pos + k];
  const next = () => tokens[pos++];
  const expect = (type) => {
    const t = next();
    if (!t || t.type !== type) throw new Error(`Expected ${type}`);
    return t;
  };

  function parseOr() {
    let l = parseAnd();
    while (isKw("OR")) { next(); const r = parseAnd(); l = l || r; }
    return l;
  }
  function parseAnd() {
    let l = parseCmp();
    while (isKw("AND")) { next(); const r = parseCmp(); l = l && r; }
    return l;
  }
  function isKw(w) {
    const t = peek();
    const t2 = peek(1);
    return t && t.type === "IDENT" && t.value.toUpperCase() === w && t2 && t2.type !== "LP";
  }
  function parseCmp() {
    let l = parseAdd();
    while (peek() && peek().type === "OP" && [">", "<", ">=", "<=", "=", "!="].includes(peek().value)) {
      const op = next().value;
      const r = parseAdd();
      l = cmp(l, op, r);
    }
    return l;
  }
  function parseAdd() {
    let l = parseMul();
    while (peek() && peek().type === "OP" && ["+", "-"].includes(peek().value)) {
      const op = next().value;
      const r = parseMul();
      l = op === "+" ? num(l) + num(r) : num(l) - num(r);
    }
    return l;
  }
  function parseMul() {
    let l = parsePrim();
    while (peek() && peek().type === "OP" && ["*", "/"].includes(peek().value)) {
      const op = next().value;
      const r = parsePrim();
      l = op === "*" ? num(l) * num(r) : num(l) / num(r);
    }
    return l;
  }
  function parsePrim() {
    const t = peek();
    if (!t) throw new Error("Unexpected end of formula");
    if (t.type === "NUM") { next(); return t.value; }
    if (t.type === "STR") { next(); return t.value; }
    if (t.type === "LP") { next(); const v = parseOr(); expect("RP"); return v; }
    if (t.type === "IDENT") {
      next();
      if (peek() && peek().type === "LP") {
        next();
        const fn = t.value.toUpperCase();
        if (!FN_ALL.includes(fn)) throw new Error("Unknown function: " + fn);
        const args = parseFnArgs(fn);
        return applyFn(fn, args, rows);
      }
    }
    throw new Error("Unexpected token: " + (t.value || t.type));
  }

  function parseFnArgs(fn) {
    if (peek() && peek().type === "RP") { next(); return []; }
    if (FN_AGG.includes(fn)) {
      const t = next();
      let col = "*";
      if (t.type === "OP" && t.value === "*") col = "*";
      else if (t.type === "IDENT") col = t.value;
      else throw new Error(fn + " expects a column name");
      expect("RP");
      return [{ col }];
    }
    if (fn === "COUNTIF") {
      const col = expect("IDENT").value;
      expect("COMMA");
      const crit = expect("STR").value;
      expect("RP");
      return [{ col }, { crit }];
    }
    if (fn === "SUMIF" || fn === "AVERAGEIF") {
      const col = expect("IDENT").value;
      expect("COMMA");
      const crit = expect("STR").value;
      let sumCol = col;
      if (peek() && peek().type === "COMMA") { next(); sumCol = expect("IDENT").value; }
      expect("RP");
      return [{ col }, { crit }, { col: sumCol }];
    }
    const args = [parseOr()];
    while (peek() && peek().type === "COMMA") { next(); args.push(parseOr()); }
    expect("RP");
    return args;
  }

  const result = parseOr();
  if (pos < tokens.length) throw new Error("Unexpected trailing tokens");
  return result;
}

function applyFn(fn, args, rows) {
  if (FN_AGG.includes(fn)) return agg(fn, args[0].col, rows);
  if (fn === "COUNTIF") return rows.filter((r) => matchCriteria(r[args[0].col], args[1].crit)).length;
  if (fn === "SUMIF" || fn === "AVERAGEIF") {
    const matched = rows.filter((r) => matchCriteria(r[args[0].col], args[1].crit));
    const nums = matched.map((r) => toNumber(r[args[2].col])).filter((v) => v !== null);
    if (fn === "SUMIF") return r0(nums.reduce((a, b) => a + b, 0));
    return nums.length ? r0(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
  }
  if (fn === "IF") return args[0] ? args[1] : args[2];
  if (fn === "AND") return args.every(Boolean);
  if (fn === "OR") return args.some(Boolean);
  throw new Error("Unsupported: " + fn);
}

function agg(fn, col, rows) {
  if (col === "*") return fn === "COUNT" ? rows.length : 0;
  const vals = rows.map((r) => r[col]);
  if (fn === "COUNT") return vals.map(toNumber).filter((v) => v !== null).length;
  if (fn === "COUNTA") return vals.filter((v) => v !== null && v !== undefined && v !== "").length;
  const nums = vals.map(toNumber).filter((v) => v !== null);
  if (!nums.length) return 0;
  if (fn === "SUM") return r0(nums.reduce((a, b) => a + b, 0));
  if (fn === "AVERAGE") return r0(nums.reduce((a, b) => a + b, 0) / nums.length);
  if (fn === "MIN") return Math.min(...nums);
  if (fn === "MAX") return Math.max(...nums);
  if (fn === "MEDIAN") {
    const s = nums.slice().sort((a, b) => a - b);
    const n = s.length;
    return r0(n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2);
  }
  return 0;
}

function matchCriteria(value, crit) {
  const c = String(crit ?? "").trim();
  const m = c.match(/^(>=|<=|<>|!=|=|>|<)(.*)$/);
  if (!m) return String(value ?? "") === c;
  const op = m[1], raw = m[2].trim();
  const cv = toNumber(value), nv = toNumber(raw);
  const useNum = cv !== null && nv !== null;
  const x = useNum ? cv : String(value ?? ""), y = useNum ? nv : raw;
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

function num(v) { return typeof v === "number" ? v : toNumber(v) ?? 0; }
function cmp(l, op, r) {
  const ln = toNumber(l), rn = toNumber(r);
  const useNum = ln !== null && rn !== null;
  const x = useNum ? ln : l, y = useNum ? rn : r;
  switch (op) {
    case ">": return x > y;
    case "<": return x < y;
    case ">=": return x >= y;
    case "<=": return x <= y;
    case "=": return x === y;
    case "!=": return x !== y;
    default: return false;
  }
}

function tokenize(s) {
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    const numM = s.slice(i).match(/^(\d+\.?\d*)/);
    if (numM) { tokens.push({ type: "NUM", value: Number(numM[1]) }); i += numM[1].length; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1, str = "";
      while (j < s.length && s[j] !== c) { str += s[j]; j++; }
      i = j + 1; tokens.push({ type: "STR", value: str }); continue;
    }
    if (c === "(") { tokens.push({ type: "LP" }); i++; continue; }
    if (c === ")") { tokens.push({ type: "RP" }); i++; continue; }
    if (c === ",") { tokens.push({ type: "COMMA" }); i++; continue; }
    const opM = s.slice(i).match(/^(>=|<=|<>|!=|=|>|<|\+|-|\*|\/)/);
    if (opM) { tokens.push({ type: "OP", value: opM[1] }); i += opM[1].length; continue; }
    const idM = s.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (idM) { tokens.push({ type: "IDENT", value: idM[0] }); i += idM[0].length; continue; }
    throw new Error("Invalid character: " + c);
  }
  return tokens;
}