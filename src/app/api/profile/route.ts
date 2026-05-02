import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    console.log('Updating profile for user:', user.id, 'with:', body)

    const allowedFields = [
      'display_name', 'role', 'project_description',
      'content_topics', 'voice_style', 'voice_examples',
      'voice_dna', 'voice_setup_complete', 'name',
    ]

    const safeBody: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in body) safeBody[key] = body[key]
    }

    safeBody.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('profiles')
      .update(safeBody)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Supabase update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('PATCH profile error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
