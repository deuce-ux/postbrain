import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { posts } = await req.json()

  if (!posts || !Array.isArray(posts) || posts.length === 0) {
    return NextResponse.json({ error: 'No posts found' }, { status: 400 })
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY!

  const recentPosts = posts.slice(0, 30)
  const postsText = recentPosts.join('\n---\n')

  const prompt = `You are analyzing ${recentPosts.length} real social media posts written by one person.
Your job is to deeply understand their unique writing voice.

POSTS:
${postsText}

Analyze thoroughly and return a JSON object with these exact fields:
{
  "style_summary": "3-4 sentence description of their writing voice and personality",
  "sentence_patterns": "how they structure sentences - length, rhythm, fragments vs complete",
  "tone": "the emotional tone - e.g. reflective, motivational, humorous, direct",
  "signature_phrases": ["phrase1", "phrase2", "phrase3", "phrase4"],
  "topics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "avoid": "what to never do when writing like them",
  "opening_style": "how they typically start posts",
  "closing_style": "how they typically end posts",
  "unique_traits": ["trait1", "trait2", "trait3"]
}

Return only valid JSON, no explanation, no markdown backticks.`

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    })

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    const clean = content.replace(/```json|```/g, '').trim()
    const analysis = JSON.parse(clean)

    await supabase
      .from('profiles')
      .update({
        voice_dna: analysis,
        voice_examples: recentPosts.slice(0, 10),
        voice_setup_complete: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    return NextResponse.json({
      analysis,
      postsAnalyzed: recentPosts.length,
      success: true,
    })
  } catch (error) {
    console.error('Facebook import error:', error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
