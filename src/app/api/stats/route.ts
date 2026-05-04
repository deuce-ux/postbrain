import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: posts } = await supabase
      .from('generated_posts')
      .select('created_at, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const { data: profile } = await supabase
      .from('profiles')
      .select('weekly_goal')
      .eq('id', user.id)
      .single()

    const now = new Date()
    const today = now.toISOString().split('T')[0]

    let streak = 0
    if (posts && posts.length > 0) {
      const postDates = Array.from(new Set(posts.map(p => p.created_at.split('T')[0])))
      postDates.sort((a, b) => b.localeCompare(a))
      
      const checkDate = new Date(today)
      for (const date of postDates) {
        const checkStr = checkDate.toISOString().split('T')[0]
        if (date === checkStr) {
          streak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else if (date < checkStr) {
          break
        }
      }
    }

    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const thisWeekPosts = posts?.filter(p => 
      new Date(p.created_at) >= weekStart
    ).length || 0

    return NextResponse.json({
      streak,
      thisWeekPosts,
      weeklyGoal: profile?.weekly_goal || 5,
      totalPosts: posts?.length || 0
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { weekly_goal } = await req.json()

    await supabase
      .from('profiles')
      .update({ weekly_goal })
      .eq('id', user.id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}