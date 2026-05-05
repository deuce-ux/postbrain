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

  const { idea, platform, swipeInspiration, clarification, writingMode } = await req.json()
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
- Each tweet = one clear thought, 1-3 sentences max
- Short punchy sentences. Vary length dramatically.
- Number them: 1/ 2/ 3/
- Each under 280 characters
- 8-10 tweets minimum
- NO hashtags`,

    linkedin: `Platform: LinkedIn
FORMATTING RULES — FOLLOW EXACTLY:
- Maximum 3 sentences per paragraph
- After every key statement — add a line break
- Let important lines stand alone like this.
- Use single-sentence paragraphs for emphasis.
- Short paragraphs. White space. Room to breathe.
- 400-700 words
- NO hashtags
- NO bullet points unless they naturally fit

STRUCTURE:
- Line 1: Hook. One sentence. Make it land.
- Body: Build the argument in short paragraphs
- Key insight: Let it stand alone on its own line
- Close: Question or strong final statement`,

    instagram: `Platform: Instagram
FORMATTING:
- First 2 lines: Hook before the "more" cutoff
- Very short paragraphs — 1-2 sentences each
- Line breaks between every paragraph
- Casual, personal, like talking to a friend
- 200-350 words
- NO hashtags`,

    facebook: `Platform: Facebook
FORMATTING RULES — FOLLOW EXACTLY:
- Short paragraphs. 2-3 sentences maximum per paragraph.
- Add a line break between every single paragraph.
- Key sentences stand alone on their own line.
- Like this.
- Then continue.
- Write in scenes — set up a moment, develop it, resolve it
- Use dialogue if the story has it: "He said, 'X'"
- 500-800 words minimum
- NO hashtags
- NO numbered lists
- NO bullet points
- This is storytelling. Not a thread. Not an essay.

STRUCTURE:
- Opening: One scene or one bold statement
- Development: Tell the story in short paragraphs
- Contrast: Show two paths or two people if it fits
- Insight: The lesson — let it breathe on its own line
- Close: One question to drive comments`,
  }

  const styleDescriptions: Record<string, string> = {
    conversational: 'casual and direct, like texting a smart friend',
    professional: 'professional but personal, credible without being corporate',
    bold: 'bold, strong opinions, no hedging, provocative',
    educational: 'educational, breaks things down, makes complex things simple',
  }

  const systemPrompt = `You are a world-class social media ghostwriter.
You write posts that stop people mid-scroll.

Your writing principles:
- SPECIFIC > GENERIC: Real names, real numbers, real moments
- STORY > LECTURE: Show a scene, don't explain a concept
- CONTRAST > STATEMENT: Show two people, two outcomes, two paths
- SHORT > LONG sentences on average. Vary dramatically.
- DIRECT > HEDGED: Say the thing. Don't qualify everything.
- HUMAN > POLISHED: Messy is fine. Perfect is suspicious.

WHO YOU ARE WRITING FOR:
Name: ${profile?.display_name || 'A creator'}
Role: ${profile?.role || 'Creator'}
Building: ${profile?.project_description || 'their work'}
${profile?.unique_angle ? `Unique angle: ${profile.unique_angle}` : ''}
Topics: ${(profile?.content_topics || []).join(', ')}
Style: ${styleDescriptions[profile?.voice_style || 'conversational']}

${voiceDNA ? `THEIR VOICE:
${voiceDNA.style_summary}
Patterns: ${voiceDNA.sentence_patterns}
Tone: ${voiceDNA.tone}
NEVER: ${voiceDNA.avoid}` : ''}

${profile?.voice_examples?.length ? `THEIR WRITING — STUDY AND MATCH:
${(profile.voice_examples as string[]).slice(0, 5).join('\n\n---\n\n')}` : ''}

ABSOLUTE RULES:
- Zero hashtags
- Zero: "I've been thinking", "I want to share", "Let me tell you"
- Zero: brethren, synergy, leverage, game-changer, touch base
- Never repeat a key phrase more than twice in one post
- Never sound like AI wrote it
- Do NOT force mentions of their project unless it fits naturally
- Stay within their stated content topics only
- NEVER invent fictional people or fake names
- Only use real names if the user explicitly mentioned them in their story or clarification
- If no real names are provided, write without naming anyone
- "A friend", "someone I know", "a designer I met" is fine — making up Emeka, Nneoma, Chinedu, Ifeoma etc is NOT fine`

  const structureInstructions = swipeInspiration ? `
STRUCTURE TO USE:
Hook type: ${swipeInspiration.hook_type}
Pattern: ${swipeInspiration.structure_notes || 'Follow the hook type pattern'}
Emotional trigger: ${swipeInspiration.emotional_trigger || 'curiosity'}
Reference (USE STRUCTURE ONLY, NOT CONTENT): "${(swipeInspiration.content || '').slice(0, 300)}..."
` : ''

  const clarificationContext = clarification ? `
WHAT THEY WANT TO SAY: ${clarification.mainPoint}
TONE: ${clarification.tone}
${clarification.story ? `PERSONAL STORY/EXPERIENCE:
${clarification.story}

Use this story as the backbone. Be specific. 
If they named people, use those names.
If they mentioned numbers or places, use them.` : ''}` : ''

  const userPrompt = `${platformRules[platform] || platformRules.facebook}

IDEA: ${idea}
WRITE MODE: ${writingMode}
${clarificationContext}

${structureInstructions}

STRUCTURAL APPROACHES TO CONSIDER:
- Two people, same tool/situation, different outcomes (contrast)
- Before vs After (transformation story)  
- The thing everyone believes vs the truth (contrarian)
- A specific moment that reveals a bigger truth (scene-setting)
- A question that reframes how people think about something

Pick the structure that best fits this idea and story.
Write as ${profile?.display_name || 'this person'}.

LENGTH GUIDANCE:
- Facebook: 500-800 words minimum. Let the story fully develop.
- LinkedIn: 400-700 words. Short paragraphs but complete argument.
- Twitter: 8-10 tweets. Each one earns its place.
- Instagram: 200-350 words. Punchy but complete.

Do not cut the post short. Write until the idea is fully expressed.
A post that ends too early is worse than one that runs long.

FORMATTING REMINDER:
- Break paragraphs every 2-3 sentences
- Let key statements stand alone on their own line
- White space is not wasted space — it's emphasis
- Write how a real person texts, not how an academic writes
- Short sentences hit harder than long ones.
- Like this.

Generate 2 genuinely different variations — different structures,
different openings, same core idea.

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

  const cleanContent = (text: string) => {
    return text
      .replace(/‘|’/g, "'")
      .replace(/“|”/g, '"')
      .replace(/–/g, '-')
      .replace(/—/g, '--')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
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

  try {
    const cleaned = rawContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    const parsed = JSON.parse(cleaned)

    const v1 = cleanContent(parsed.variation1 || '')
    const v2 = cleanContent(parsed.variation2 || '')

    await supabase.from('generated_posts').insert({
      user_id: user.id,
      original_idea: idea,
      generated_text: v1,
      platform,
      status: 'draft',
    })

    return NextResponse.json({ variation1: v1, variation2: v2, provider })
  } catch (parseError) {
    console.error('JSON parse error:', parseError)
    console.error('Raw content:', rawContent)
    return NextResponse.json({
      variation1: cleanContent(rawContent),
      variation2: '',
      provider,
    })
  }
}
