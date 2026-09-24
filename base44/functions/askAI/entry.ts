import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { datasetName, schema, sample, rowCount, stats, question } = body || {};
    if (!question || typeof question !== 'string')
      return Response.json({ error: 'Question is required' }, { status: 400 });
    if (!schema)
      return Response.json({ error: 'Dataset schema is required' }, { status: 400 });

    const base44 = createClientFromRequest(req);

    const prompt = `You are a data analyst. Dataset "${datasetName || 'dataset'}" has ${rowCount || 0} rows and columns: ${schema}.
Column statistics (computed over the full dataset): ${JSON.stringify(stats || {})}.
Sample rows (JSON, up to 25): ${JSON.stringify((sample || []).slice(0, 25))}.

Answer the user's question. Use the column statistics for accurate aggregates — do not estimate when exact numbers are available. Respond ONLY with valid JSON matching this shape:
{
  "summary": "2-3 sentence plain-English answer using the real numbers above",
  "table": [{"column": "value"}, ...] | null,
  "chart": {"type": "bar"|"line"|"pie"|"none", "x": "category label", "y": "numeric value", "data": [{"name":"...","value":0}]} | null
}
If a breakdown is requested, build the table/chart from the statistics. Keep numbers precise and rounded to at most 3 decimals.

Question: ${question}`;

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          table: { type: ['array', 'null'] },
          chart: { type: ['object', 'null'] },
        },
      },
    });
    return Response.json({ answer: res });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}