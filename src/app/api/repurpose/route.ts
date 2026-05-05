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

    const generateWithGroq = async (_: string, userPrompt: string): Promise<string> => {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY!}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: userPrompt }],
          temperature: 0.85,
          max_tokens: 2048,
        })
      })
      if (!response.ok) throw new Error(`Groq error: ${response.status}`)
      const data = await response.json()
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error('No content from Groq')
      return content
    }

    const generateWithGemini = async (_: string, userPrompt: string): Promise<string> => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.85, maxOutputTokens: 2048 },
          }),
        }
      )
      if (!response.ok) throw new Error(`Gemini error: ${response.status}`)
      const data = await response.json()
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!content) throw new Error('No content from Gemini')
      return content
    }

    let repurposed: string

    try {
      repurposed = await generateWithGroq('', prompt)
    } catch (groqError) {
      console.warn('Groq failed, falling back to Gemini:', groqError)
      try {
        repurposed = await generateWithGemini('', prompt)
      } catch {
        console.error('Both providers failed')
        return NextResponse.json({ error: 'Failed to repurpose' }, { status: 500 })
      }
    }

    return NextResponse.json({ content: repurposed })
  } catch {
    return NextResponse.json({ error: 'Failed to repurpose' }, { status: 500 })
  }
}