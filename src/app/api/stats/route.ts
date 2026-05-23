import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

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
    }, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()

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