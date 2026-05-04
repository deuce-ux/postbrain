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

    const { content, fromPlatform, toPlatform } = await req.json()

    const GROQ_API_KEY = process.env.GROQ_API_KEY!

    const platformFormats: Record<string, string> = {
      twitter: 'an 8-10 tweet thread. Number tweets 1/, 2/ etc. Each tweet under 280 chars.',
      linkedin: 'a LinkedIn post. Hook opening, short paragraphs, bullet lessons, closing question. 400-600 words.',
      instagram: 'an Instagram caption. Hook first 2 lines, short punchy paragraphs, question at end, 5 hashtags.',
      facebook: 'a Facebook post. Conversational, warm, 150-300 words, question to drive comments.'
    }

    const prompt = `Repurpose this ${fromPlatform} post into ${platformFormats[toPlatform] || toPlatform}.

Original post:
"${content}"

Keep the same core message and ideas. 
Adapt the format, length, and style completely for ${toPlatform}.
Sound natural, not like a direct copy.
Return only the repurposed post, no explanation.`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 2048,
      })
    })

    const data = await response.json()
    const repurposed = data.choices?.[0]?.message?.content

    return NextResponse.json({ content: repurposed })
  } catch {
    return NextResponse.json({ error: 'Failed to repurpose' }, { status: 500 })
  }
}