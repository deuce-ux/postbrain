import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { idea, platform, voice, writingMode } = await req.json()

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
  }

  const systemPrompt = `You are a social media ghostwriter who writes in the user's exact voice.
Your writing:
- Sounds like a real person sharing their genuine experience
- Is ${voice?.style || 'conversational and direct'}
- Has personality — not corporate, not preachy
- Tells stories with specific details
- Stays focused and doesn't meander

AVOID:
- "I'm excited to share..."
- Generic advice
- Buzzwords
- Sounding like AI

${voice?.examples ? `MATCH THIS WRITING STYLE EXACTLY:\n${voice.examples}` : ''}`

  const userPrompt = `${platformInstructions[platform] || platformInstructions.twitter}

The idea/topic to write about:
"${idea}"

Write mode: ${writingMode || 'from idea'}

Write the complete post now. Return only the post content, no explanation.`

  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY!
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [{
          parts: [{ text: userPrompt }],
        }],
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 2048,
        },
      }),
    })

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!content) throw new Error('No content generated')

    await supabase.from('generated_posts').insert({
      user_id: user.id,
      original_idea: idea,
      generated_text: content,
      platform,
      status: 'draft',
    })

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json({ error: 'Failed to generate' }, { status: 500 })
  }
}
