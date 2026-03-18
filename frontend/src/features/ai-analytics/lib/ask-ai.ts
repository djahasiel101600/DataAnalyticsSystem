export interface AskAIParams {
  message: string
  columns: string[]
  sampleRows: Record<string, unknown>[]
}

export async function askAI(params: AskAIParams): Promise<{ reply: string }> {
  const { message, columns, sampleRows } = params
  const body = {
    message,
    columns,
    sample_rows: sampleRows.slice(0, 5).map((row) => {
      const out: Record<string, unknown> = {}
      for (const c of columns) {
        out[c] = row[c] ?? ''
      }
      return out
    }),
  }
  const res = await fetch('/api/ai/analytics/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || res.statusText)
  }
  return { reply: (data as { reply?: string }).reply ?? '' }
}
