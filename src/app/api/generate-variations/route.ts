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

    const { content, platform } = await req.json()

    const prompt = `You have this ${platform} post:

"${content}"

Rewrite it in 3 different tones. Keep the same core idea and message.

Return ONLY a JSON object:
{
  "bold": "more direct, stronger opinions, cuts the fluff, punchy",
  "personal": "more vulnerable, story-driven, first-person experience, emotional",
  "concise": "50% shorter, every word earns its place, tight and sharp"
}`

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
      const text = data.choices?.[0]?.message?.content
      if (!text) throw new Error('No content from Groq')
      return text
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
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('No content from Gemini')
      return text
    }

    let rawContent: string

    try {
      rawContent = await generateWithGroq('', prompt)
    } catch (groqError) {
      console.warn('Groq failed, falling back to Gemini:', groqError)
      try {
        rawContent = await generateWithGemini('', prompt)
      } catch {
        console.error('Both providers failed')
        return NextResponse.json({ error: 'Failed to generate variations' }, { status: 500 })
      }
    }

    const clean = rawContent.replace(/```json|```/g, '').trim()
    const variations = JSON.parse(clean)

    return NextResponse.json(variations)
  } catch {
    return NextResponse.json({ error: 'Failed to generate variations' }, { status: 500 })
  }
}