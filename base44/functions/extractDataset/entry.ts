import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { file_url, file_name } = body;
    if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

    const isExcel = /\.xlsx?$/i.test(file_name || '');
    const resp = await fetch(file_url);
    if (!resp.ok) return Response.json({ error: 'Could not fetch uploaded file' }, { status: 502 });

    let rows = [];
    if (isExcel) {
      const XLSX = await import('npm:xlsx@0.18.5');
      const buf = await resp.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    } else {
      const text = await resp.text();
      rows = parseCsv(text);
    }

    if (!rows.length) {
      return Response.json({ error: 'No rows could be parsed. Use a clean CSV or XLSX with headers.' }, { status: 422 });
    }

    return Response.json({ rows });
  } catch (error) {
    return Response.json({ error: error.message || 'Extraction failed' }, { status: 500 });
  }
}

function parseCsv(text) {
  const lines = [];
  let cur = '', inQuotes = false, row = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n') { row.push(cur); lines.push(row); row = []; cur = ''; }
      else if (ch === '\r') { /* skip */ }
      else cur += ch;
    }
  }
  if (cur !== '' || row.length) { row.push(cur); lines.push(row); }
  const nonEmpty = lines.filter((l) => l.some((c) => c !== ''));
  if (nonEmpty.length === 0) return [];
  const headers = nonEmpty[0].map((h) => h.trim());
  const out = [];
  for (let r = 1; r < nonEmpty.length; r++) {
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      let val = nonEmpty[r][c];
      if (val === undefined || val === '') val = null;
      else if (val !== null && !isNaN(Number(val)) && val.trim() !== '') val = Number(val);
      obj[headers[c]] = val;
    }
    out.push(obj);
  }
  return out;
}