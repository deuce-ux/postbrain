import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
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

  const { idea, platform, voice, writingMode, swipeInspiration } = await req.json()

  // Fetch profile for voice DNA
  const { data: profile } = await supabase
    .from('profiles')
    .select('voice_style, voice_examples, voice_dna, display_name, role, project_description, content_topics')
    .eq('id', user.id)
    .single()

  const voiceDNA = profile?.voice_dna as {
    style_summary?: string
    sentence_patterns?: string
    tone?: string
    signature_phrases?: string[]
    avoid?: string
  } | null

  const platformInstructions: Record<string, string> = {
    twitter: `Write an 8-10 tweet X/Twitter thread.
- Tweet 1: Strong hook
- Tweets 2-8: Story, insights, specific details
- Final tweet: Strong closer or question
- Each tweet under 280 characters
- Number tweets: 1/, 2/, etc.
- Max 1-2 emojis per tweet
- No hashtags`,
    linkedin: `Write a LinkedIn post.
- Opening hook (2 lines max)
- 2-3 short story paragraphs
- 3-5 bullet point lessons
- Closing question or CTA
- 400-600 words
- Professional but personal tone
- 3-5 hashtags at the end only`,
    instagram: `Write an Instagram caption.
- First 2 lines are the hook (before "more")
- Short punchy paragraphs
- Casual, friend-talking-to-friend energy
- End with an engaging question
- 5-7 hashtags on last line`,
    facebook: `Write a Facebook post.
- Opening hook that stops the scroll
- 2-3 short conversational paragraphs
- Personal, warm, community-oriented tone
- End with a question to drive comments
- 150-300 words
- 2-3 relevant hashtags at the end
- Emojis used naturally, not excessively`,
  }

  const systemPrompt = `You are a social media ghostwriter for ${profile?.display_name || 'a creator'}.

Their profile:
- Role: ${profile?.role || 'Creator'}
- Building: ${profile?.project_description || 'their work'}
- Topics they write about: ${(profile?.content_topics || []).join(', ') || 'various topics'}
- Writing style: ${profile?.voice_style || voice?.style || 'conversational'}

${voiceDNA ? `Their voice analysis:
- Style: ${voiceDNA.style_summary}
- Sentence patterns: ${voiceDNA.sentence_patterns}
- Tone: ${voiceDNA.tone}
- Signature phrases: ${(voiceDNA.signature_phrases || []).join(', ')}
- Avoid: ${voiceDNA.avoid}` : ''}

${profile?.voice_examples?.length
    ? `MATCH THIS WRITING STYLE EXACTLY:\n${(profile.voice_examples as string[]).slice(0, 3).join('\n---\n')}`
    : voice?.examples
    ? `MATCH THIS WRITING STYLE EXACTLY:\n${voice.examples}`
    : ''}

Write in first person as this exact person.
Sound like a real human, not AI.
AVOID: "excited to share", buzzwords, generic advice.`

  const structureInstructions = swipeInspiration ? `
IMPORTANT — Use this proven viral structure:
Hook type: ${swipeInspiration.hook_type}
Structure pattern: ${swipeInspiration.structure_notes || 'Follow the hook type pattern'}
Emotional trigger to use: ${swipeInspiration.emotional_trigger || 'curiosity'}

Reference post (USE THE STRUCTURE, NOT THE CONTENT):
"${(swipeInspiration.content || '').slice(0, 300)}..."

Apply this exact structural pattern to the user's idea.
Make it sound like the user, not the reference post.
` : ''

const userPrompt = `${platformInstructions[platform] || platformInstructions.twitter}

${structureInstructions}

The idea/topic to write about:
"${idea}"

Write mode: ${writingMode || 'from idea'}

Write the complete post now. Return only the post content, no explanation.`

  const GROQ_API_KEY = process.env.GROQ_API_KEY!
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY!

  async function generateWithGroq(): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 2048,
      }),
    })
    if (!response.ok) throw new Error(`Groq error: ${response.status}`)
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('No content from Groq')
    return content
  }

  async function generateWithGemini(): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 2048,
          },
        }),
      }
    )
    if (!response.ok) throw new Error(`Gemini error: ${response.status}`)
    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!content) throw new Error('No content from Gemini')
    return content
  }

  let content: string
  let provider = 'groq'

  try {
    content = await generateWithGroq()
  } catch (groqError) {
    console.warn('Groq failed, falling back to Gemini:', groqError)
    provider = 'gemini'
    try {
      content = await generateWithGemini()
    } catch (geminiError) {
      console.error('Both providers failed:', geminiError)
      return NextResponse.json(
        { error: 'Generation failed. Please try again.' },
        { status: 500 }
      )
    }
  }

  await supabase.from('generated_posts').insert({
    user_id: user.id,
    original_idea: idea,
    generated_text: content,
    platform,
    status: 'draft',
  })

  return NextResponse.json({ content, provider })
}
