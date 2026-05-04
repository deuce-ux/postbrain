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

    const { content, platform, idea } = await req.json()

    const GROQ_API_KEY = process.env.GROQ_API_KEY!

    const prompt = `You have this ${platform} post:

"${content}"

Rewrite it in 3 different tones. Keep the same core idea and message.

Return ONLY a JSON object:
{
  "bold": "more direct, stronger opinions, cuts the fluff, punchy",
  "personal": "more vulnerable, story-driven, first-person experience, emotional",
  "concise": "50% shorter, every word earns its place, tight and sharp"
}`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.85,
        max_tokens: 2048,
      })
    })

    const data = await response.json()
    const content2 = data.choices?.[0]?.message?.content
    const clean = content2.replace(/```json|```/g, '').trim()
    const variations = JSON.parse(clean)

    return NextResponse.json(variations)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to generate variations' }, { status: 500 })
  }
}