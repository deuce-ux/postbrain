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

  const { idea, platform, swipeInspiration, clarification } = await req.json()
  console.log('Received platform:', platform)

  // Fetch profile for voice DNA
  const { data: profile } = await supabase
    .from('profiles')
    .select('voice_style, voice_examples, voice_dna, display_name, role, project_description, content_topics, unique_angle')
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
    twitter: `Platform: X/Twitter Thread
- Start with a hook tweet — 1-2 sentences that stop the scroll
- Break into 5-8 tweets. Each tweet = one clear thought.
- Each tweet under 280 characters
- Number them: 1/ 2/ 3/ etc.
- End with a summary or question tweet
- Let the story determine how many tweets you need
- NO hashtags`,

    linkedin: `Platform: LinkedIn
- Open with a hook — one line that makes them stop scrolling
- Write in short paragraphs with breathing room between them
- Be conversational, not corporate
- Use specific numbers and details from their story
- Close with a genuine question or strong statement
- Let the depth of the story determine the length
- Minimum 300 words, no hard maximum — write until it's complete
- NO hashtags`,

    instagram: `Platform: Instagram
- First 2 lines must be the hook — before the "more" cutoff
- Short punchy paragraphs — 2-3 sentences each
- Use line breaks generously for readability
- Casual and personal — like talking to a friend
- End with one genuine engaging question
- NO hashtags`,

    facebook: `Platform: Facebook
- Write in flowing paragraphs — NOT a list, NOT a thread, NOT numbered
- Open with a scene, moment, or statement that pulls them in
- Tell the story fully — setup, middle, resolution
- Use real names and specific details from their story if provided
- Include dialogue if it happened naturally
- Close with the lesson and one question to spark comments
- Let the story breathe — write as long as it needs to be
- Minimum 400 words — Facebook readers expect depth
- NO hashtags. NO bullet points. NO numbered lists.
- This is storytelling, not a Twitter thread`,
  }

  const styleDescriptions: Record<string, string> = {
    conversational: 'casual and direct, like texting a smart friend — short sentences, real talk, no fluff',
    professional: 'polished but personal — credible without being corporate, clear and confident',
    bold: 'strong opinions, no hedging, punchy and direct — says what most people think but won\'t say',
    educational: 'breaks things down, uses analogies, makes complex ideas feel simple and accessible',
  }

  const voiceContext = profile?.voice_examples?.length
    ? `USER'S WRITING SAMPLES — match this style exactly:\n${(profile.voice_examples as string[]).join('\n\n---\n\n')}`
    : ''

  const structureInstructions = swipeInspiration ? `
STRUCTURE TO USE:
Hook type: ${swipeInspiration.hook_type}
Pattern: ${swipeInspiration.structure_notes || 'Follow the hook type pattern'}
Emotional trigger: ${swipeInspiration.emotional_trigger || 'curiosity'}
Reference (USE STRUCTURE ONLY, NOT CONTENT): "${(swipeInspiration.content || '').slice(0, 300)}..."
` : ''

  const systemPrompt = `You are a ghostwriter. Write in the user's exact voice. Do not sound like AI.

${voiceContext}

${voiceDNA ? `VOICE PROFILE:
Summary: ${voiceDNA.style_summary}
Sentence style: ${voiceDNA.sentence_patterns}
Tone: ${voiceDNA.tone}
How they open: ${voiceDNA.opening_style}
How they close: ${voiceDNA.closing_style}
Unique traits: ${(voiceDNA.unique_traits || []).join(', ')}
Signature phrases: ${(voiceDNA.signature_phrases || []).join(', ')}
NEVER do: ${voiceDNA.avoid}` : `Writing style: ${styleDescriptions[profile?.voice_style || 'conversational']}`}

${profile?.unique_angle ? `THEIR UNIQUE ANGLE / PERSPECTIVE:\n${profile.unique_angle}` : ''}

WHO THEY ARE:
${profile?.display_name ? `Name: ${profile.display_name}` : ''}
${profile?.role ? `Role: ${profile.role}` : ''}
${profile?.project_description ? `Building: ${profile.project_description}` : ''}

THE POST:
Idea: ${idea}
${clarification?.mainPoint ? `Core message: ${clarification.mainPoint}` : ''}
${clarification?.tone ? `Tone for this post: ${clarification.tone}` : ''}
${clarification?.story ? `Personal story/example: ${clarification.story}` : ''}

${structureInstructions}

RULES:
- Write in their voice — match vocabulary, rhythm, sentence length from samples
- Use their unique angle and perspective if relevant
- No hashtags. No corporate buzzwords. No "In today's world..."
- Be specific: real numbers, names, concrete details
- Sound human. Like they wrote it themselves.
- If a personal story was given, use it — be specific
- For Facebook: flowing paragraphs only, no numbered lists or threads

${platformRules[platform] || ''}

Write 2 genuinely different versions. Different angles, different hooks, different structure — not just rewording.
Return ONLY valid JSON:
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
  let provider = 'gemini'

  try {
    rawContent = await generateWithGemini(systemPrompt, userPrompt)
  } catch (geminiError) {
    console.warn('Gemini failed, falling back to Groq:', geminiError)
    provider = 'groq'
    try {
      rawContent = await generateWithGroq(systemPrompt, userPrompt)
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
