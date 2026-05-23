import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { content, instruction, platform } = await req.json()

    const { data: profile } = await supabase
      .from('profiles')
      .select('voice_style, voice_examples, voice_dna, display_name')
      .eq('id', user.id)
      .single()

    const voiceContext = profile?.voice_examples?.length
      ? `THEIR VOICE — maintain this style:\n${profile.voice_examples.slice(0, 3).join('\n---\n')}`
      : ''

    const systemPrompt = `You are refining a social media post for ${profile?.display_name || 'a creator'}.
Keep their voice intact. Only change what the instruction asks for.
${voiceContext}
Zero hashtags. No fake names. No corporate language.`

    const userPrompt = `Here is the current post:

"${content}"

Platform: ${platform}

Refinement instruction: "${instruction}"

Rewrite the post based on this instruction.
Keep everything that works. Only change what was asked.
Return only the refined post text, nothing else.`

    const generateWithDeepSeek = async (systemPrompt: string, userPrompt: string): Promise<string> => {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY!}`
        },
        body: JSON.stringify({
          model: 'deepseek-v4-pro',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.8,
          max_tokens: 4096,
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
            generationConfig: { temperature: 0.8, maxOutputTokens: 4096 }
          })
        }
      )
      if (!response.ok) throw new Error(`Gemini error: ${response.status}`)
      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('No content from Gemini')
      return text
    }

    let refined: string
    try {
      refined = await generateWithDeepSeek(systemPrompt, userPrompt)
    } catch (deepseekError) {
      console.warn('DeepSeek failed, falling back to Gemini:', deepseekError)
      try {
        refined = await generateWithGemini(systemPrompt, userPrompt)
      } catch {
        console.error('Both providers failed')
        return NextResponse.json({ error: 'Refinement failed' }, { status: 500 })
      }
    }

    return NextResponse.json({ content: refined.trim() })
  } catch (err) {
    console.error('Refine error:', err)
    return NextResponse.json({ error: 'Refinement failed' }, { status: 500 })
  }
}
