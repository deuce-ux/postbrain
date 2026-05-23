import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { examples } = await req.json()

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

  const generateWithDeepSeek = async (): Promise<string> => {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY!}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-pro',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    })
    if (!response.ok) throw new Error(`DeepSeek error: ${response.status}`)
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('No content from DeepSeek')
    return content
  }

  const generateWithGemini = async (): Promise<string> => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY!}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        }),
      }
    )
    if (!response.ok) throw new Error(`Gemini error: ${response.status}`)
    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!content) throw new Error('No content from Gemini')
    return content
  }

  try {
    let content: string
    try {
      content = await generateWithDeepSeek()
    } catch (deepseekError) {
      console.warn('DeepSeek failed, falling back to Gemini:', deepseekError)
      content = await generateWithGemini()
    }

    const clean = content.replace(/```json|```/g, '').trim()
    const analysis = JSON.parse(clean)
    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Analyze voice error:', error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
