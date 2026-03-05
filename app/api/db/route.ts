import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Server-side API route for Supabase operations that need the service role key
 * to bypass Row Level Security (RLS). Handles insert, update, and delete.
 *
 * For read operations, the client-side anon key is sufficient.
 */

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Prefer service role key; fall back to anon key so local dev still works
  const key =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_KEY

  if (!url || !key) {
    throw new Error('Supabase credentials not configured')
  }

  return createClient(url, key)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, table, data, id } = body as {
      action: 'insert' | 'update' | 'delete'
      table: string
      data?: Record<string, unknown>
      id?: number
    }

    // Only allow operations on the analyses table
    if (table !== 'analyses') {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
    }

    const supabase = getAdminClient()

    if (action === 'insert') {
      if (!data) {
        return NextResponse.json({ error: 'No data provided' }, { status: 400 })
      }
      const { data: result, error } = await supabase.from(table).insert(data).select()
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ data: result })
    }

    if (action === 'update') {
      if (!data || id == null) {
        return NextResponse.json({ error: 'Data and id required' }, { status: 400 })
      }
      const { data: result, error } = await supabase.from(table).update(data).eq('id', id).select()
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ data: result })
    }

    if (action === 'delete') {
      if (id == null) {
        return NextResponse.json({ error: 'id required' }, { status: 400 })
      }
      const { data: result, error } = await supabase.from(table).delete().eq('id', id).select()
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ data: result })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
