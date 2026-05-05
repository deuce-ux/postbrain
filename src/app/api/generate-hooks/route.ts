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

    const generateWithOpenRouter = async (systemPrompt: string, userPrompt: string): Promise<string> => {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY!}`,
          'HTTP-Referer': 'https://postbrain-eight.vercel.app',
          'X-Title': 'PostBrain'
        },
        body: JSON.stringify({
          model: 'qwen/qwen3-next-80b-a3b-instruct:free',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.85,
          max_tokens: 2048,
        })
      })
      if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`)
      const data = await response.json()
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error('No content from OpenRouter')
      return content
    }

    const generateWithGroq = async (systemPrompt: string, userPrompt: string): Promise<string> => {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY!}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
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

    let rawContent: string
    let provider = 'openrouter'

    try {
      rawContent = await generateWithOpenRouter('', prompt)
    } catch (openRouterError) {
      console.warn('OpenRouter failed, falling back to Groq:', openRouterError)
      provider = 'groq'
      try {
        rawContent = await generateWithGroq('', prompt)
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