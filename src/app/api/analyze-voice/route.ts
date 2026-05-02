import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { examples } = await req.json()

  const GROQ_API_KEY = process.env.GROQ_API_KEY!

  const prompt = `Analyze these social media posts and extract the author's unique writing voice.

POSTS:
${examples.join('\n---\n')}

Return a JSON object with these exact fields:
{
  "style_summary": "2-3 sentence description of their writing style",
  "sentence_patterns": "how they structure sentences",
  "tone": "the emotional tone they use",
  "signature_phrases": ["phrase1", "phrase2"],
  "topics": ["topic1", "topic2", "topic3"],
  "avoid": "what to avoid when writing like them"
}

Return only the JSON, no explanation.`

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    })

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    const clean = content.replace(/```json|```/g, '').trim()
    const analysis = JSON.parse(clean)

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Analyze voice error:', error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
