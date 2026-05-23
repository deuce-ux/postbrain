import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('ideas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('GET ideas error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, max-age=30' },
    })
  } catch (err) {
    console.error('GET ideas catch:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { content, tags, source } = await req.json()

    const { data, error } = await supabase
      .from('ideas')
      .insert({ user_id: user.id, content, tags: tags || [], source: source || 'manual' })
      .select()
      .single()

    if (error) {
      console.error('POST ideas error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('POST ideas catch:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
