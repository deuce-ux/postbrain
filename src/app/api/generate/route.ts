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

  const { idea, platform, voice, writingMode, swipeInspiration, clarification } = await req.json()

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
    opening_style?: string
    closing_style?: string
    unique_traits?: string[]
    signature_phrases?: string[]
    avoid?: string
  } | null

  const platformInstructions: Record<string, string> = {
    twitter: `Write an 8-10 tweet X/Twitter thread.
- Tweet 1: Strong hook that stops the scroll
- Tweets 2-8: Story, insights, specific details
- Final tweet: Strong closer or question
- Each tweet under 280 characters
- Number tweets: 1/, 2/, etc.
- NO emojis
- NO hashtags whatsoever
- NO "RT if you agree" or engagement bait`,
    linkedin: `Write a LinkedIn post.
- Opening hook (2 lines max, no fluff)
- 2-3 short punchy paragraphs
- Maybe 3-5 bullet points if needed
- Closing question or statement
- 300-500 words max
- NO hashtags whatsoever
- NO "Let me know in the comments"
- NO corporate speak`,
    instagram: `Write an Instagram caption.
- First 2 lines are the hook (before "more")
- Short punchy paragraphs
- Casual, real, personal
- End with one genuine question
- NO hashtags whatsoever
- NO emoji spam`,
    facebook: `Write a Facebook post.
- Opening line that stops the scroll
- 2-3 short conversational paragraphs
- Warm, personal, community feel
- End with a genuine question
- 150-300 words
- NO hashtags whatsoever`,
  }

  const systemPrompt = `You are writing AS ${profile?.display_name || 'this person'}.
You ARE them. First person. Their exact voice.

WHO THEY ARE:
${profile?.role || 'Creator'} building ${profile?.project_description || 'something'}
They write about: ${(profile?.content_topics || []).join(', ')}
Their style: ${profile?.voice_style || voice?.style || 'conversational'}

${voiceDNA ? `THEIR VOICE:
${voiceDNA.style_summary}
Sentence style: ${voiceDNA.sentence_patterns}
Tone: ${voiceDNA.tone}
They open posts like: ${voiceDNA.opening_style || 'directly'}
They close posts like: ${voiceDNA.closing_style || 'with a thought'}
Unique to them: ${(voiceDNA.unique_traits || []).join(', ')}
NEVER do this: ${voiceDNA.avoid}` : ''}

${profile?.voice_examples?.length
    ? `THIS IS EXACTLY HOW THEY WRITE — COPY THIS STYLE:\n${(profile.voice_examples as string[]).slice(0, 5).join('\n\n---\n\n')}`
    : voice?.examples
    ? `THIS IS EXACTLY HOW THEY WRITE — COPY THIS STYLE:\n${voice.examples}`
    : ''}

HARD RULES — NEVER BREAK THESE:
- Zero hashtags. Not one. Ever.
- Zero emojis unless they used them in their examples above
- Never use: brethren, folks, guys, synergy, leverage, utilize, game-changer, dive in, excited to share, in conclusion, at the end of the day, touch base, circle back, bandwidth
- Never repeat the same word more than twice in the entire post
- Never start two consecutive sentences the same way
- Never sound like AI wrote it
- Never be preachy or lecture-y
- Write with specific details not vague generalities
- Vary sentence length dramatically — short. Then longer and more complex.
- Sound like a real human being having a conversation`

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

const clarificationContext = clarification ? `
WHAT THEY WANT TO SAY:
Main point: ${clarification.mainPoint}
Tone: ${clarification.tone}
${clarification.story ? `Personal story/example to use: ${clarification.story}` : ''}

Use the main point as the core message.
Match the ${clarification.tone} tone throughout.
${clarification.story ? 'Weave the personal story/example naturally into the post.' : ''}
` : ''

  const modeInstructions: Record<string, string> = {
    'from hook': "The user has written their opening hook. Build the rest of the post around it. Use the hook as tweet 1 or opening line verbatim.",
    'from experience': "The user has shared a personal experience. Find the insight or lesson in it and build a post around the story.",
    'from idea': "The user has an idea they want to explore. Develop it into a full post."
  }

const userPrompt = `${platformInstructions[platform] || platformInstructions.twitter}

${structureInstructions}

${clarificationContext}
INSTRUCTION BASED ON WRITE MODE:
${modeInstructions[writingMode as string] || modeInstructions['from idea']}

The input to write about:
"${idea}"

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
