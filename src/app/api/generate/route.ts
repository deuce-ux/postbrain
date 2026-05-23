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

  function buildProfileContext(profile: Record<string, unknown> | null): string {
    const styleDescriptions: Record<string, string> = {
      conversational: 'casual and conversational, like texting a friend',
      professional: 'professional but personal, LinkedIn-style',
      bold: 'bold and controversial, strong opinions and hot takes',
      educational: 'educational and helpful, teaching-focused',
    }

    const parts = [
      `Name: ${profile?.display_name || 'A creator'}`,
      `Role: ${profile?.role || 'Creator'}`,
      `Building: ${profile?.project_description || 'A project'}`,
      `Unique angle: ${profile?.unique_angle || 'Sharing my journey'}`,
      `Content focus: ${((profile?.content_topics as string[]) || []).join(', ') || 'Building in public'}`,
      `Writing style: ${styleDescriptions[(profile?.voice_style as string) || 'conversational']}`,
    ]

    return parts.join('\n')
  }

  const voiceContext = profile?.voice_examples?.length
    ? `\n\nMATCH THIS WRITING STYLE:\n${(profile.voice_examples as string[]).slice(0, 1).map((e: string) => e.slice(0, 250)).join('\n---\n')}`
    : ''

  const platformRules: Record<string, string> = {
    twitter: `For X Thread:
- Start with hook tweet (1-2 sentences max)
- Break into 5-8 tweets
- Each tweet = 1-3 sentences
- Use line breaks for emphasis
- End with summary or reflection
- NO hashtags`,

    linkedin: `For LinkedIn:
- Opening hook that stops the scroll
- Short paragraphs - 2-3 sentences each
- Single-line paragraphs for emphasis
- Like this.
- 400-600 words
- Professional but conversational
- NO hashtags`,

    instagram: `For Instagram:
- First 2 lines are the hook before "more"
- Short punchy paragraphs
- Line breaks for readability
- Casual friend-to-friend energy
- NO hashtags`,

    facebook: `For Facebook:
- 400-700 words
- Story-driven with setup/middle/end
- Personal and vulnerable
- Conversational like talking to friends
- Short paragraphs — 2-3 sentences max
- Key lines stand alone
- NO hashtags
- NOT a thread — flowing paragraphs`,
  }

  const systemPrompt = `You are a social media ghostwriter. Your writing:
- Sounds like a real person sharing their genuine experience
- Is ${(profile?.voice_style as string) || 'conversational'}
- Tells stories with specific details from THEIR actual project
- Has personality - not corporate, not preachy
- Stays focused on topics they care about: ${((profile?.content_topics as string[]) || []).join(', ')}

Key principles:
- Specific > Generic (use real details about their life and work)
- Story > Lecture (show, don't tell)
- Personal > Universal (make it clearly THEIR story)
- Stay on topic (don't mention things outside their focus areas)

AVOID:
- "I'm excited to share..."
- Generic advice that could apply to anyone
- Topics outside their stated content focus
- Hashtags — zero, none, ever
- Invented names — only use names from user's story
- Ending every post with a question — only when it genuinely fits
- "Brethren", "folks", "synergy", "leverage", "game-changer"
- Preachy conclusions`

  const clarificationContext = clarification ? `
USER'S IDEA DETAILS:
Topic: ${idea}
Main point: ${clarification.mainPoint}
Tone: ${clarification.tone}
${clarification.story ? `Specific example/story: ${clarification.story}` : ''}` : `Topic: ${idea}`

  const userPrompt = `Write a social media post.

${platformRules[platform] || platformRules.facebook}

User profile:
${buildProfileContext(profile)}
${voiceContext}

${clarificationContext}

Write mode: ${writingMode}

CRITICAL RULES:
1. Write in their voice - match vocabulary, rhythm, tone from samples
2. DO NOT force business/project mentions unless idea is explicitly about it
3. Be specific - numbers, names from their story, concrete details
4. Sound human - like texting a friend, not writing an essay
5. Keep their personality and quirks
6. Short paragraphs, varied sentence length
7. Key statements get their own line

Generate 2 genuinely different variations. Make them actually different.

Return ONLY valid JSON, no markdown, no backticks:
{"variation1": "post text with \\n\\n between paragraphs", "variation2": "post text with \\n\\n between paragraphs"}`

  async function generateWithDeepSeek(systemPrompt: string, userPrompt: string): Promise<string> {
    const deepseek = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY!,
    })
    // @ts-expect-error - thinking is a DeepSeek-specific param not in the OpenAI SDK types
    const completion = await deepseek.chat.completions.create({
      model: 'deepseek-v4-pro',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.85,
      max_tokens: 2000,
      stream: false,
      thinking: { type: 'disabled' },
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
    // Remove thinking tags that DeepSeek V4-Pro adds
    let cleaned = raw
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    // Find the JSON object - look for { "variation
    const jsonStart = cleaned.indexOf('{')
    const jsonEnd = cleaned.lastIndexOf('}')

    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleaned = cleaned.slice(jsonStart, jsonEnd + 1)
    }

    try {
      const parsed = JSON.parse(cleaned)
      return {
        v1: parsed.variation1 || parsed.variation_1 || '',
        v2: parsed.variation2 || parsed.variation_2 || ''
      }
    } catch {
      console.error('Parse failed on:', cleaned.slice(0, 200))

      // Manual extraction
      const v1Match = cleaned.match(/"variation1"\s*:\s*"([\s\S]*?)",\s*"variation2"/)
      const v2Match = cleaned.match(/"variation2"\s*:\s*"([\s\S]*?)"\s*\}/)

      return {
        v1: v1Match ? v1Match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : cleaned,
        v2: v2Match ? v2Match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : ''
      }
    }
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
