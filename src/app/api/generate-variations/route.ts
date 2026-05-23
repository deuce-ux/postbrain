import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

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

    const generateWithDeepSeek = async (systemPrompt: string, userPrompt: string): Promise<string> => {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY!}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.85,
          max_tokens: 2048,
        })
      })
      if (!response.ok) throw new Error(`DeepSeek error: ${response.status}`)
      const data = await response.json()
      const text = data.choices?.[0]?.message?.content
      if (!text) throw new Error('No content from DeepSeek')
      return text
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
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('No content from Gemini')
      return text
    }

    let rawContent: string

    try {
      rawContent = await generateWithDeepSeek('', prompt)
    } catch (deepseekError) {
      console.warn('DeepSeek failed, falling back to Gemini:', deepseekError)
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
