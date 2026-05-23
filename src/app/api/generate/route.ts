import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  console.log('[generate] user:', user?.id ?? null, 'authError:', authError?.message ?? null)
  if (!user) return NextResponse.json({ error: 'Unauthorized', detail: authError?.message ?? 'no session' }, { status: 401 })

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

  const systemPrompt = `You are ghostwriting for ${profile?.display_name || 'Agunwa'}.

You are not summarizing their ideas. You are thinking on paper AS them.

WHO THEY ARE:
${profile?.display_name || 'Agunwa'} — ${profile?.role || 'brand designer and design engineer'}
Building: ${profile?.project_description || 'Squared, a productivity community'}
${profile?.unique_angle ? `Angle: ${profile.unique_angle}` : ''}
Topics: ${(profile?.content_topics || []).join(', ')}

${profile?.voice_examples?.length ? `THEIR ACTUAL WRITING — THIS IS THE ONLY STYLE GUIDE YOU NEED:
${(profile.voice_examples as string[]).slice(0, 2).map((e: string) => e.slice(0, 400)).join('\n\n---\n\n')}

Study these carefully. Notice:
- They open mid-thought, like they have been thinking about this for a while
- They build arguments like a lawyer — premise, evidence, implication
- Short lines land punches. Single sentences. Sometimes fragments.
- They repeat key words for emphasis when something matters
- They name specific things — never vague, always concrete
- They connect small observations to bigger truths
- Rhetorical questions that indict, not invite
- No conclusion paragraph — they make the point and stop
- They never moralize — the observation does the work
- Casual but controlled — never corporate, never preachy` : ''}

${voiceDNA ? `VOICE ANALYSIS:
${voiceDNA.style_summary}
${voiceDNA.sentence_patterns}
NEVER: ${voiceDNA.avoid}` : ''}

ABSOLUTE RULES — EVERY SINGLE ONE:
1. Zero hashtags. Not one. Ever.
2. Zero invented names. If their story has no names, write without names.
3. Never end with a question unless it genuinely fits — most posts should just stop
4. Never use: "I've been thinking", "I want to share", "Let me tell you",
   "In today's world", "At the end of the day", "It is what it is",
   "Game changer", "Leverage", "Synergy", "Touch base", "Circle back",
   "Dive in", "Unpack", "Brethren", "Folks"
5. Never repeat the same phrase more than twice in one post
6. Never write a conclusion paragraph — make the point, then stop
7. Never be preachy — observe, don't lecture
8. Never mention their project unless the idea is explicitly about it
9. Short paragraphs — 2 sentences maximum per paragraph
10. Key statements get their own line
11. Vary sentence length dramatically — short sentences hit harder
12. Sound like someone thinking out loud, not presenting
13. Specific always beats general — real numbers, real details, real moments`

  const clarificationContext = clarification ? `
WHAT THEY WANT TO SAY: ${clarification.mainPoint}
TONE: ${clarification.tone}
${clarification.story ? `STORY/EXPERIENCE TO USE:
${clarification.story}

This story is the backbone. Use it. Be specific.
Only use names that appear in this story.
If they mentioned numbers, amounts, places — use them exactly.` : ''}` : ''

  const userPrompt = `${platformRules[platform] || platformRules.facebook}

IDEA: ${idea}
WRITE MODE: ${writingMode}
${clarificationContext}

HOW TO APPROACH THIS:
- Don't start with "I" if you can avoid it
- Open in the middle of a thought or observation
- Build to the point — don't announce it
- Let the argument breathe in short paragraphs
- The ending is not a conclusion — it's the last thing worth saying

LENGTH: Write until the idea is fully expressed. Not a word more.
Facebook/LinkedIn: minimum 400 words. Twitter: 6-10 tweets.
Don't pad. Don't cut short. Stop when it's done.

GENERATE 2 VARIATIONS:
- Genuinely different — different opening, different structure
- Same core idea, different angle
- Not minor word changes — actually different approaches

CRITICAL — Return ONLY raw JSON, nothing else:
{"variation1": "full post text with \\n\\n between paragraphs", "variation2": "full post text with \\n\\n between paragraphs"}`

  async function generateWithDeepSeek(systemPrompt: string, userPrompt: string): Promise<string> {
    const deepseek = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY!,
    })
    const completion = await deepseek.chat.completions.create({
      model: 'deepseek-v4-pro',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.85,
      max_tokens: 1500,
      stream: false,
    })
    const content = completion.choices[0]?.message?.content
    if (!content) throw new Error('No content from DeepSeek')
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
    const cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    try {
      const parsed = JSON.parse(cleaned)
      return {
        v1: parsed.variation1 || parsed.variation_1 || '',
        v2: parsed.variation2 || parsed.variation_2 || ''
      }
    } catch {
      console.log('Direct parse failed, trying extraction')
    }

    const v1Match = cleaned.match(/"variation1"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"variation2"|"\s*\}$)/)
    const v2Match = cleaned.match(/"variation2"\s*:\s*"([\s\S]*?)(?:"\s*\}|"\s*$)/)

    if (v1Match) {
      return {
        v1: v1Match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
        v2: v2Match ? v2Match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : ''
      }
    }

    return { v1: cleaned, v2: '' }
  }

  function cleanText(text: string): string {
    return text
      .replace(/‘|’/g, "'")
      .replace(/“|”/g, '"')
      .replace(/–/g, '-')
      .replace(/—/g, '--')
      .replace(/\\n/g, '\n')
      .trim()
  }

  let rawContent: string
  let provider = 'deepseek'

  try {
    rawContent = await generateWithDeepSeek(systemPrompt, userPrompt)
  } catch (deepseekError) {
    console.warn('DeepSeek failed, falling back to Gemini:', deepseekError)
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

  const { v1, v2 } = parseVariations(rawContent)
  const variation1 = cleanText(v1)
  const variation2 = cleanText(v2)

  console.log('Parsed variation1 length:', variation1.length)
  console.log('Parsed variation2 length:', variation2.length)
  console.log('variation1 preview:', variation1.slice(0, 100))

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
