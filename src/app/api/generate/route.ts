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

  const { idea, platform, clarification, writingMode } = await req.json()
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
- Hook tweet: 1-2 sentences. Stop the scroll.
- 5-8 tweets. Each tweet = one clear thought.
- 1-3 sentences per tweet. Under 280 chars.
- Number them: 1/ 2/ 3/
- End with summary or question
- NO hashtags`,

    linkedin: `Platform: LinkedIn
- Line 1: Hook. One sentence. Make it land.
- Short paragraphs — 2-3 sentences each
- Single-line paragraphs for emphasis
- Like this.
- 400-700 words
- Professional but with personality
- Optional engagement question at end
- NO hashtags`,

    instagram: `Platform: Instagram
- First 2 lines: Hook before the "more" cutoff
- Short paragraphs — 1-2 sentences
- Line breaks between paragraphs
- Casual, personal, friend-to-friend
- 200-350 words
- NO hashtags`,

    facebook: `Platform: Facebook
- Opening: One scene or bold statement
- Short paragraphs — 2-3 sentences MAX
- Line breaks between every paragraph
- Key sentences stand alone on their own line.
- Like this.
- 500-800 words
- Tell the full story — setup, middle, resolution
- Use dialogue if the story has it
- End with one question
- NO hashtags
- NOT a thread — flowing paragraphs only`,
  }

  const styleDescriptions: Record<string, string> = {
    conversational: 'casual and conversational, like texting a friend',
    professional: 'professional but personal, LinkedIn-style',
    bold: 'bold and controversial, strong opinions and hot takes',
    educational: 'educational and helpful, teaching-focused',
  }

  const voiceContext = profile?.voice_examples?.length
    ? `USER'S VOICE (match this writing style):\n${(profile.voice_examples as string[]).slice(0, 5).join('\n\n---\n\n')}`
    : ''

  const systemPrompt = `You are a social media ghostwriter. Your writing:
- Sounds like a real person sharing their genuine experience
- Is ${styleDescriptions[profile?.voice_style || 'conversational']}
- Tells stories with specific details from THEIR actual life
- Has personality — not corporate, not preachy
- Stays focused on topics they care about: ${(profile?.content_topics || []).join(', ')}

WHO YOU ARE WRITING FOR:
Name: ${profile?.display_name || 'A creator'}
Role: ${profile?.role || 'Creator'}
Building: ${profile?.project_description || 'their work'}
${profile?.unique_angle ? `Unique angle: ${profile.unique_angle}` : ''}

Key principles:
- Specific > Generic (real names, real numbers, real moments from their story)
- Story > Lecture (show a scene, don't explain a concept)
- Contrast > Statement (two people, two paths, two outcomes)
- Personal > Universal (make it clearly THEIR story)
- Stay on topic — only write about their stated content focus areas

${voiceDNA ? `VOICE FINGERPRINT:
${voiceDNA.style_summary}
Sentence style: ${voiceDNA.sentence_patterns}
Tone: ${voiceDNA.tone}
Opens like: ${voiceDNA.opening_style}
Closes like: ${voiceDNA.closing_style}
Unique: ${(voiceDNA.unique_traits || []).join(', ')}
NEVER: ${voiceDNA.avoid}` : ''}

${voiceContext}

ABSOLUTE RULES:
- Zero hashtags
- NEVER invent names. Zero fictional characters.
- If the user's story has no names, write without any names.
- "a friend", "someone I know", "a colleague" — fine
- "Emeka", "Nneoma", "Chinedu" — NEVER unless user wrote them
- Never: "I've been thinking", "I want to share", brethren,
  synergy, leverage, game-changer, touch base, circle back,
  "at the end of the day", "it is what it is"
- Never repeat a key phrase more than twice
- DO NOT mention their project unless it fits naturally
- Short paragraphs — 2-3 sentences max
- Key statements get their own line
- Sound human, not polished`

  const clarificationContext = clarification ? `
IDEA DETAILS:
Main point: ${clarification.mainPoint}
Tone: ${clarification.tone}
${clarification.story ? `Personal story to use: ${clarification.story}

Use this story as the backbone. Be specific.
Only use names that appear in this story.
If they mentioned numbers or places, use them.` : ''}` : ''

  const userPrompt = `${platformRules[platform] || platformRules.facebook}

TOPIC: ${idea}
WRITE MODE: ${writingMode}
${clarificationContext}

STRUCTURAL APPROACHES — pick what fits:
- Two people, same situation, different outcomes (contrast)
- Before vs After (transformation)
- The thing everyone believes vs the truth (contrarian)
- A specific moment that reveals a bigger truth
- A challenge/question that reframes how people think

Write as ${profile?.display_name || 'this person'}.

Generate 2 genuinely different variations.
Different openings. Different structures. Same core idea.

LENGTH: Write until the idea is fully expressed.
Facebook/LinkedIn minimum 500 words. Don't cut short.

FORMATTING:
- Short paragraphs
- Key lines stand alone
- White space is emphasis
- Write how a real person thinks, not how an academic writes

OUTPUT FORMAT — THIS IS CRITICAL:
Return a JSON object with exactly two keys.
Start your entire response with { 
End your entire response with }
No text before {. No text after }.
No markdown. No code fences. No backticks.
Escape all newlines as \\n inside the JSON strings.
Escape all quotes inside strings with \\"

Example of correct format:
{"variation1": "First line.\\n\\nSecond paragraph.\\n\\nThird paragraph.", "variation2": "Different opening.\\n\\nDifferent middle.\\n\\nDifferent end."}`

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
        max_tokens: 4096,
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
          generationConfig: { temperature: 0.85, maxOutputTokens: 4096 },
        }),
      }
    )
    if (!response.ok) throw new Error(`Gemini error: ${response.status}`)
    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!content) throw new Error('No content from Gemini')
    return content
  }

  function parseVariations(raw: string): { v1: string, v2: string } {
    // Remove markdown code blocks
    const cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    
    // Try direct JSON parse
    try {
      const parsed = JSON.parse(cleaned)
      return {
        v1: parsed.variation1 || parsed.variation_1 || '',
        v2: parsed.variation2 || parsed.variation_2 || ''
      }
    } catch {
      // JSON parse failed — try to extract manually
      console.log('Direct parse failed, trying extraction')
    }
    
    // Try to extract variation1 manually
    const v1Match = cleaned.match(/"variation1"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"variation2"|"\s*\}$)/)
    const v2Match = cleaned.match(/"variation2"\s*:\s*"([\s\S]*?)(?:"\s*\}|"\s*$)/)
    
    if (v1Match) {
      return {
        v1: v1Match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
        v2: v2Match ? v2Match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : ''
      }
    }
    
    // Last resort — return raw as v1
    return { v1: cleaned, v2: '' }
  }

  function cleanText(text: string): string {
    return text
      .replace(/\u2018|\u2019/g, "'")
      .replace(/\u201C|\u201D/g, '"')
      .replace(/\u2013/g, '-')
      .replace(/\u2014/g, '--')
      .replace(/\\n/g, '\n')
      .trim()
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

  // After getting content:
  const { v1, v2 } = parseVariations(rawContent)
  const variation1 = cleanText(v1)
  const variation2 = cleanText(v2)

  console.log('Parsed variation1 length:', variation1.length)
  console.log('Parsed variation2 length:', variation2.length)
  console.log('variation1 preview:', variation1.slice(0, 100))

  // Save variation1 to DB
  if (variation1) {
    await supabase.from('generated_posts').insert({
      user_id: user.id,
      original_idea: idea,
      generated_text: variation1,
      platform,
      status: 'draft'
    })
  }

  return NextResponse.json({ variation1, variation2, provider })
}
