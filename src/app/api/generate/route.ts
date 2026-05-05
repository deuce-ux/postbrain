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

  const { idea, platform, writingMode, swipeInspiration, clarification } = await req.json()
  console.log('Received platform:', platform)

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

  const platformRules: Record<string, string> = {
    twitter: 'For X Thread: Start with hook tweet (1-2 sentences max), break into 5-8 tweets, each tweet = 1-3 sentences, use line breaks for emphasis, end with summary. NO hashtags.',
    linkedin: 'For LinkedIn: 1,300-2,000 characters, conversational not corporate, single-line paragraphs for emphasis, optional engagement question at end. NO hashtags.',
    instagram: 'For Instagram: Line breaks for readability, visual/emotional language, emojis only if fits voice, 2-3 sentence paragraphs, questions to drive comments. NO hashtags.',
    facebook: 'For Facebook: 500-1,000 words, story-driven with setup/middle/end, personal and vulnerable, conversational. NO hashtags. Write in flowing paragraphs NOT a thread.',
  }

  const voiceContext = profile?.voice_examples?.length
    ? `USER'S VOICE - match this writing style EXACTLY:\n${(profile.voice_examples as string[]).slice(0, 5).join('\n\n---\n\n')}`
    : ''

  const structureInstructions = swipeInspiration ? `
STRUCTURE TO USE:
Hook type: ${swipeInspiration.hook_type}
Pattern: ${swipeInspiration.structure_notes || 'Follow the hook type pattern'}
Emotional trigger: ${swipeInspiration.emotional_trigger || 'curiosity'}
Reference (USE STRUCTURE ONLY, NOT CONTENT): "${(swipeInspiration.content || '').slice(0, 300)}..."
` : ''

  const systemPrompt = `You are helping write a social media post in the user's authentic voice.

${voiceContext}

${voiceDNA ? `VOICE ANALYSIS:
Style: ${voiceDNA.style_summary}
Sentence patterns: ${voiceDNA.sentence_patterns}
Tone: ${voiceDNA.tone}
Opens like: ${voiceDNA.opening_style}
Closes like: ${voiceDNA.closing_style}
Unique traits: ${(voiceDNA.unique_traits || []).join(', ')}
AVOID: ${voiceDNA.avoid}` : ''}

USER'S IDEA:
Topic: ${idea}
Write mode: ${writingMode || 'from idea'}
${clarification?.mainPoint ? `Main point: ${clarification.mainPoint}` : ''}
${clarification?.tone ? `Tone: ${clarification.tone}` : ''}
${clarification?.story ? `Personal story/example to use: ${clarification.story}` : ''}

PLATFORM: ${platform}

${structureInstructions}

CRITICAL RULES:
1. Write in their voice - match vocabulary, rhythm, tone from samples
2. DO NOT force business mentions unless idea is explicitly about it
3. Be specific - use real numbers, names, concrete details from their story
4. Sound human - like texting a friend, not writing an essay
5. Keep their personality and quirks
6. ZERO hashtags
7. ZERO corporate buzzwords
8. If they gave a personal story, USE IT - be specific, include names if mentioned
9. DO NOT write a numbered thread for Facebook - write flowing paragraphs

${platformRules[platform] || ''}

Generate 2 genuinely different variations. Return ONLY valid JSON:
{
  "variation1": "full post text",
  "variation2": "full post text"
}`

  const userPrompt = `Generate 2 genuinely different variations of this post.
Return ONLY valid JSON:
{
  "variation1": "full post text here",
  "variation2": "full post text here"
}`

  async function generateWithGroq(systemPrompt: string, userPrompt: string): Promise<string> {
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

  async function generateWithGemini(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
  let provider = 'groq'

  try {
    rawContent = await generateWithGroq(systemPrompt, userPrompt)
  } catch (groqError) {
    console.warn('Groq failed, falling back to Gemini:', groqError)
    provider = 'gemini'
    try {
      rawContent = await generateWithGemini(systemPrompt, userPrompt)
    } catch {
      console.error('Both providers failed')
      return NextResponse.json(
        { error: 'Generation failed. Please try again.' },
        { status: 500 }
      )
    }
  }

  let result: { variation1: string; variation2: string }
  try {
    const clean = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    result = JSON.parse(clean)
  } catch {
    result = { variation1: rawContent, variation2: '' }
  }

  await supabase.from('generated_posts').insert({
    user_id: user.id,
    original_idea: idea,
    generated_text: result.variation1,
    platform,
    status: 'draft',
  })

  return NextResponse.json({ variation1: result.variation1, variation2: result.variation2, provider })
}
