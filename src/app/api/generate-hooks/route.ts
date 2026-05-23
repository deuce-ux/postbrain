import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { idea, platform } = await req.json()

    const { data: profile } = await supabase
      .from('profiles')
      .select('voice_dna, voice_style, display_name')
      .eq('id', user.id)
      .single()

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
          temperature: 0.85,
          max_tokens: 2048,
        })
      })
      if (!response.ok) throw new Error(`DeepSeek error: ${response.status}`)
      const data = await response.json()
      const content = data.choices?.[0]?.message?.content
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

    let rawContent: string
    let provider = 'deepseek'

    try {
      rawContent = await generateWithDeepSeek('', prompt)
    } catch (deepseekError) {
      console.warn('DeepSeek failed, falling back to Gemini:', deepseekError)
      provider = 'gemini'
      try {
        rawContent = await generateWithGemini('', prompt)
      } catch {
        console.error('Both providers failed')
        return NextResponse.json({ error: 'Failed to generate hooks' }, { status: 500 })
      }
    }

    const clean = rawContent.replace(/```json|```/g, '').trim()
    const hooks = JSON.parse(clean)

    return NextResponse.json({ hooks, provider })
  } catch (err) {
    console.error('Generate hooks error:', err)
    return NextResponse.json({ error: 'Failed to generate hooks' }, { status: 500 })
  }
}
