import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function makeClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export async function GET() {
  try {
    const supabase = makeClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('GET profile error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('GET profile catch:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = makeClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    console.log('PATCH profile body:', body)

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
    console.log('Safe update body:', safeBody)

    const { data, error } = await supabase
      .from('profiles')
      .update(safeBody)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('PATCH profile supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('PATCH profile catch error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
