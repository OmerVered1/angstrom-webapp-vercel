/**
 * Client-side helpers for calling the server-side /api/db endpoint.
 * These bypass RLS by going through the service role key on the server.
 */

interface DbResult {
  data?: Record<string, unknown>[]
  error?: string
}

async function dbFetch(body: Record<string, unknown>): Promise<DbResult> {
  const res = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

export async function dbInsert(
  table: string,
  data: Record<string, unknown>,
): Promise<DbResult> {
  return dbFetch({ action: 'insert', table, data })
}

export async function dbUpdate(
  table: string,
  id: number,
  data: Record<string, unknown>,
): Promise<DbResult> {
  return dbFetch({ action: 'update', table, id, data })
}

export async function dbDelete(
  table: string,
  id: number,
): Promise<DbResult> {
  return dbFetch({ action: 'delete', table, id })
}
