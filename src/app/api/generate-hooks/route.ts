import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
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

    const { idea, platform } = await req.json()

    const { data: profile } = await supabase
      .from('profiles')
      .select('voice_dna, voice_style, display_name')
      .eq('id', user.id)
      .single()

    const GROQ_API_KEY = process.env.GROQ_API_KEY!

    const prompt = `Generate 8 different opening hooks for a ${platform} post about this idea:
"${idea}"

Write for ${profile?.display_name || 'a creator'} who writes in a ${profile?.voice_style || 'conversational'} style.

Generate exactly 8 hooks using these different types:
1. Bold statement
2. Surprising statistic or fact
3. Personal story opening
4. Controversial opinion
5. Question that makes you think
6. "Most people don't know..." opener
7. Short punchy one-liner
8. Specific number/list opener

Return ONLY a JSON array of 8 strings, no explanation:
["hook1", "hook2", "hook3", "hook4", "hook5", "hook6", "hook7", "hook8"]`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 1024,
      })
    })

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    const clean = content.replace(/```json|```/g, '').trim()
    const hooks = JSON.parse(clean)

    return NextResponse.json({ hooks })
  } catch (err) {
    console.error('Generate hooks error:', err)
    return NextResponse.json({ error: 'Failed to generate hooks' }, { status: 500 })
  }
}