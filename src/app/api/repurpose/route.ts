import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

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

    const generateWithDeepSeek = async (systemPrompt: string, userPrompt: string): Promise<string> => {
      const deepseek = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: process.env.DEEPSEEK_API_KEY!,
      })
      const completion = await deepseek.chat.completions.create({
        model: 'deepseek-v4-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 1500,
        stream: false,
      })
      const content = completion.choices[0]?.message?.content
      if (!content) throw new Error('No content from DeepSeek')
      return content
    }

    const generateWithGemini = async (systemPrompt: string, userPrompt: string): Promise<string> => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY!}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
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
      repurposed = await generateWithDeepSeek('', prompt)
    } catch (deepseekError) {
      console.warn('DeepSeek failed, falling back to Gemini:', deepseekError)
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
