import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  console.log('[generate] user:', user?.id ?? null, 'authError:', authError?.message ?? null)
  if (!user) return NextResponse.json({ error: 'Unauthorized', detail: authError?.message ?? 'no session' }, { status: 401 })

  const { idea, platform, clarification } = await req.json()
  console.log('Received platform:', platform)

  // Fetch profile for voice DNA
  const { data: profile } = await supabase
    .from('profiles')
    .select('voice_style, voice_examples, voice_dna, display_name, role, project_description, content_topics, unique_angle')
    .eq('id', user.id)
    .single()

  const voiceContext = profile?.voice_examples?.length > 0
    ? `USER'S VOICE (match this writing style):\n${profile!.voice_examples.slice(0, 3).join('\n\n---\n\n')}`
    : ''

  const platformRules: Record<string, string> = {
    twitter: 'For X Thread: Start with hook tweet (1-2 sentences max), break into 5-8 tweets, each tweet = 1-3 sentences, use line breaks for emphasis, end with summary. NO hashtags.',
    linkedin: 'For LinkedIn: 1,300-2,000 characters, conversational not corporate, single-line paragraphs for emphasis, optional engagement question at end. NO hashtags.',
    instagram: 'For Instagram: Line breaks for readability, visual/emotional language, emojis only if fits voice, 2-3 sentence paragraphs, questions to drive comments. NO hashtags.',
    facebook: 'For Facebook: 500-1,000 words, story-driven with setup/middle/end, personal and vulnerable, conversational. NO hashtags.',
  }

  const systemPrompt = `You are helping write a social media post in the user's authentic voice.

${voiceContext}

USER'S IDEA:
Topic: ${idea}
Main point: ${clarification?.mainPoint || ''}
Tone: ${clarification?.tone || 'Honest/Vulnerable'}
${clarification?.story ? `Specific example: ${clarification.story}` : ''}

PLATFORM: ${platform}

CRITICAL RULES:
1. Write in their voice - match vocabulary, rhythm, tone from samples
2. DO NOT force business mentions unless idea is explicitly about it
3. Be specific - numbers, names, concrete details
4. Sound human - like texting a friend, not writing an essay
5. Keep their personality and quirks

${platformRules[platform] || platformRules.facebook}

Generate 2 genuinely different variations. Return ONLY valid JSON:
{
  "variation1": "full post text",
  "variation2": "full post text"
}`

  const userPrompt = 'Generate the post variations now.'

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
